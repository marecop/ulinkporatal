const MONTH_INDEX: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sept: 8,
  sep: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const SESSION_HEADER_STOP_WORDS = [
  "centre number",
  "actual start time",
  "actual end time",
  "attendance",
  "candidate number",
  "seating no",
  "passport name",
  "english name",
  "homeroom",
  "invigilator",
  "note",
  "room",
  "classroom",
];

export function collapseWhitespace(value: string) {
  return value.replace(/\u3000/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeName(value: string) {
  return collapseWhitespace(value)
    .normalize("NFKC")
    .replace(/[()（）【】\[\]·•.\-_\s]/g, "")
    .toLowerCase();
}

export function normalizeSubject(value: string) {
  return collapseWhitespace(value)
    .normalize("NFKC")
    .replace(/[()（）【】\[\],.:;'"`‘’“”\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function splitTabularLine(line: string) {
  const normalized = line.replace(/\u00a0/g, " ").trim();
  if (!normalized) return [];
  const tabSplit = normalized.split("\t").map(collapseWhitespace).filter(Boolean);
  if (tabSplit.length > 1) return tabSplit;
  const wideSpaceSplit = normalized.split(/\s{2,}/).map(collapseWhitespace).filter(Boolean);
  if (wideSpaceSplit.length > 1) return wideSpaceSplit;
  return [collapseWhitespace(normalized)];
}

export function cleanCells(values: unknown[]) {
  return values
    .map((value) => collapseWhitespace(String(value ?? "")))
    .filter(Boolean);
}

export function extractTimeRange(text: string) {
  const normalized = text.replace(/[：﹕]/g, ":").replace(/[–—至~]/g, "-");
  const match = normalized.match(/(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})/);
  if (!match) return null;
  const startTime = match[1].replace(".", ":").padStart(5, "0");
  const endTime = match[2].replace(".", ":").padStart(5, "0");
  return { startTime, endTime };
}

function inferExamYear(monthIndex: number, day: number) {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), monthIndex, day);
  const deltaDays = Math.round((candidate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (deltaDays < -180) return now.getFullYear() + 1;
  if (deltaDays > 180) return now.getFullYear() - 1;
  return now.getFullYear();
}

export function extractDate(text: string) {
  const normalized = collapseWhitespace(text.replace(/[,，]/g, " "));

  const dayFirstMatch = normalized.match(/\b(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?\b/);
  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const monthIndex = MONTH_INDEX[dayFirstMatch[2].toLowerCase()];
    if (Number.isInteger(day) && monthIndex !== undefined) {
      const year = dayFirstMatch[3] ? Number(dayFirstMatch[3]) : inferExamYear(monthIndex, day);
      return formatIsoDate(year, monthIndex, day);
    }
  }

  const monthFirstMatch = normalized.match(/\b([A-Za-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?\b/);
  if (monthFirstMatch) {
    const monthIndex = MONTH_INDEX[monthFirstMatch[1].toLowerCase()];
    const day = Number(monthFirstMatch[2]);
    if (monthIndex !== undefined && Number.isInteger(day)) {
      const year = monthFirstMatch[3] ? Number(monthFirstMatch[3]) : inferExamYear(monthIndex, day);
      return formatIsoDate(year, monthIndex, day);
    }
  }

  const slashMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const monthIndex = Number(slashMatch[2]) - 1;
    const rawYear = slashMatch[3];
    const year = rawYear ? normalizeYear(Number(rawYear)) : inferExamYear(monthIndex, day);
    return formatIsoDate(year, monthIndex, day);
  }

  return null;
}

function normalizeYear(year: number) {
  if (year < 100) return 2000 + year;
  return year;
}

function formatIsoDate(year: number, monthIndex: number, day: number) {
  const candidate = new Date(Date.UTC(year, monthIndex, day));
  if (Number.isNaN(candidate.getTime())) return null;
  const month = String(monthIndex + 1).padStart(2, "0");
  const normalizedDay = String(day).padStart(2, "0");
  return `${year}-${month}-${normalizedDay}`;
}

export function looksLikeStudentHeader(cells: string[]) {
  const joined = collapseWhitespace(cells.join(" ").toLowerCase());
  return joined.includes("candidate number")
    || joined.includes("chinese name")
    || joined.includes("passport name")
    || joined.includes("english name")
    || joined.includes("seating no");
}

export function looksLikeFooter(text: string) {
  const lowered = collapseWhitespace(text).toLowerCase();
  return lowered.includes("invigilator")
    || lowered.startsWith("note")
    || lowered.includes("dictionaries are allowed")
    || lowered.includes("signature");
}

export function looksLikeSessionBoundary(text: string) {
  const lowered = collapseWhitespace(text).toLowerCase();
  return lowered.includes("centre number")
    || (Boolean(extractDate(text)) && Boolean(extractTimeRange(text)));
}

export function extractRoomFromText(text: string) {
  const normalized = collapseWhitespace(text);
  const lowered = normalized.toLowerCase();
  if (!normalized || lowered.includes("centre number")) return "";

  const labeled = normalized.match(/room\s*[：:﹕]?\s*([A-Za-z]{1,5}\s*\d{1,4}[A-Za-z]?)/i);
  if (labeled?.[1]) return collapseWhitespace(labeled[1]).toUpperCase();

  if (/^[A-Za-z]{1,5}\s*\d{2,4}[A-Za-z]?$/.test(normalized)) {
    return normalized.replace(/\s+/g, "").toUpperCase();
  }

  return "";
}

export function extractSubjectFromCells(cells: string[]) {
  const candidates = cells
    .map(collapseWhitespace)
    .filter(Boolean)
    .filter((cell) => {
      const lowered = cell.toLowerCase();
      if (SESSION_HEADER_STOP_WORDS.some(word => lowered.includes(word))) return false;
      if (extractDate(cell)) return false;
      if (extractTimeRange(cell)) return false;
      if (/^\d{3,4}\/\d{1,3}$/.test(cell)) return false;
      const compact = cell.replace(/\s+/g, "");
      if (/^(?=.*\d)[A-Z0-9+/.-]+$/.test(compact)) return false;
      if (/^[A-Z0-9+]+$/.test(cell) && cell.length > 6) return false;
      return true;
    });

  if (!candidates.length) return "";
  return collapseWhitespace(candidates.join(" "));
}

export function hasStructuredStudentData(cells: string[]) {
  const joined = collapseWhitespace(cells.join(" "));
  return /^\d{1,3}\b/.test(joined) || /\d{3,6}/.test(joined) || /[\u4e00-\u9fff]/.test(joined);
}

export function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = collapseWhitespace(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}
