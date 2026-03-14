import type { DownloadedGraphFile, ParsedClassroomChangeResult, RoomChangeRecord } from "../types.js";
import {
  cleanCells,
  collapseWhitespace,
  dedupeStrings,
  extractDate,
  extractRoomFromText,
  extractSubjectFromCells,
  extractTimeRange,
  looksLikeFooter,
  splitTabularLine,
} from "../utils.js";

type ChangeHeaderMap = {
  subject?: number;
  date?: number;
  time?: number;
  room?: number;
};

function buildHeaderMap(cells: string[]): ChangeHeaderMap {
  const headerMap: ChangeHeaderMap = {};
  cells.forEach((cell, index) => {
    const lowered = cell.toLowerCase();
    if (lowered.includes("subject") || lowered.includes("course")) headerMap.subject = index;
    if (lowered === "date" || lowered.includes("exam date")) headerMap.date = index;
    if (lowered.includes("time")) headerMap.time = index;
    if (lowered.includes("new room") || lowered.includes("room")) headerMap.room = index;
  });
  return headerMap;
}

function parseStructuredRows(rows: string[][], sourceLabel: string) {
  const changes: RoomChangeRecord[] = [];
  const warnings: string[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const headerRow = cleanCells(rows[index]);
    const headerMap = buildHeaderMap(headerRow);

    if (
      headerMap.subject === undefined
      || headerMap.date === undefined
      || headerMap.time === undefined
      || headerMap.room === undefined
    ) {
      continue;
    }

    for (let rowIndex = index + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = cleanCells(rows[rowIndex]);
      const rowText = collapseWhitespace(row.join(" "));
      if (!row.length) continue;
      if (looksLikeFooter(rowText)) break;

      const timeRange = extractTimeRange(row[headerMap.time] ?? rowText);
      const examDate = extractDate(row[headerMap.date] ?? rowText);
      const room = extractRoomFromText(row[headerMap.room] ?? rowText);
      const subject = collapseWhitespace(row[headerMap.subject] ?? "");

      if (subject && examDate && timeRange && room) {
        changes.push({
          subject,
          examDate,
          startTime: timeRange.startTime,
          endTime: timeRange.endTime,
          room,
          rawText: rowText,
        });
      }
    }

    if (!changes.length) {
      warnings.push(`未能从 ${sourceLabel} 的结构化表格中解析出教室变更`);
    }

    return { changes, warnings };
  }

  return { changes, warnings };
}

function parseFallbackRows(rows: string[][], sourceLabel: string) {
  const changes: RoomChangeRecord[] = [];
  const warnings: string[] = [];

  for (const row of rows) {
    const cells = cleanCells(row);
    if (!cells.length) continue;

    const rowText = collapseWhitespace(cells.join(" "));
    if (looksLikeFooter(rowText)) continue;

    const examDate = extractDate(rowText);
    const timeRange = extractTimeRange(rowText);
    const room = extractRoomFromText(rowText);
    const subject = dedupeStrings([
      extractSubjectFromCells(cells),
      cells[0] ?? "",
    ]).join(" / ");

    if (examDate && timeRange && room && subject) {
      changes.push({
        subject,
        examDate,
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
        room,
        rawText: rowText,
      });
    }
  }

  if (!changes.length) {
    warnings.push(`未能从 ${sourceLabel} 解析出任何教室变更`);
  }

  return { changes, warnings };
}

function parseRows(rows: string[][], sourceLabel: string): ParsedClassroomChangeResult {
  const structured = parseStructuredRows(rows, sourceLabel);
  if (structured.changes.length > 0) {
    return {
      kind: "classroom-change",
      changes: structured.changes,
      warnings: structured.warnings,
    };
  }

  const fallback = parseFallbackRows(rows, sourceLabel);
  return {
    kind: "classroom-change",
    changes: fallback.changes,
    warnings: [...structured.warnings, ...fallback.warnings],
  };
}

async function parseWorkbook(file: DownloadedGraphFile): Promise<ParsedClassroomChangeResult> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const changes: RoomChangeRecord[] = [];
  const warnings: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as unknown[][];
    const result = parseRows(rawRows.map(row => row.map(value => String(value ?? ""))), `${file.name}:${sheetName}`);
    changes.push(...result.changes);
    warnings.push(...result.warnings);
  }

  return {
    kind: "classroom-change",
    changes,
    warnings,
  };
}

async function parsePdf(file: DownloadedGraphFile): Promise<ParsedClassroomChangeResult> {
  const pdfModule = await import("pdf-parse");
  const pdfParse = (pdfModule.default ?? pdfModule) as (data: Buffer) => Promise<{ text: string }>;
  const parsed = await pdfParse(file.buffer);
  const rows = parsed.text
    .split(/\r?\n/)
    .map(line => splitTabularLine(line))
    .filter(cells => cells.length > 0);
  return parseRows(rows, file.name);
}

export async function parseClassroomChangeFile(file: DownloadedGraphFile): Promise<ParsedClassroomChangeResult> {
  const lowered = file.name.toLowerCase();

  if (lowered.endsWith(".xlsx") || lowered.endsWith(".xls") || file.mimeType?.includes("sheet")) {
    return parseWorkbook(file);
  }

  if (lowered.endsWith(".pdf") || file.mimeType?.includes("pdf")) {
    return parsePdf(file);
  }

  return {
    kind: "classroom-change",
    changes: [],
    warnings: [`不支持的教室变更文件格式: ${file.name}`],
  };
}
