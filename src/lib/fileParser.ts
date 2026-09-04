import * as XLSX from "xlsx";
import type { ParsedPhone } from "@/types/phone";
import { validatePhoneNumber } from "@/lib/phoneAnalysisEngine";

const cleanCandidate = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

export const parseTextCandidates = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/[;,|\t]/))
    .map((item) => item.trim())
    .filter(Boolean);

export async function parsePhoneFile(file: File): Promise<ParsedPhone[]> {
  const extension = file.name.toLowerCase().split(".").pop();
  let candidates: string[] = [];
  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellText: true, cellDates: false });
    candidates = workbook.SheetNames.flatMap((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
      return rows.flatMap((row) => row.map(cleanCandidate).filter(Boolean));
    });
  } else {
    candidates = parseTextCandidates(await file.text());
  }
  return candidates.map((raw) => {
    const result = validatePhoneNumber(raw);
    return { raw, phone: result.phone, valid: result.valid, error: result.error };
  });
}

export const exportRows = (rows: Array<Record<string, string | number>>): string =>
  rows
    .map((row) => Object.values(row).map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
