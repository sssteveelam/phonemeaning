import { describe, expect, it } from "vitest";
import { analyzePhoneNumber } from "@/lib/phoneAnalysisEngine";

describe("phoneAnalysisEngine", () => {
  it("tách cặp sliding window và nhận diện lặp liên tiếp", () => {
    const result = analyzePhoneNumber("0366664670");
    expect(result.pairs.map((pair) => pair.pair)).toEqual(["03", "36", "66", "66", "66", "64", "46", "67", "70"]);
    expect(result.digitSum).toBe(44);
    expect(result.totalMeaning).toBe("Lãng mạn");
    expect(result.repeatedPairs).toEqual([{ pair: "66", count: 3, consecutive: true, indexes: [2, 3, 4] }]);
  });

  it("tra cứu đúng tổng 48", () => {
    const result = analyzePhoneNumber("0984612963");
    expect(result.pairs.map((pair) => pair.pair)).toEqual(["09", "98", "84", "46", "61", "12", "29", "96", "63"]);
    expect(result.digitSum).toBe(48);
    expect(result.totalMeaning).toBe("Được nhận tiền từ người mình thương");
  });

  it("áp dụng quy tắc 00 để phủ định cặp trước đó", () => {
    const result = analyzePhoneNumber("0372036001");
    expect(result.pairs.map((pair) => pair.pair)).toEqual(["03", "37", "72", "20", "03", "36", "60", "00", "01"]);
    expect(result.pairs[6].isNegatedBy00).toBe(true);
    expect(result.negatedPairs).toEqual(["60"]);
    expect(result.pairs[7].meaning).toContain("Không có ý nghĩa độc lập");
  });
});
