import crypto from "node:crypto";
import { replaceExamData, updateMicrosoftBindingSyncStatus, type ExamSourceFileInsert } from "../db.ts";
import { downloadGraphFile, resolveSharePointSite, searchExamFiles } from "../microsoft/graph.ts";
import { applyClassroomChanges, buildMatchedExamRecords, dedupeExamRecords } from "./matcher.ts";
import { parseAttendanceFile } from "./parsers/attendance.ts";
import { parseClassroomChangeFile } from "./parsers/classroomChange.ts";

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
  const roomChanges = [];

  for (const item of fileItems) {
    const downloaded = await downloadGraphFile(params.accessToken, site.id, item);
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
        const parsed = await parseAttendanceFile(downloaded);
        warnings.push(...parsed.warnings);
        matchedRecords.push(...buildMatchedExamRecords(parsed.sessions, targetName, downloaded.id, downloaded.name));
        sourceFiles.push({
          ...sourceBase,
          parseStatus: parsed.sessions.length > 0 ? "parsed" : "empty",
          parseMessage: parsed.warnings[0],
        });
      } else {
        const parsed = await parseClassroomChangeFile(downloaded);
        warnings.push(...parsed.warnings);
        roomChanges.push(...parsed.changes);
        sourceFiles.push({
          ...sourceBase,
          parseStatus: parsed.changes.length > 0 ? "parsed" : "empty",
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

  const records = applyClassroomChanges(dedupeExamRecords(matchedRecords), roomChanges);
  await replaceExamData(params.pupilId, sourceFiles, records);

  const lastSyncAt = new Date().toISOString();
  const syncMessage = records.length > 0
    ? `已同步 ${records.length} 条考试记录`
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
