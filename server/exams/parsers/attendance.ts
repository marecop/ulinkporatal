import type { DownloadedGraphFile, ExamSession, ParsedAttendanceResult, ParsedStudentRow } from "../types.ts";
import {
  cleanCells,
  collapseWhitespace,
  dedupeStrings,
  extractDate,
  extractRoomFromText,
  extractSubjectFromCells,
  extractTimeRange,
  hasStructuredStudentData,
  looksLikeFooter,
  looksLikeSessionBoundary,
  looksLikeStudentHeader,
  splitTabularLine,
} from "../utils.ts";

type HeaderMap = {
  seatNumber?: number;
  homeroom?: number;
  candidateNumber?: number;
  chineseName?: number;
  passportName?: number;
  englishName?: number;
};

function buildHeaderMap(cells: string[]): HeaderMap {
  const headerMap: HeaderMap = {};

  cells.forEach((cell, index) => {
    const lowered = cell.toLowerCase();
    if (lowered.includes("seating") || lowered.includes("seat")) headerMap.seatNumber = index;
    if (lowered.includes("homeroom")) headerMap.homeroom = index;
    if (lowered.includes("candidate")) headerMap.candidateNumber = index;
    if (lowered.includes("chinese")) headerMap.chineseName = index;
    if (lowered.includes("passport")) headerMap.passportName = index;
    if (lowered.includes("english")) headerMap.englishName = index;
  });

  return headerMap;
}

function getCell(cells: string[], index?: number) {
  if (index === undefined) return "";
  return collapseWhitespace(cells[index] ?? "");
}

function parseStudentRow(cells: string[], headerMap: HeaderMap): ParsedStudentRow | null {
  const normalizedCells = cells.length > 1 ? cells : splitTabularLine(cells[0] ?? "");
  if (!normalizedCells.length || !hasStructuredStudentData(normalizedCells)) return null;

  const rowText = collapseWhitespace(normalizedCells.join(" "));
  if (looksLikeFooter(rowText) || looksLikeStudentHeader(normalizedCells)) return null;

  const structured: ParsedStudentRow = {
    seatNumber: getCell(normalizedCells, headerMap.seatNumber),
    homeroom: getCell(normalizedCells, headerMap.homeroom),
    candidateNumber: getCell(normalizedCells, headerMap.candidateNumber),
    chineseName: getCell(normalizedCells, headerMap.chineseName),
    passportName: getCell(normalizedCells, headerMap.passportName),
    englishName: getCell(normalizedCells, headerMap.englishName),
    rawText: rowText,
  };

  if (!structured.candidateNumber) {
    const candidateMatch = rowText.match(/\b(\d{4,6})\b/);
    if (candidateMatch?.[1]) structured.candidateNumber = candidateMatch[1];
  }

  if (!structured.seatNumber) {
    const seatMatch = rowText.match(/^(\d{1,3})\b/);
    if (seatMatch?.[1]) structured.seatNumber = seatMatch[1];
  }

  if (!structured.chineseName) {
    const chineseMatch = rowText.match(/([\u4e00-\u9fff]{2,6})/);
    if (chineseMatch?.[1]) structured.chineseName = chineseMatch[1];
  }

  if (
    !structured.seatNumber
    && !structured.candidateNumber
    && !structured.chineseName
    && !structured.passportName
    && !structured.englishName
  ) {
    return null;
  }

  return structured;
}

function buildSessionFromBlock(
  metaRows: string[][],
  studentRows: string[][],
  headerMap: HeaderMap,
  sourceLabel: string,
): ExamSession | null {
  let examDate = "";
  let startTime = "";
  let endTime = "";
  let room = "";
  const subjectCandidates: string[] = [];
  const rawLines: string[] = [];
  const students: ParsedStudentRow[] = [];

  for (const row of metaRows) {
    const rowText = collapseWhitespace(row.join(" "));
    if (!rowText) continue;
    rawLines.push(rowText);

    if (!examDate) {
      examDate = extractDate(rowText) ?? "";
    }

    if (!startTime || !endTime) {
      const range = extractTimeRange(rowText);
      if (range) {
        startTime = range.startTime;
        endTime = range.endTime;
      }
    }

    if (!room) {
      room = extractRoomFromText(rowText);
    }

    const subjectCandidate = extractSubjectFromCells(row);
    if (subjectCandidate) {
      subjectCandidates.push(subjectCandidate);
    }
  }

  for (const row of studentRows) {
    const rowText = collapseWhitespace(row.join(" "));
    if (!rowText) continue;
    if (looksLikeFooter(rowText) || looksLikeSessionBoundary(rowText)) break;
    rawLines.push(rowText);
    const student = parseStudentRow(row, headerMap);
    if (student) {
      students.push(student);
    }
  }

  if (!examDate || !startTime || !endTime) {
    return null;
  }

  return {
    subject: dedupeStrings(subjectCandidates).join(" / ") || "Unknown Subject",
    examDate,
    startTime,
    endTime,
    room,
    students,
    rawText: rawLines.join("\n"),
    sourceLabel,
  };
}

function parseAttendanceRows(rows: string[][], sourceLabel: string): ParsedAttendanceResult {
  const sessions: ExamSession[] = [];
  const warnings: string[] = [];
  let lastConsumedIndex = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const headerRow = cleanCells(rows[index]);
    if (!looksLikeStudentHeader(headerRow)) continue;

    const headerMap = buildHeaderMap(headerRow);
    const blockStart = Math.max(lastConsumedIndex, index - 6);
    let blockEnd = index + 1;

    while (blockEnd < rows.length) {
      const currentRow = cleanCells(rows[blockEnd]);
      const rowText = collapseWhitespace(currentRow.join(" "));

      if (!currentRow.length) {
        blockEnd += 1;
        continue;
      }

      if (
        looksLikeStudentHeader(currentRow)
        || looksLikeFooter(rowText)
        || (looksLikeSessionBoundary(rowText) && blockEnd > index + 1)
      ) {
        break;
      }

      blockEnd += 1;
    }

    const metadataRows = rows.slice(blockStart, index).map(cleanCells).filter(row => row.length);
    const studentRows = rows.slice(index + 1, blockEnd).map(cleanCells);
    const session = buildSessionFromBlock(metadataRows, studentRows, headerMap, sourceLabel);

    if (session) {
      sessions.push(session);
    } else {
      warnings.push(`无法解析场次头部: ${sourceLabel}#${index + 1}`);
    }

    lastConsumedIndex = blockEnd;
    index = blockEnd - 1;
  }

  if (!sessions.length) {
    warnings.push(`未能从 ${sourceLabel} 解析出任何考试场次`);
  }

  return {
    kind: "attendance",
    sessions,
    warnings,
  };
}

async function parseWorkbook(file: DownloadedGraphFile) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const sessions: ExamSession[] = [];
  const warnings: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as unknown[][];
    const result = parseAttendanceRows(rawRows.map(row => row.map(value => String(value ?? ""))), `${file.name}:${sheetName}`);
    sessions.push(...result.sessions);
    warnings.push(...result.warnings);
  }

  return {
    kind: "attendance" as const,
    sessions,
    warnings,
  };
}

async function parsePdf(file: DownloadedGraphFile) {
  const pdfModule = await import("pdf-parse");
  const pdfParse = (pdfModule.default ?? pdfModule) as (data: Buffer) => Promise<{ text: string }>;
  const parsed = await pdfParse(file.buffer);
  const lines = parsed.text
    .split(/\r?\n/)
    .map(line => splitTabularLine(line))
    .filter(cells => cells.length > 0);

  return parseAttendanceRows(lines, file.name);
}

export async function parseAttendanceFile(file: DownloadedGraphFile): Promise<ParsedAttendanceResult> {
  const lowered = file.name.toLowerCase();

  if (lowered.endsWith(".xlsx") || lowered.endsWith(".xls") || file.mimeType?.includes("sheet")) {
    return parseWorkbook(file);
  }

  if (lowered.endsWith(".pdf") || file.mimeType?.includes("pdf")) {
    return parsePdf(file);
  }

  return {
    kind: "attendance",
    sessions: [],
    warnings: [`不支持的考勤表文件格式: ${file.name}`],
  };
}
