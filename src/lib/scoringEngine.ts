import type { PairMeaning, PhoneAnalysis, PhonePair } from "@/types/phone";

export const scoringRules = {
  strongPositive: {
    pairs: ["08", "18", "33", "48", "61", "66", "68", "83", "86", "89", "91", "96", "98"],
    weight: 10
  },
  positive: {
    pairs: ["06", "13", "17", "19", "21", "23", "29", "32", "41", "42", "44", "46", "56", "62", "64", "65", "73", "84", "94", "99"],
    weight: 5
  },
  strongNegative: {
    pairs: ["05", "10", "20", "31", "37", "39", "43", "45", "47", "50", "51", "54", "57", "58", "59", "60", "71", "74", "75", "78", "80", "81", "85", "87", "95", "97"],
    weight: -10
  },
  negative: {
    pairs: ["02", "03", "07", "12", "16", "22", "24", "27", "28", "30", "34", "35", "49", "52", "53", "67", "69", "70", "72", "76", "77", "79", "82", "88", "90", "92", "93"],
    weight: -4
  },
  totalMeaning: {
    strongPositive: ["08", "18", "33", "41", "42", "48", "61", "66", "68", "83", "84", "86", "89", "91", "94", "96", "98"],
    positive: ["06", "13", "17", "19", "21", "23", "29", "32", "44", "46", "56", "62", "64", "65", "73", "99"],
    strongNegative: ["05", "10", "20", "31", "37", "39", "43", "45", "47", "50", "51", "54", "57", "58", "59", "60", "71", "74", "75", "78", "80", "81", "85", "87", "95", "97"],
    negative: ["02", "03", "07", "12", "16", "22", "24", "27", "28", "30", "34", "35", "49", "52", "53", "67", "69", "70", "72", "76", "77", "79", "82", "88", "90", "92", "93"]
  }
} as const;

export const pairSentiment = (pair: string): { sentiment: PairMeaning; weight: number } => {
  if ((scoringRules.strongPositive.pairs as readonly string[]).includes(pair)) return { sentiment: "positive", weight: scoringRules.strongPositive.weight };
  if ((scoringRules.positive.pairs as readonly string[]).includes(pair)) return { sentiment: "positive", weight: scoringRules.positive.weight };
  if ((scoringRules.strongNegative.pairs as readonly string[]).includes(pair)) return { sentiment: "negative", weight: scoringRules.strongNegative.weight };
  if ((scoringRules.negative.pairs as readonly string[]).includes(pair)) return { sentiment: "negative", weight: scoringRules.negative.weight };
  return { sentiment: "neutral", weight: 0 };
};

export const totalMeaningWeight = (pair: string): number => {
  if ((scoringRules.totalMeaning.strongPositive as readonly string[]).includes(pair)) return 12;
  if ((scoringRules.totalMeaning.positive as readonly string[]).includes(pair)) return 6;
  if ((scoringRules.totalMeaning.strongNegative as readonly string[]).includes(pair)) return -12;
  if ((scoringRules.totalMeaning.negative as readonly string[]).includes(pair)) return -6;
  return 0;
};

export function calculateScore(
  pairs: PhonePair[],
  totalPair: string | undefined,
  repeatedCount: number,
  negatedCount: number
): { score: number; rating: string; strengths: string[]; warnings: string[] } {
  const active = pairs.filter((pair) => pair.pair !== "00" && !pair.isNegatedBy00);
  const raw = active.reduce((sum, pair) => sum + pair.weight, 0);
  const totalAdjustment = totalPair ? totalMeaningWeight(totalPair) : 0;
  const repeatBonus = repeatedCount > 0 ? Math.min(repeatedCount * 2, 8) : 0;
  const negationPenalty = negatedCount * 2;
  const score = Math.max(0, Math.min(100, Math.round(50 + raw + totalAdjustment + repeatBonus - negationPenalty)));
  const rating = score >= 80 ? "Rất nổi bật" : score >= 65 ? "Tích cực" : score >= 50 ? "Cân bằng" : score >= 35 ? "Cần cân nhắc" : "Nhiều cảnh báo";

  const strengths = active
    .filter((pair) => pair.sentiment === "positive")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((pair) => `${pair.pair}: ${pair.meaning}`);
  const warnings = active
    .filter((pair) => pair.sentiment === "negative")
    .sort((a, b) => a.weight - b.weight)
    .slice(0, 3)
    .map((pair) => `${pair.pair}: ${pair.meaning}`);
  if (negatedCount > 0) warnings.unshift(`00 phủ định ${negatedCount} cặp đứng trước`);
  return { score, rating, strengths, warnings };
}
