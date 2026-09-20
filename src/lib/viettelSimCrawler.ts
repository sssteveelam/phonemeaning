export const VIETTEL_SIM_PAGE_URL = "https://vietteltelecom.vn/vx/di-dong/sim-so/";
const VIETTEL_SIM_API_URL = "https://apigami.viettel.vn/mvt-api/myviettel.php/omiSearchSimV2";

export type ViettelPlan = "pre" | "post";

export interface ViettelSimRecord {
  phone: string;
  plan: ViettelPlan;
  price: number | null;
  priceLabel: string;
  pledgeTime: string | null;
  pledgeAmount: number | null;
}

export interface ViettelSearchOptions {
  pattern: string;
  plan: ViettelPlan;
  pages?: number;
  passes?: number;
  pageSize?: number;
  max?: number;
  delayMs?: number;
  retries?: number;
}

interface UpstreamSimRecord {
  isdn?: string | number | null;
  pre_price?: string | number | null;
  pos_price?: string | number | null;
  pledge_time?: string | number | null;
  pledge_amount?: string | number | null;
}

interface UpstreamResponse {
  errorCode?: number | string;
  message?: string;
  data?: UpstreamSimRecord[] | null;
  request_captcha?: number | string;
}

interface RequestState {
  lastRequestAt: number;
}

const PLAN_CONFIG: Record<ViettelPlan, { apiType: number; priceField: "pre_price" | "pos_price" }> = {
  pre: { apiType: 2, priceField: "pre_price" },
  post: { apiType: 22, priceField: "pos_price" }
};

const DEFAULT_OPTIONS: Required<Omit<ViettelSearchOptions, "pattern" | "plan">> = {
  pages: 1,
  passes: 1,
  pageSize: 45,
  max: 45,
  delayMs: 3500,
  retries: 4
};

export class ViettelCrawlerError extends Error {
  status: number;
  code: "rate_limited" | "captcha" | "challenge" | "upstream" | "network" | "invalid";

  constructor(
    message: string,
    code: ViettelCrawlerError["code"],
    status = 502
  ) {
    super(message);
    this.name = "ViettelCrawlerError";
    this.code = code;
    this.status = status;
  }
}

export function normalizeViettelPattern(value: string): string {
  const pattern = value.replace(/[ .()-]/g, "");
  if (!/^[0-9*]{1,20}$/.test(pattern) || !/\d/.test(pattern)) {
    throw new ViettelCrawlerError(
      "Mẫu tìm SIM chỉ được chứa chữ số và dấu *.",
      "invalid",
      400
    );
  }
  return pattern;
}

export function normalizeViettelPhone(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  return null;
}

export function formatViettelPrice(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return `${normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

function patternRegExp(pattern: string): RegExp {
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}$`);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCurrencyNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRateLimited(status: number, payload: UpstreamResponse | null, rawText: string): boolean {
  const message = String(payload?.message ?? rawText);
  return status === 429
    || status === 503
    || /thao\s*t[aá]c\s*qu[aá]\s*nhanh|too\s*fast|rate\s*limit/i.test(message);
}

function isChallengeHtml(contentType: string, rawText: string): boolean {
  return !contentType.toLowerCase().includes("json")
    && /<html|document\.cookie|cloudrity|cloudflare|cf-chl-|challenge-platform/i.test(rawText);
}

function makeQuery(options: Required<ViettelSearchOptions>, page: number): URLSearchParams {
  return new URLSearchParams({
    lang: "vi",
    appCode: "WEBPORTAL",
    isdn_type: String(PLAN_CONFIG[options.plan].apiType),
    page_type: "",
    page: String(page),
    page_size: String(options.pageSize),
    key_search: options.pattern,
    total_record: "1",
    captcha: "",
    sid: ""
  });
}

function resolveOptions(input: ViettelSearchOptions): Required<ViettelSearchOptions> {
  const pattern = normalizeViettelPattern(input.pattern);
  const plan = input.plan;
  if (plan !== "pre" && plan !== "post") {
    throw new ViettelCrawlerError("Gói SIM phải là pre hoặc post.", "invalid", 400);
  }

  const options = {
    ...DEFAULT_OPTIONS,
    ...input,
    pattern,
    plan
  };

  if (options.pages < 1 || options.pages > 5
    || options.passes < 1 || options.passes > 5
    || options.pageSize < 1 || options.pageSize > 45
    || options.max < 1 || options.max > 200
    || options.delayMs < 2500 || options.delayMs > 60000
    || options.retries < 0 || options.retries > 5) {
    throw new ViettelCrawlerError("Tham số tìm SIM nằm ngoài giới hạn cho phép.", "invalid", 400);
  }

  return options;
}

async function requestPage(
  options: Required<ViettelSearchOptions>,
  page: number,
  state: RequestState
): Promise<UpstreamSimRecord[]> {
  const waitMs = Math.max(0, options.delayMs - (Date.now() - state.lastRequestAt));
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));

  const url = new URL(VIETTEL_SIM_API_URL);
  url.search = makeQuery(options, page).toString();
  state.lastRequestAt = Date.now();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        Origin: new URL(VIETTEL_SIM_PAGE_URL).origin,
        Referer: VIETTEL_SIM_PAGE_URL,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"
      },
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    throw new ViettelCrawlerError(
      `Không thể kết nối API Viettel: ${error instanceof Error ? error.message : "lỗi không xác định"}`,
      "network",
      503
    );
  }

  const rawText = await response.text();
  let payload: UpstreamResponse;
  try {
    payload = JSON.parse(rawText) as UpstreamResponse;
  } catch {
    if (isChallengeHtml(response.headers.get("content-type") ?? "", rawText)) {
      throw new ViettelCrawlerError(
        "Viettel đang yêu cầu thử thách Cloudrity; hãy thử lại sau.",
        "challenge",
        503
      );
    }
    throw new ViettelCrawlerError(
      `API Viettel trả dữ liệu không hợp lệ (HTTP ${response.status}).`,
      "upstream",
      502
    );
  }

  if (Number(payload.request_captcha) > 0) {
    throw new ViettelCrawlerError(
      "API Viettel yêu cầu CAPTCHA; ứng dụng không tự động vượt CAPTCHA.",
      "captcha",
      503
    );
  }
  if (isRateLimited(response.status, payload, rawText)) {
    throw new ViettelCrawlerError(
      "Viettel đang giới hạn tần suất truy vấn; hệ thống sẽ tự thử lại.",
      "rate_limited",
      429
    );
  }
  if (!response.ok) {
    throw new ViettelCrawlerError(
      `API Viettel lỗi HTTP ${response.status}.`,
      "upstream",
      502
    );
  }
  if (Number(payload.errorCode) !== 0) {
    throw new ViettelCrawlerError(
      payload.message || "API Viettel từ chối truy vấn.",
      "upstream",
      502
    );
  }
  return Array.isArray(payload.data) ? payload.data : [];
}

async function requestPageWithRetry(
  options: Required<ViettelSearchOptions>,
  page: number,
  state: RequestState
): Promise<UpstreamSimRecord[]> {
  let lastError: ViettelCrawlerError | null = null;

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      return await requestPage(options, page, state);
    } catch (error) {
      if (!(error instanceof ViettelCrawlerError)
        || (error.code !== "rate_limited" && error.code !== "network")) throw error;
      lastError = error;
      if (attempt === options.retries) break;
      const waitMs = error.code === "rate_limited"
        ? Math.max(options.delayMs, 3000) * (attempt + 1)
        : 1000 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError ?? new ViettelCrawlerError("Không lấy được dữ liệu Viettel.", "upstream", 502);
}

function toRecord(
  item: UpstreamSimRecord,
  plan: ViettelPlan,
  regex: RegExp
): ViettelSimRecord | null {
  const phone = normalizeViettelPhone(item.isdn);
  if (!phone || !regex.test(phone)) return null;

  const priceValue = toCurrencyNumber(item[PLAN_CONFIG[plan].priceField]);
  return {
    phone,
    plan,
    price: priceValue,
    priceLabel: formatViettelPrice(priceValue),
    pledgeTime: item.pledge_time === null || item.pledge_time === undefined
      ? null
      : String(item.pledge_time),
    pledgeAmount: toNullableNumber(item.pledge_amount)
  };
}

export async function searchViettelSims(input: ViettelSearchOptions): Promise<ViettelSimRecord[]> {
  const options = resolveOptions(input);
  const regex = patternRegExp(options.pattern);
  const records = new Map<string, ViettelSimRecord>();
  const state: RequestState = { lastRequestAt: 0 };

  for (let pass = 1; pass <= options.passes && records.size < options.max; pass += 1) {
    for (let page = 1; page <= options.pages && records.size < options.max; page += 1) {
      const pageData = await requestPageWithRetry(options, page, state);
      for (const item of pageData) {
        const record = toRecord(item, options.plan, regex);
        if (record) records.set(record.phone, record);
        if (records.size >= options.max) break;
      }
      if (pageData.length === 0 || pageData.length < options.pageSize) break;
    }
  }

  return [...records.values()].slice(0, options.max);
}
