import axios from "axios";
import { buildMatchedExamRecords } from "./matcher.js";
import { parseAttendanceFile } from "./parsers/attendance.js";
import type { DownloadedGraphFile, MatchedExamRecord, ParsedAttendanceResult } from "./types.js";

const TEMPORARY_FALLBACK_ASSET_PATH = "/exam-fallback/attendance-sheet-until-20260324.xlsx";
const TEMPORARY_FALLBACK_SOURCE_ID = "temporary-attendance-sheet-20260324";
const TEMPORARY_FALLBACK_SOURCE_NAME = "attendance-sheet-until-20260324.xlsx";
const TEMPORARY_FALLBACK_CUTOFF_DATE = "2026-03-24";
const TEMPORARY_FALLBACK_TIMEOUT_MS = 15000;

let parsedFallbackPromise: Promise<ParsedAttendanceResult> | null = null;

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatLocalDate(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveTemporaryFallbackToday(input?: string) {
  if (input && isIsoDate(input)) return input;
  return formatLocalDate(new Date());
}

export function isTemporaryFallbackActive(today: string) {
  return today <= TEMPORARY_FALLBACK_CUTOFF_DATE;
}

async function loadParsedFallback(baseUrl: string) {
  if (!parsedFallbackPromise) {
    parsedFallbackPromise = (async () => {
      const assetUrl = new URL(TEMPORARY_FALLBACK_ASSET_PATH, baseUrl).toString();
      const response = await axios.get<ArrayBuffer>(assetUrl, {
        responseType: "arraybuffer",
        timeout: TEMPORARY_FALLBACK_TIMEOUT_MS,
      });

      const file: DownloadedGraphFile = {
        id: TEMPORARY_FALLBACK_SOURCE_ID,
        driveId: "temporary-static-asset",
        name: TEMPORARY_FALLBACK_SOURCE_NAME,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        kind: "attendance",
        buffer: Buffer.from(response.data),
      };

      return parseAttendanceFile(file);
    })().catch((error) => {
      parsedFallbackPromise = null;
      throw error;
    });
  }

  return parsedFallbackPromise;
}

export async function getTemporaryFallbackExamRecords(params: {
  baseUrl: string;
  middleName: string;
  today: string;
}) {
  const today = resolveTemporaryFallbackToday(params.today);
  if (!isTemporaryFallbackActive(today)) {
    return {
      active: false,
      cutoffDate: TEMPORARY_FALLBACK_CUTOFF_DATE,
      exams: [] as MatchedExamRecord[],
      warnings: [] as string[],
      sourceFileName: TEMPORARY_FALLBACK_SOURCE_NAME,
    };
  }

  const parsed = await loadParsedFallback(params.baseUrl);
  const exams = buildMatchedExamRecords(
    parsed.sessions,
    params.middleName,
    TEMPORARY_FALLBACK_SOURCE_ID,
    TEMPORARY_FALLBACK_SOURCE_NAME,
  ).filter((record) => record.examDate >= today && record.examDate <= TEMPORARY_FALLBACK_CUTOFF_DATE);

  return {
    active: true,
    cutoffDate: TEMPORARY_FALLBACK_CUTOFF_DATE,
    exams,
    warnings: parsed.warnings,
    sourceFileName: TEMPORARY_FALLBACK_SOURCE_NAME,
  };
}
