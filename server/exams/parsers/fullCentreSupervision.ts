import type {
  DownloadedGraphFile,
  ParsedFullCentreSupervisionResult,
  ParsedStudentRow,
  SupervisionBlock,
  SupervisionSeatRoomRule,
} from "../types.js";
import {
  cleanCells,
  collapseWhitespace,
  extractDate,
  extractRoomFromText,
  extractTimeRange,
  hasStructuredStudentData,
  looksLikeFooter,
  looksLikeStudentHeader,
  splitTabularLine,
} from "../utils.js";

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
    if (lowered.includes("class") || lowered.includes("homeroom")) headerMap.homeroom = index;
    if (lowered.includes("candidate")) headerMap.candidateNumber = index;
    if (lowered.includes("chinese")) headerMap.chineseName = index;
    if (lowered.includes("pinyin") || lowered.includes("passport")) headerMap.passportName = index;
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

function extractSeatRoomRules(text: string) {
  const rules: SupervisionSeatRoomRule[] = [];
  const normalized = text.replace(/\r/g, "\n");

  for (const line of normalized.split(/\n+/)) {
    const compact = collapseWhitespace(line);
    if (!compact) continue;
    const match = compact.match(/NO\.?\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?.*?\b([A-Za-z]{1,5}\s*\d{2,4}[A-Za-z]?)\b/i);
    if (!match?.[1] || !match[3]) continue;

    const startSeat = Number(match[1]);
    const endSeat = Number(match[2] ?? match[1]);
    if (!Number.isFinite(startSeat) || !Number.isFinite(endSeat)) continue;

    rules.push({
      startSeat,
      endSeat,
      room: collapseWhitespace(match[3]).replace(/\s+/g, "").toUpperCase(),
    });
  }

  return rules;
}

function extractNextExamName(text: string) {
  const normalized = collapseWhitespace(text.replace(/\r/g, " ").replace(/\n/g, " "));
  if (!normalized) return "";

  let value = normalized.replace(/^next exam\s*[：:﹕]?\s*/i, "").trim();
  const timeRange = extractTimeRange(value);
  if (timeRange) {
    value = value.replace(/[，,]?\s*\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2}.*/, "").trim();
  }

  value = value.replace(/\b[A-Z]?\d{4}\/\d{2}\b/gi, "").replace(/\s{2,}/g, " ").trim();
  value = value.replace(/\s*-\s*/g, " - ");
  return value.replace(/[，,]\s*$/, "").trim();
}

function buildBlock(
  metaRows: string[][],
  studentRows: string[][],
  headerMap: HeaderMap,
  sourceLabel: string,
): SupervisionBlock | null {
  let examDate = "";
  let supervisionStartTime = "";
  let supervisionEndTime = "";
  let supervisionRoom = "";
  let nextExamName = "";
  let nextExamStartTime = "";
  let nextExamEndTime = "";
  const seatRoomRules: SupervisionSeatRoomRule[] = [];
  const rawLines: string[] = [];
  const students: ParsedStudentRow[] = [];

  for (const row of metaRows) {
    const rowText = collapseWhitespace(row.join(" "));
    if (!rowText) continue;
    rawLines.push(rowText);
    const lowered = rowText.toLowerCase();

    if (!examDate) {
      examDate = extractDate(rowText) ?? "";
    }

    if (!supervisionStartTime && lowered.includes("supervision time")) {
      const range = extractTimeRange(rowText);
      if (range) {
        supervisionStartTime = range.startTime;
        supervisionEndTime = range.endTime;
      }
    }

    if (!supervisionRoom && lowered.includes("supervision room")) {
      supervisionRoom = extractRoomFromText(rowText);
    }

    if (lowered.startsWith("next exam")) {
      const range = extractTimeRange(rowText);
      if (range && !nextExamStartTime) {
        nextExamStartTime = range.startTime;
        nextExamEndTime = range.endTime;
      }

      if (!nextExamName && !lowered.includes("should go to")) {
        nextExamName = extractNextExamName(rowText);
      }

      seatRoomRules.push(...extractSeatRoomRules(row.join("\n")));
    }
  }

  for (const row of studentRows) {
    const rowText = collapseWhitespace(row.join(" "));
    if (!rowText) continue;
    if (looksLikeFooter(rowText)) break;

    rawLines.push(rowText);
    const student = parseStudentRow(row, headerMap);
    if (student) {
      students.push(student);
    }
  }

  if (!examDate || !supervisionStartTime || !supervisionEndTime) {
    return null;
  }

  return {
    examDate,
    supervisionStartTime,
    supervisionEndTime,
    supervisionRoom,
    nextExamName,
    nextExamStartTime,
    nextExamEndTime,
    seatRoomRules,
    students,
    rawText: `${sourceLabel}\n${rawLines.join("\n")}`,
    sourceLabel,
  };
}

function looksLikeSupervisionBoundary(text: string) {
  const lowered = collapseWhitespace(text).toLowerCase();
  return lowered.includes("full centre supervision attendance sheet")
    || (lowered.includes("supervision time") && Boolean(extractDate(text)));
}

function parseSupervisionRows(rows: string[][], sourceLabel: string): ParsedFullCentreSupervisionResult {
  const blocks: SupervisionBlock[] = [];
  const warnings: string[] = [];
  let lastConsumedIndex = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const headerRow = cleanCells(rows[index]);
    if (!looksLikeStudentHeader(headerRow)) continue;

    const headerMap = buildHeaderMap(headerRow);
    const blockStart = Math.max(lastConsumedIndex, index - 10);
    let blockEnd = index + 1;

    while (blockEnd < rows.length) {
      const currentRow = cleanCells(rows[blockEnd]);
      const rowText = collapseWhitespace(currentRow.join(" "));

      if (!currentRow.length) {
        blockEnd += 1;
        continue;
      }

      if (
        (looksLikeStudentHeader(currentRow) && blockEnd > index + 1)
        || looksLikeFooter(rowText)
        || (looksLikeSupervisionBoundary(rowText) && blockEnd > index + 1)
      ) {
        break;
      }

      blockEnd += 1;
    }

    const metadataRows = rows.slice(blockStart, index).map(cleanCells).filter(row => row.length);
    const studentRows = rows.slice(index + 1, blockEnd).map(cleanCells);
    const block = buildBlock(metadataRows, studentRows, headerMap, sourceLabel);

    if (block) {
      blocks.push(block);
    } else {
      warnings.push(`无法解析全面监管场次: ${sourceLabel}#${index + 1}`);
    }

    lastConsumedIndex = blockEnd;
    index = blockEnd - 1;
  }

  if (!blocks.length) {
    warnings.push(`未能从 ${sourceLabel} 解析出任何全面监管场次`);
  }

  return {
    kind: "full-centre-supervision",
    blocks,
    warnings,
  };
}

async function parseWorkbook(file: DownloadedGraphFile) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const blocks: SupervisionBlock[] = [];
  const warnings: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as unknown[][];
    const result = parseSupervisionRows(rawRows.map(row => row.map(value => String(value ?? ""))), `${file.name}:${sheetName}`);
    blocks.push(...result.blocks);
    warnings.push(...result.warnings);
  }

  return {
    kind: "full-centre-supervision" as const,
    blocks,
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

  return parseSupervisionRows(lines, file.name);
}

export async function parseFullCentreSupervisionFile(file: DownloadedGraphFile): Promise<ParsedFullCentreSupervisionResult> {
  const lowered = file.name.toLowerCase();

  if (lowered.endsWith(".xlsx") || lowered.endsWith(".xls") || file.mimeType?.includes("sheet")) {
    return parseWorkbook(file);
  }

  if (lowered.endsWith(".pdf") || file.mimeType?.includes("pdf")) {
    return parsePdf(file);
  }

  return {
    kind: "full-centre-supervision",
    blocks: [],
    warnings: [`不支持的全面监管文件格式: ${file.name}`],
  };
}
