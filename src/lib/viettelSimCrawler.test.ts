import { describe, expect, it } from "vitest";
import {
  formatViettelPrice,
  normalizeViettelPattern,
  normalizeViettelPhone
} from "@/lib/viettelSimCrawler";

describe("viettelSimCrawler helpers", () => {
  it("chuẩn hóa ISDN 9 chữ số thành số điện thoại 10 chữ số", () => {
    expect(normalizeViettelPhone("989602073")).toBe("0989602073");
    expect(normalizeViettelPhone("0989602073")).toBe("0989602073");
    expect(normalizeViettelPhone("abc")).toBeNull();
  });

  it("giữ đúng giá Viettel kể cả chuỗi có dấu phân cách", () => {
    expect(formatViettelPrice("50000")).toBe("50.000đ");
    expect(formatViettelPrice("50.000")).toBe("50.000đ");
    expect(formatViettelPrice(null)).toBe("");
  });

  it("chấp nhận mẫu wildcard có chữ số và từ chối mẫu rỗng", () => {
    expect(normalizeViettelPattern("0989*")).toBe("0989*");
    expect(normalizeViettelPattern("098 9*")).toBe("0989*");
    expect(() => normalizeViettelPattern("*")).toThrow();
    expect(() => normalizeViettelPattern("0989abc")).toThrow();
  });
});
