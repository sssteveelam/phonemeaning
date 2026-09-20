import { NextResponse } from "next/server";
import {
  searchViettelSims,
  ViettelCrawlerError,
  normalizeViettelPattern,
  type ViettelPlan
} from "@/lib/viettelSimCrawler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchBody {
  pattern?: unknown;
  prefix?: unknown;
  plan?: unknown;
  max?: unknown;
  pages?: unknown;
  passes?: unknown;
}

interface CacheEntry {
  items: Awaited<ReturnType<typeof searchViettelSims>>;
  fetchedAt: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 45_000;
const resultCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CacheEntry>>();

function integerOrDefault(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}

function errorResponse(error: unknown, staleEntry?: CacheEntry) {
  const canUseStale = error instanceof ViettelCrawlerError
    && ["rate_limited", "network", "challenge", "captcha"].includes(error.code);
  if (canUseStale && staleEntry && staleEntry.items.length > 0) {
    return NextResponse.json(
      {
        items: staleEntry.items,
        stale: true,
        warning: "Viettel đang tạm giới hạn truy vấn; đang dùng kết quả gần nhất.",
        fetchedAt: staleEntry.fetchedAt
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (error instanceof ViettelCrawlerError) {
    const retryAfter = error.code === "rate_limited" || error.code === "network" ? "10" : "30";
    return NextResponse.json(
      { error: error.message, code: error.code },
      {
        status: error.status,
        headers: { "Cache-Control": "no-store", "Retry-After": retryAfter }
      }
    );
  }

  return NextResponse.json(
    { error: "Không thể lấy danh sách SIM Viettel lúc này.", code: "unknown" },
    { status: 502, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  let body: SearchBody;
  try {
    body = await request.json() as SearchBody;
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu truy vấn không hợp lệ.", code: "invalid" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Dữ liệu truy vấn không hợp lệ.", code: "invalid" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rawPattern = typeof body.pattern === "string"
    ? body.pattern
    : typeof body.prefix === "string"
      ? `${body.prefix}*`
      : "0989*";

  try {
    const pattern = normalizeViettelPattern(rawPattern);
    if (body.plan !== undefined && body.plan !== "pre" && body.plan !== "post") {
      throw new ViettelCrawlerError("Gói SIM phải là pre hoặc post.", "invalid", 400);
    }
    const plan = body.plan === "post" ? "post" : "pre";
    const max = integerOrDefault(body.max, 45);
    const passes = integerOrDefault(body.passes, 1);
    const cacheKey = `${pattern}|${plan}|${max}|${passes}`;
    const cached = resultCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(
        { items: cached.items, pattern, plan, cached: true, fetchedAt: cached.fetchedAt },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    let request = inFlight.get(cacheKey);
    if (!request) {
      request = searchViettelSims({
        pattern,
        plan: plan as ViettelPlan,
        max,
        pages: Math.min(integerOrDefault(body.pages, 1), 2),
        passes: Math.min(passes, 3),
        pageSize: 45,
        delayMs: 3500,
        retries: 2
      }).then((items) => {
        const entry: CacheEntry = {
          items,
          fetchedAt: new Date().toISOString(),
          expiresAt: Date.now() + CACHE_TTL_MS
        };
        resultCache.set(cacheKey, entry);
        return entry;
      }).finally(() => {
        inFlight.delete(cacheKey);
      });
      inFlight.set(cacheKey, request);
    }

    const entry = await request;

    return NextResponse.json(
      {
        items: entry.items,
        pattern,
        plan,
        fetchedAt: entry.fetchedAt
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const pattern = typeof body.pattern === "string"
      ? body.pattern
      : typeof body.prefix === "string"
        ? `${body.prefix}*`
        : "0989*";
    const plan = body.plan === "post" ? "post" : "pre";
    const cacheKey = `${pattern}|${plan}|${integerOrDefault(body.max, 45)}|${integerOrDefault(body.passes, 1)}`;
    return errorResponse(error, resultCache.get(cacheKey));
  }
}
