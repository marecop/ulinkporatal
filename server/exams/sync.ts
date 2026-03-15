import crypto from "node:crypto";
import { replaceExamData, updateMicrosoftBindingSyncStatus, type ExamSourceFileInsert } from "../db.js";
import { downloadGraphFile, resolveSharePointSite, searchExamFiles } from "../microsoft/graph.js";
import {
  applyClassroomChanges,
  applyFullCentreSupervision,
  buildMatchedExamRecords,
  buildMatchedSupervisionRecords,
  dedupeExamRecords,
} from "./matcher.js";
import { parseAttendanceFile } from "./parsers/attendance.js";
import { parseClassroomChangeFile } from "./parsers/classroomChange.js";
import { parseFullCentreSupervisionFile } from "./parsers/fullCentreSupervision.js";

export interface SyncExamDataResult {
  siteId: string;
  filesFound: number;
  filesProcessed: number;
  recordsCount: number;
  lastSyncAt: string;
  warnings: string[];
}

function hashBuffer(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function summarizeWarnings(warnings: string[]) {
  return warnings.slice(0, 3).join(" | ");
}

export async function syncExamData(params: {
  pupilId: string;
  middleName: string;
  accessToken: string;
}): Promise<SyncExamDataResult> {
  const targetName = params.middleName.trim();
  if (!targetName) {
    throw new Error("Current student does not have a middleName for exam matching");
  }

  const site = await resolveSharePointSite(params.accessToken);
  const fileItems = await searchExamFiles(params.accessToken, site.id);
  const warnings: string[] = [];
  const sourceFiles: ExamSourceFileInsert[] = [];
  const matchedRecords = [];
  const matchedSupervisionRecords = [];
  const roomChanges = [];
  let attendanceFilesFound = 0;
  let hasParsedAttendanceSessions = false;

  if (!fileItems.length) {
    warnings.push("未在 SharePoint 文档库中找到 Attendence Sheet / Classroom Change / Full Centre Supervision 文件");
  }

  for (const item of fileItems) {
    const downloaded = await downloadGraphFile(params.accessToken, item);
    const sourceBase: ExamSourceFileInsert = {
      driveItemId: downloaded.id,
      fileName: downloaded.name,
      webUrl: downloaded.webUrl,
      mimeType: downloaded.mimeType,
      etag: downloaded.etag,
      lastModifiedAt: downloaded.lastModifiedDateTime,
      sourceHash: hashBuffer(downloaded.buffer),
      parseStatus: "pending",
      kind: downloaded.kind,
    };

    try {
      if (downloaded.kind === "attendance") {
        attendanceFilesFound += 1;
        const parsed = await parseAttendanceFile(downloaded);
        warnings.push(...parsed.warnings);
        if (parsed.sessions.length > 0) {
          hasParsedAttendanceSessions = true;
        }
        matchedRecords.push(...buildMatchedExamRecords(parsed.sessions, targetName, downloaded.id, downloaded.name));
        sourceFiles.push({
          ...sourceBase,
          parseStatus: parsed.sessions.length > 0 ? "parsed" : "empty",
          parseMessage: parsed.warnings[0],
        });
      } else if (downloaded.kind === "classroom-change") {
        const parsed = await parseClassroomChangeFile(downloaded);
        warnings.push(...parsed.warnings);
        roomChanges.push(...parsed.changes);
        sourceFiles.push({
          ...sourceBase,
          parseStatus: parsed.changes.length > 0 ? "parsed" : "empty",
          parseMessage: parsed.warnings[0],
        });
      } else {
        const parsed = await parseFullCentreSupervisionFile(downloaded);
        warnings.push(...parsed.warnings);
        matchedSupervisionRecords.push(
          ...buildMatchedSupervisionRecords(parsed.blocks, targetName, downloaded.id, downloaded.name),
        );
        sourceFiles.push({
          ...sourceBase,
          parseStatus: parsed.blocks.length > 0 ? "parsed" : "empty",
          parseMessage: parsed.warnings[0],
        });
      }
    } catch (error: any) {
      sourceFiles.push({
        ...sourceBase,
        parseStatus: "error",
        parseMessage: error.message ?? "Unknown parsing error",
      });
      warnings.push(`文件解析失败: ${downloaded.name}`);
    }
  }

  // 没有成功解析到考勤表时，不覆盖旧数据，避免一次上游异常把考试记录整批清空。
  if (attendanceFilesFound === 0) {
    throw new Error("未找到可解析的考勤表，已保留上次同步结果");
  }

  if (!hasParsedAttendanceSessions) {
    throw new Error("考勤表解析失败，已保留上次同步结果");
  }

  const examRecords = applyClassroomChanges(dedupeExamRecords(matchedRecords), roomChanges);
  const records = applyFullCentreSupervision(examRecords, matchedSupervisionRecords);
  await replaceExamData(params.pupilId, sourceFiles, records);

  const lastSyncAt = new Date().toISOString();
  const syncMessage = records.length > 0
    ? `已同步 ${records.length} 条考试记录${warnings.length ? `，另有 ${warnings.length} 条解析提醒` : ""}`
    : summarizeWarnings(warnings) || "已完成同步，但未匹配到当前学生的考试安排";

  await updateMicrosoftBindingSyncStatus(params.pupilId, "success", syncMessage, lastSyncAt);

  return {
    siteId: site.id,
    filesFound: fileItems.length,
    filesProcessed: sourceFiles.length,
    recordsCount: records.length,
    lastSyncAt,
    warnings,
  };
}
