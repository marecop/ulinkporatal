import type { ExamSession, MatchedExamRecord, RoomChangeRecord } from "./types.js";
import { normalizeName, normalizeSubject } from "./utils.js";

function normalizeRoom(room: string) {
  return room.trim().toUpperCase();
}

function rawSessionContainsName(rawText: string, targetName: string) {
  const normalizedTarget = normalizeName(targetName);
  const normalizedRaw = normalizeName(rawText);
  return Boolean(normalizedTarget) && normalizedRaw.includes(normalizedTarget);
}

export function buildMatchedExamRecords(
  sessions: ExamSession[],
  targetName: string,
  sourceDriveItemId: string,
  sourceFileName: string,
) {
  const normalizedTarget = normalizeName(targetName);
  if (!normalizedTarget) return [] as MatchedExamRecord[];

  const matches: MatchedExamRecord[] = [];

  for (const session of sessions) {
    const matchedStudent = session.students.find((student) => normalizeName(student.chineseName ?? "") === normalizedTarget);

    if (!matchedStudent && !rawSessionContainsName(session.rawText, targetName)) {
      continue;
    }

    matches.push({
      subject: session.subject,
      examDate: session.examDate,
      startTime: session.startTime,
      endTime: session.endTime,
      room: normalizeRoom(session.room),
      matchedStudentName: matchedStudent?.chineseName ?? targetName,
      candidateNumber: matchedStudent?.candidateNumber,
      seatNumber: matchedStudent?.seatNumber,
      sourceDriveItemId,
      sourceFileName,
    });
  }

  return dedupeExamRecords(matches);
}

export function applyClassroomChanges(records: MatchedExamRecord[], changes: RoomChangeRecord[]) {
  if (!changes.length) return records;

  return records.map((record) => {
    const subjectKey = normalizeSubject(record.subject);

    const override = changes.find((change) => {
      if (record.examDate !== change.examDate) return false;

      const changeSubjectKey = normalizeSubject(change.subject);
      const subjectMatches = subjectKey === changeSubjectKey
        || subjectKey.includes(changeSubjectKey)
        || changeSubjectKey.includes(subjectKey);

      if (!subjectMatches) return false;

      const startMatches = !change.startTime || change.startTime === record.startTime;
      const endMatches = !change.endTime || change.endTime === record.endTime;
      return startMatches && endMatches;
    });

    if (!override) return record;

    return {
      ...record,
      room: override.room || record.room,
      startTime: override.startTime || record.startTime,
      endTime: override.endTime || record.endTime,
    };
  });
}

export function dedupeExamRecords(records: MatchedExamRecord[]) {
  const seen = new Set<string>();
  const deduped: MatchedExamRecord[] = [];

  for (const record of records) {
    const key = [
      record.examDate,
      record.startTime,
      record.endTime,
      normalizeSubject(record.subject),
      normalizeRoom(record.room),
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(record);
  }

  return deduped.sort((left, right) => {
    const leftKey = `${left.examDate} ${left.startTime}`;
    const rightKey = `${right.examDate} ${right.startTime}`;
    return leftKey.localeCompare(rightKey);
  });
}
