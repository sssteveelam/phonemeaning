import { phoneMeanings } from "@/data/phoneMeanings";
import type { PhoneAnalysis, PhonePair, RepeatedPair } from "@/types/phone";
import { calculateScore, pairSentiment } from "@/lib/scoringEngine";

export const normalizePhoneNumber = (value: string): string => value.replace(/[\s().-]/g, "");

export const validatePhoneNumber = (value: string): { valid: boolean; phone: string; error?: string } => {
  const phone = normalizePhoneNumber(value);
  if (!phone) return { valid: false, phone, error: "Vui lòng nhập số điện thoại." };
  if (!/^\d+$/.test(phone)) return { valid: false, phone, error: "Số chỉ được chứa chữ số và các dấu cách, ., -, (, )." };
  if (phone.length < 3 || phone.length > 20) return { valid: false, phone, error: "Độ dài số điện thoại nên từ 3 đến 20 chữ số." };
  return { valid: true, phone };
};

const findRepeatedPairs = (pairs: string[]): RepeatedPair[] => {
  const indexesByPair = new Map<string, number[]>();
  pairs.forEach((pair, index) => indexesByPair.set(pair, [...(indexesByPair.get(pair) ?? []), index]));
  return [...indexesByPair.entries()]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([pair, indexes]) => ({
      pair,
      count: indexes.length,
      consecutive: indexes.some((index, i) => i > 0 && indexes[i - 1] === index - 1),
      indexes
    }));
};

export function analyzePhoneNumber(input: string): PhoneAnalysis {
  const validation = validatePhoneNumber(input);
  if (!validation.valid) {
    return {
      phoneNumber: validation.phone,
      pairs: [],
      digitSum: 0,
      repeatedPairs: [],
      negatedPairs: [],
      score: 0,
      rating: "Không hợp lệ",
      positiveCount: 0,
      negativeCount: 0,
      strengths: [],
      warnings: [],
      valid: false,
      error: validation.error
    };
  }

  const phone = validation.phone;
  const pairStrings = Array.from({ length: Math.max(0, phone.length - 1) }, (_, index) => phone.slice(index, index + 2));
  const repeatedPairs = findRepeatedPairs(pairStrings);
  const repeatedLookup = new Map(repeatedPairs.map((item) => [item.pair, item]));
  const zeroIndexes = pairStrings.reduce<number[]>((all, pair, index) => pair === "00" ? [...all, index] : all, []);
  const negatedIndexes = new Set(zeroIndexes.filter((index) => index > 0).map((index) => index - 1));
  const pairDetails: PhonePair[] = pairStrings.map((pair, index) => {
    const sentiment = pair === "00" ? { sentiment: "neutral" as const, weight: 0 } : pairSentiment(pair);
    const repeated = repeatedLookup.get(pair);
    return {
      pair,
      meaning: pair === "00" ? "Không có ý nghĩa độc lập; phủ định cặp đứng trước." : (phoneMeanings[pair] ?? "Không có dữ liệu trong bảng."),
      index,
      isRepeated: Boolean(repeated),
      isConsecutiveRepeat: Boolean(repeated?.consecutive),
      isNegatedBy00: negatedIndexes.has(index),
      sentiment: sentiment.sentiment,
      weight: sentiment.weight
    };
  });
  const digitSum = [...phone].reduce((sum, digit) => sum + Number(digit), 0);
  const totalKey = digitSum >= 1 && digitSum <= 99 ? String(digitSum).padStart(2, "0") : undefined;
  const score = calculateScore(pairDetails, totalKey, repeatedPairs.length, negatedIndexes.size);
  return {
    phoneNumber: phone,
    pairs: pairDetails,
    digitSum,
    totalMeaning: totalKey ? phoneMeanings[totalKey] : undefined,
    repeatedPairs,
    negatedPairs: [...negatedIndexes].map((index) => pairStrings[index]),
    ...score,
    positiveCount: pairDetails.filter((pair) => pair.sentiment === "positive" && !pair.isNegatedBy00).length,
    negativeCount: pairDetails.filter((pair) => pair.sentiment === "negative" && !pair.isNegatedBy00).length,
    valid: true
  };
}
