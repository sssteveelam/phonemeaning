export type PairMeaning = "positive" | "negative" | "neutral";

export interface PhonePair {
  pair: string;
  meaning: string;
  index: number;
  isRepeated: boolean;
  isConsecutiveRepeat: boolean;
  isNegatedBy00: boolean;
  sentiment: PairMeaning;
  weight: number;
}

export interface RepeatedPair {
  pair: string;
  count: number;
  consecutive: boolean;
  indexes: number[];
}

export interface PhoneAnalysis {
  phoneNumber: string;
  pairs: PhonePair[];
  digitSum: number;
  totalMeaning?: string;
  repeatedPairs: RepeatedPair[];
  negatedPairs: string[];
  score: number;
  rating: string;
  positiveCount: number;
  negativeCount: number;
  strengths: string[];
  warnings: string[];
  valid: boolean;
  error?: string;
}

export interface ParsedPhone {
  raw: string;
  phone: string;
  valid: boolean;
  error?: string;
}

export interface RankedPhoneRow {
  analysis: PhoneAnalysis;
  rank: number;
  source?: {
    phone: string;
    plan: "pre" | "post";
    price: number | null;
    priceLabel: string;
    pledgeTime: string | null;
    pledgeAmount: number | null;
  };
}
