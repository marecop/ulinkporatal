import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { clearExamData, getExamScheduleState, replaceExamData, upsertExamScheduleState, type ExamSourceFileInsert } from "../db.js";
import { applyFullCentreSupervision, buildMatchedExamRecords, buildMatchedSupervisionRecords } from "./matcher.js";
import { parseAttendanceFile } from "./parsers/attendance.js";
import { parseFullCentreSupervisionFile } from "./parsers/fullCentreSupervision.js";
import type {
  DownloadedGraphFile,
  MatchedExamRecord,
  ParsedAttendanceResult,
  ParsedFullCentreSupervisionResult,
} from "./types.js";

const TEMPORARY_ATTENDANCE_ASSET_RELATIVE_PATH = path.join("public", "exam-fallback", "attendance-sheet-until-20260324.xlsx");
const TEMPORARY_ATTENDANCE_SOURCE_ID = "temporary-attendance-sheet-20260324";
const TEMPORARY_ATTENDANCE_SOURCE_NAME = "attendance-sheet-until-20260324.xlsx";
const TEMPORARY_SUPERVISION_ASSET_RELATIVE_PATH = path.join("public", "exam-fallback", "full-centre-supervision-arrangement-20260324.xlsx");
const TEMPORARY_SUPERVISION_SOURCE_ID = "temporary-full-centre-supervision-20260324";
const TEMPORARY_SUPERVISION_SOURCE_NAME = "full-centre-supervision-arrangement-20260324.xlsx";
const TEMPORARY_FALLBACK_CUTOFF_DATE = "2026-03-24";
const TEMPORARY_FALLBACK_SOURCE_MODE = "local-static-mock";
const EXCEL_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

let parsedAttendancePromise: Promise<ParsedAttendanceResult> | null = null;
let parsedSupervisionPromise: Promise<ParsedFullCentreSupervisionResult> | null = null;

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

function getAbsoluteAssetPath(relativePath: string) {
  return path.join(process.cwd(), relativePath);
}

async function loadLocalExcelFile(params: {
  relativePath: string;
  sourceId: string;
  fileName: string;
  kind: DownloadedGraphFile["kind"];
}) {
  const buffer = await readFile(getAbsoluteAssetPath(params.relativePath));
  return {
    file: {
      id: params.sourceId,
      driveId: "temporary-static-asset",
      name: params.fileName,
      mimeType: EXCEL_MIME_TYPE,
      kind: params.kind,
      buffer,
    } satisfies DownloadedGraphFile,
    source: {
      driveItemId: params.sourceId,
      fileName: params.fileName,
      mimeType: EXCEL_MIME_TYPE,
      sourceHash: createHash("sha256").update(buffer).digest("hex"),
      parseStatus: "parsed",
      kind: params.kind,
    } satisfies ExamSourceFileInsert,
  };
}

async function loadParsedAttendance() {
  if (!parsedAttendancePromise) {
    parsedAttendancePromise = (async () => {
      const { file } = await loadLocalExcelFile({
        relativePath: TEMPORARY_ATTENDANCE_ASSET_RELATIVE_PATH,
        sourceId: TEMPORARY_ATTENDANCE_SOURCE_ID,
        fileName: TEMPORARY_ATTENDANCE_SOURCE_NAME,
        kind: "attendance",
      });
      return parseAttendanceFile(file);
    })().catch((error) => {
      parsedAttendancePromise = null;
      throw error;
    });
  }

  return parsedAttendancePromise;
}

async function loadParsedSupervision() {
  if (!parsedSupervisionPromise) {
    parsedSupervisionPromise = (async () => {
      const { file } = await loadLocalExcelFile({
        relativePath: TEMPORARY_SUPERVISION_ASSET_RELATIVE_PATH,
        sourceId: TEMPORARY_SUPERVISION_SOURCE_ID,
        fileName: TEMPORARY_SUPERVISION_SOURCE_NAME,
        kind: "full-centre-supervision",
      });
      return parseFullCentreSupervisionFile(file);
    })().catch((error) => {
      parsedSupervisionPromise = null;
      throw error;
    });
  }

  return parsedSupervisionPromise;
}

async function loadParsedFallbackSources() {
  const [attendanceSource, supervisionSource, attendance, supervision] = await Promise.all([
    loadLocalExcelFile({
      relativePath: TEMPORARY_ATTENDANCE_ASSET_RELATIVE_PATH,
      sourceId: TEMPORARY_ATTENDANCE_SOURCE_ID,
      fileName: TEMPORARY_ATTENDANCE_SOURCE_NAME,
      kind: "attendance",
    }),
    loadLocalExcelFile({
      relativePath: TEMPORARY_SUPERVISION_ASSET_RELATIVE_PATH,
      sourceId: TEMPORARY_SUPERVISION_SOURCE_ID,
      fileName: TEMPORARY_SUPERVISION_SOURCE_NAME,
      kind: "full-centre-supervision",
    }),
    loadParsedAttendance(),
    loadParsedSupervision(),
  ]);

  return {
    attendance,
    supervision,
    sourceFiles: [attendanceSource.source, supervisionSource.source],
  };
}

function mergeTemporaryExamRecords(
  middleName: string,
  parsed: {
    attendance: ParsedAttendanceResult;
    supervision: ParsedFullCentreSupervisionResult;
  },
) {
  const exams = buildMatchedExamRecords(
    parsed.attendance.sessions,
    middleName,
    TEMPORARY_ATTENDANCE_SOURCE_ID,
    TEMPORARY_ATTENDANCE_SOURCE_NAME,
  );
  const supervisionRecords = buildMatchedSupervisionRecords(
    parsed.supervision.blocks,
    middleName,
    TEMPORARY_SUPERVISION_SOURCE_ID,
    TEMPORARY_SUPERVISION_SOURCE_NAME,
  );

  return applyFullCentreSupervision(exams, supervisionRecords);
}

export async function getTemporaryFallbackExamRecords(params: {
  baseUrl?: string;
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
      sourceFileName: TEMPORARY_ATTENDANCE_SOURCE_NAME,
    };
  }

  const parsed = await loadParsedFallbackSources();
  const exams = mergeTemporaryExamRecords(params.middleName, parsed)
    .filter((record) => record.examDate >= today && record.examDate <= TEMPORARY_FALLBACK_CUTOFF_DATE);

  return {
    active: true,
    cutoffDate: TEMPORARY_FALLBACK_CUTOFF_DATE,
    exams,
    warnings: [...parsed.attendance.warnings, ...parsed.supervision.warnings],
    sourceFileName: TEMPORARY_ATTENDANCE_SOURCE_NAME,
  };
}

export async function ensureTemporaryFallbackExamData(params: {
  pupilId: string;
  middleName: string;
  today: string;
}) {
  const today = resolveTemporaryFallbackToday(params.today);

  if (!isTemporaryFallbackActive(today)) {
    await clearExamData(params.pupilId);
    await upsertExamScheduleState({
      pupilId: params.pupilId,
      sourceMode: TEMPORARY_FALLBACK_SOURCE_MODE,
      lastRefreshedForDate: today,
      validUntil: TEMPORARY_FALLBACK_CUTOFF_DATE,
      lastRefreshAt: new Date().toISOString(),
      lastRefreshStatus: "expired",
      lastRefreshMessage: "Mock Exam 已过期，系统已清除 3/24 前的临时考试数据。",
    });

    return {
      active: false,
      refreshed: true,
      cutoffDate: TEMPORARY_FALLBACK_CUTOFF_DATE,
      examsCount: 0,
    };
  }

  const existingState = await getExamScheduleState(params.pupilId);
  if (
    existingState?.sourceMode === TEMPORARY_FALLBACK_SOURCE_MODE
    && existingState.lastRefreshedForDate === today
    && existingState.lastRefreshStatus === "ok"
  ) {
    return {
      active: true,
      refreshed: false,
      cutoffDate: TEMPORARY_FALLBACK_CUTOFF_DATE,
      examsCount: undefined,
    };
  }

  const parsed = await loadParsedFallbackSources();
  const exams = mergeTemporaryExamRecords(params.middleName, parsed)
    .filter((record) => record.examDate >= today && record.examDate <= TEMPORARY_FALLBACK_CUTOFF_DATE);
  const warnings = [...parsed.attendance.warnings, ...parsed.supervision.warnings];

  await replaceExamData(params.pupilId, parsed.sourceFiles, exams);
  await upsertExamScheduleState({
    pupilId: params.pupilId,
    sourceMode: TEMPORARY_FALLBACK_SOURCE_MODE,
    lastRefreshedForDate: today,
    validUntil: TEMPORARY_FALLBACK_CUTOFF_DATE,
    lastRefreshAt: new Date().toISOString(),
    lastRefreshStatus: "ok",
    lastRefreshMessage: warnings.length
      ? `已从本地 Mock Exam 样本刷新 ${exams.length} 场考试，另有 ${warnings.length} 条解析提醒。`
      : `已从本地 Mock Exam 样本刷新 ${exams.length} 场考试。`,
  });

  return {
    active: true,
    refreshed: true,
    cutoffDate: TEMPORARY_FALLBACK_CUTOFF_DATE,
    examsCount: exams.length,
    warnings,
  };
}
