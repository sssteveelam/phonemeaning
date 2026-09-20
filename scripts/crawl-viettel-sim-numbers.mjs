#!/usr/bin/env node
/* eslint-env node */

/**
 * Download SIM numbers from Viettel's public SIM-search API.
 *
 * This is intentionally a standalone script. It does not import or modify
 * anything under src/, and it uses only Node.js built-ins (Node 18+).
 *
 * The page currently calls this endpoint:
 *   POST https://apigami.viettel.vn/mvt-api/myviettel.php/omiSearchSimV2
 * with the search parameters in the URL query string.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

const SOURCE_PAGE_URL = "https://vietteltelecom.vn/vx/di-dong/sim-so/#";
const API_URL = "https://apigami.viettel.vn/mvt-api/myviettel.php/omiSearchSimV2";

const PLAN_CONFIG = {
  pre: { apiType: 2, priceField: "pre_price", label: "trả trước" },
  post: { apiType: 22, priceField: "pos_price", label: "trả sau" },
};

const DEFAULT_OPTIONS = {
  pattern: "0989*",
  plan: "pre",
  pages: 1,
  passes: 1,
  pageSize: 45,
  delayMs: 3500,
  retries: 4,
  max: 0,
  format: "sample",
  groupSize: 15,
  output: null,
  sourceUrl: SOURCE_PAGE_URL,
};

function usage() {
  return `
Thu thập số SIM Viettel và xuất TXT/CSV đơn giản.

Chạy:
  node scripts/crawl-viettel-sim-numbers.mjs [options]

Tùy chọn:
  --prefix <digits>       Tiền tố; tự thêm * (mặc định: 0989)
  --pattern <pattern>     Mẫu Viettel, ví dụ 0989*, 098*888, *888
  --plan <pre|post>       Giá trả trước hoặc trả sau (mặc định: pre)
  --pages <n>             Số trang thử cho mỗi lượt (mặc định: 1)
  --passes <n>            Số lượt gọi lại để gom thêm thứ tự/số khác (mặc định: 1)
  --page-size <n>         Kích thước trang API, 1–100 (mặc định: 45)
  --max <n>               Dừng khi đủ n số; 0 = không giới hạn
  --delay-ms <n>          Khoảng nghỉ giữa các request (mặc định: 3500)
  --retries <n>           Số lần retry khi bị giới hạn tốc độ (mặc định: 4)
  --format <sample|phones> sample giống file mẫu; phones = mỗi số một dòng
  --group-size <n>        Số dòng mỗi nhóm ở format sample (mặc định: 15)
  --output <file>         File UTF-8; dùng - để ghi ra stdout
  --source-url <url>      URL trang dùng làm Referer (mặc định là trang Viettel)
  -h, --help              Hiển thị trợ giúp

Ví dụ:
  node scripts/crawl-viettel-sim-numbers.mjs --prefix 0989 --output .\\viettel-0989.txt
  node scripts/crawl-viettel-sim-numbers.mjs --pattern 098* --passes 3 --max 100 --format phones
`.trim();
}

function fail(message) {
  throw new Error(message);
}

function parsePositiveInteger(value, name, { allowZero = false, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!/^\d+$/.test(value)) {
    fail(`${name} phải là số nguyên không âm: ${value}`);
  }

  const parsed = Number(value);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > max) {
    fail(`${name} nằm ngoài khoảng cho phép: ${value}`);
  }
  return parsed;
}

function parseOptionValue(argv, index, name, inlineValue) {
  if (inlineValue !== undefined) {
    if (inlineValue === "") fail(`${name} cần một giá trị.`);
    return { value: inlineValue, nextIndex: index };
  }
  if (index + 1 >= argv.length || (argv[index + 1].startsWith("-") && argv[index + 1] !== "-")) {
    fail(`${name} cần một giá trị.`);
  }
  return { value: argv[index + 1], nextIndex: index + 1 };
}

function normalizePrefix(value) {
  const digits = value.replace(/[ .()-]/g, "");
  if (!/^\d{2,10}$/.test(digits)) {
    fail(`--prefix chỉ nhận 2–10 chữ số: ${value}`);
  }
  return `${digits}*`;
}

function normalizePattern(value) {
  const pattern = value.replace(/[ .()-]/g, "");
  if (!/^[0-9*]{1,20}$/.test(pattern) || !/\d/.test(pattern)) {
    fail(`--pattern chỉ nhận chữ số và dấu *: ${value}`);
  }
  return pattern;
}

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS };
  let patternWasSet = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") {
      options.help = true;
      continue;
    }

    const equalsIndex = argument.indexOf("=");
    const name = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);

    if (name === "--prefix") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      options.pattern = normalizePrefix(parsed.value);
      patternWasSet = true;
      index = parsed.nextIndex;
    } else if (name === "--pattern") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      options.pattern = normalizePattern(parsed.value);
      patternWasSet = true;
      index = parsed.nextIndex;
    } else if (name === "--plan") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      if (!(parsed.value in PLAN_CONFIG)) {
        fail(`--plan phải là pre hoặc post: ${parsed.value}`);
      }
      options.plan = parsed.value;
      index = parsed.nextIndex;
    } else if (name === "--pages") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      options.pages = parsePositiveInteger(parsed.value, name, { max: 1000 });
      index = parsed.nextIndex;
    } else if (name === "--passes") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      options.passes = parsePositiveInteger(parsed.value, name, { max: 1000 });
      index = parsed.nextIndex;
    } else if (name === "--page-size") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      options.pageSize = parsePositiveInteger(parsed.value, name, { max: 100 });
      index = parsed.nextIndex;
    } else if (name === "--max") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      options.max = parsePositiveInteger(parsed.value, name, { allowZero: true });
      index = parsed.nextIndex;
    } else if (name === "--delay-ms") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      options.delayMs = parsePositiveInteger(parsed.value, name, { allowZero: true, max: 3600000 });
      index = parsed.nextIndex;
    } else if (name === "--retries") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      options.retries = parsePositiveInteger(parsed.value, name, { allowZero: true, max: 20 });
      index = parsed.nextIndex;
    } else if (name === "--format") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      if (parsed.value !== "sample" && parsed.value !== "phones") {
        fail(`--format phải là sample hoặc phones: ${parsed.value}`);
      }
      options.format = parsed.value;
      index = parsed.nextIndex;
    } else if (name === "--group-size") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      options.groupSize = parsePositiveInteger(parsed.value, name, { max: 1000 });
      index = parsed.nextIndex;
    } else if (name === "--output") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      options.output = parsed.value;
      index = parsed.nextIndex;
    } else if (name === "--source-url") {
      const parsed = parseOptionValue(argv, index, name, inlineValue);
      try {
        const sourceUrl = new URL(parsed.value);
        sourceUrl.hash = "";
        options.sourceUrl = sourceUrl.toString();
      } catch {
        fail(`--source-url không hợp lệ: ${parsed.value}`);
      }
      index = parsed.nextIndex;
    } else {
      fail(`Không nhận ra tùy chọn: ${argument}`);
    }
  }

  if (!patternWasSet) options.pattern = DEFAULT_OPTIONS.pattern;
  if (options.format === "phones") options.groupSize = 0;
  return options;
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function patternRegExp(pattern) {
  const source = pattern
    .split("*")
    .map(escapeRegExp)
    .join(".*");
  return new RegExp(`^${source}$`);
}

function normalizePhone(value) {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  return null;
}

function groupPhone(phone) {
  if (phone.length !== 10) return phone;
  return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return `${normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

function isRateLimited(status, payload, rawText) {
  const message = String(payload?.message ?? rawText ?? "");
  return status === 429
    || status === 503
    || /thao\s*t[aá]c\s*qu[aá]\s*nhanh|too\s*fast|rate\s*limit/i.test(message);
}

function isChallengeHtml(contentType, rawText) {
  return !contentType.toLowerCase().includes("json")
    && /<html|document\.cookie|cloudrity|challenge-platform/i.test(rawText);
}

function makeQuery(options, page) {
  const plan = PLAN_CONFIG[options.plan];
  return new URLSearchParams({
    lang: "vi",
    appCode: "WEBPORTAL",
    isdn_type: String(plan.apiType),
    page_type: "",
    page: String(page),
    page_size: String(options.pageSize),
    key_search: options.pattern,
    total_record: "1",
    captcha: "",
    sid: "",
  });
}

async function requestPage(options, page, state) {
  const waitMs = Math.max(0, options.delayMs - (Date.now() - state.lastRequestAt));
  if (waitMs > 0) await sleep(waitMs);

  const url = new URL(API_URL);
  url.search = makeQuery(options, page).toString();
  state.lastRequestAt = Date.now();

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        Origin: new URL(options.sourceUrl).origin,
        Referer: options.sourceUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      },
    });
  } catch (error) {
    throw new Error(`Không thể gọi API Viettel: ${error.message}`);
  }

  const rawText = await response.text();
  let payload;
  try {
    payload = JSON.parse(rawText);
  } catch {
    if (isChallengeHtml(response.headers.get("content-type") ?? "", rawText)) {
      throw new Error(
        "API/trang Viettel trả thử thách Cloudrity thay vì JSON. Hãy mở trang bằng trình duyệt hoặc thử lại sau; script không bypass thử thách.",
      );
    }
    throw new Error(`API Viettel trả dữ liệu không phải JSON (HTTP ${response.status}).`);
  }

  if (isRateLimited(response.status, payload, rawText)) {
    return { rateLimited: true, message: String(payload.message ?? "API giới hạn tốc độ") };
  }
  if (!response.ok) {
    throw new Error(`API Viettel lỗi HTTP ${response.status}: ${payload.message ?? "không có thông báo"}`);
  }
  if (Number(payload.errorCode) !== 0) {
    throw new Error(`API Viettel từ chối truy vấn: ${payload.message ?? `errorCode=${payload.errorCode}`}`);
  }
  if (Number(payload.request_captcha) > 0) {
    throw new Error("API Viettel yêu cầu CAPTCHA; script dừng và không tự động vượt CAPTCHA.");
  }

  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    totalItems: Number(payload.totalItems) || 0,
  };
}

async function requestPageWithRetry(options, page, state) {
  let lastRateLimitMessage = "";
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    const result = await requestPage(options, page, state);
    if (!result.rateLimited) return result;

    lastRateLimitMessage = result.message;
    if (attempt === options.retries) break;

    const backoffMs = Math.max(options.delayMs, 3000) * (attempt + 1);
    process.stderr.write(
      `API giới hạn tốc độ (${lastRateLimitMessage}); chờ ${backoffMs} ms rồi thử lại...\n`,
    );
    await sleep(backoffMs);
  }

  throw new Error(`Không lấy được dữ liệu sau ${options.retries} lần retry: ${lastRateLimitMessage}`);
}

function mergeRecord(existing, incoming) {
  if (!existing) return { ...incoming };
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== null && value !== undefined && value !== "") existing[key] = value;
  }
  return existing;
}

async function collectRecords(options) {
  const regex = patternRegExp(options.pattern);
  const records = new Map();
  const state = { lastRequestAt: 0 };
  let stop = false;

  for (let pass = 1; pass <= options.passes && !stop; pass += 1) {
    for (let page = 1; page <= options.pages && !stop; page += 1) {
      const result = await requestPageWithRetry(options, page, state);
      const pageData = result.data;

      for (const item of pageData) {
        const phone = normalizePhone(item?.isdn);
        if (!phone || !regex.test(phone)) continue;
        records.set(phone, mergeRecord(records.get(phone), { ...item, phone }));
        if (options.max > 0 && records.size >= options.max) {
          stop = true;
          break;
        }
      }

      // totalItems is often 0 even when data exists, so only use page length.
      if (pageData.length === 0 || pageData.length < options.pageSize) break;
    }

    if (options.passes > 1 && !stop && pass < options.passes) {
      process.stderr.write(`Đã hoàn tất lượt ${pass}/${options.passes}; tiếp tục gom số khác...\n`);
    }
  }

  return [...records.values()];
}

function renderRecords(records, options) {
  const priceField = PLAN_CONFIG[options.plan].priceField;
  if (options.format === "phones") {
    return `${records.map((record) => record.phone).join("\r\n")}\r\n`;
  }

  const lines = [];
  for (let offset = 0; offset < records.length; offset += options.groupSize) {
    if (offset > 0) lines.push("");
    lines.push("Stt\tSim số\tGiá sim\t");
    const group = records.slice(offset, offset + options.groupSize);
    group.forEach((record, index) => {
      lines.push(
        `${index + 1}\t${groupPhone(record.phone)}\t${formatPrice(record[priceField])}\t`,
      );
    });
  }
  return `${lines.join("\r\n")}\r\n`;
}

function defaultOutputPath(options) {
  const slug = options.pattern.replace(/\*/g, "").replace(/\W+/g, "_") || "sim";
  return path.resolve(process.cwd(), `viettel-sim-${slug}.txt`);
}

function writeOutput(content, outputPath) {
  if (outputPath === "-") {
    process.stdout.write(content);
    return;
  }

  const absolutePath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, { encoding: "utf8" });
  process.stdout.write(`Đã ghi file UTF-8: ${absolutePath}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const records = await collectRecords(options);
  if (records.length === 0) {
    fail(`Không tìm thấy số hợp lệ cho mẫu "${options.pattern}".`);
  }

  const content = renderRecords(records, options);
  const outputPath = options.output ?? defaultOutputPath(options);
  writeOutput(content, outputPath);
  process.stderr.write(
    `Đã thu được ${records.length} số (${options.plan === "pre" ? "trả trước" : "trả sau"}, mẫu ${options.pattern}).\n`,
  );
}

try {
  await main();
} catch (error) {
  process.stderr.write(`Lỗi: ${error.message}\n\n${usage()}\n`);
  process.exitCode = 1;
}
