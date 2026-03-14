import type {
  ExamSession,
  MatchedExamRecord,
  MatchedSupervisionRecord,
  RoomChangeRecord,
  SupervisionBlock,
} from "./types.js";
import { normalizeName, normalizeSubject } from "./utils.js";

function normalizeRoom(room: string) {
  return room.trim().toUpperCase();
}

function rawSessionContainsName(rawText: string, targetName: string) {
  const normalizedTarget = normalizeName(targetName);
  const normalizedRaw = normalizeName(rawText);
  return Boolean(normalizedTarget) && normalizedRaw.includes(normalizedTarget);
}

function calculateDurationMinutes(startTime: string, endTime: string) {
  const startMatch = startTime.match(/^(\d{2}):(\d{2})$/);
  const endMatch = endTime.match(/^(\d{2}):(\d{2})$/);
  if (!startMatch?.[1] || !startMatch[2] || !endMatch?.[1] || !endMatch[2]) {
    return undefined;
  }

  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
    return undefined;
  }

  return endMinutes - startMinutes;
}

function resolveNextExamRoom(seatNumber: string | undefined, block: SupervisionBlock) {
  const seat = Number(seatNumber ?? "");
  if (!Number.isFinite(seat)) return undefined;

  const match = block.seatRoomRules.find(rule => seat >= rule.startSeat && seat <= rule.endSeat);
  return match?.room;
}

function buildExamLabel(subject: string, paperName?: string) {
  return normalizeSubject([subject, paperName ?? ""].filter(Boolean).join(" "));
}

function tokenizeExamLabel(value: string) {
  return normalizeSubject(value)
    .split(" ")
    .filter(Boolean)
    .filter(token => !/^\d+$/.test(token))
    .filter(token => !/^r\d+$/i.test(token))
    .filter(token => !["paper", "and", "the", "of"].includes(token));
}

function labelsLooselyMatch(left: string, right: string) {
  const leftTokens = tokenizeExamLabel(left);
  const rightTokens = tokenizeExamLabel(right);
  if (!leftTokens.length || !rightTokens.length) {
    return false;
  }

  return rightTokens.every(token => leftTokens.includes(token))
    || leftTokens.every(token => rightTokens.includes(token))
    || leftTokens.filter(token => rightTokens.includes(token)).length >= Math.min(2, rightTokens.length);
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
      paperName: session.paperName || undefined,
      durationMinutes: calculateDurationMinutes(session.startTime, session.endTime),
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

export function buildMatchedSupervisionRecords(
  blocks: SupervisionBlock[],
  targetName: string,
  sourceDriveItemId: string,
  sourceFileName: string,
) {
  const normalizedTarget = normalizeName(targetName);
  if (!normalizedTarget) return [] as MatchedSupervisionRecord[];

  const matches: MatchedSupervisionRecord[] = [];

  for (const block of blocks) {
    const matchedStudent = block.students.find((student) => normalizeName(student.chineseName ?? "") === normalizedTarget);
    if (!matchedStudent && !rawSessionContainsName(block.rawText, targetName)) {
      continue;
    }

    matches.push({
      examDate: block.examDate,
      supervisionStartTime: block.supervisionStartTime,
      supervisionEndTime: block.supervisionEndTime,
      supervisionRoom: normalizeRoom(block.supervisionRoom),
      nextExamName: block.nextExamName,
      nextExamStartTime: block.nextExamStartTime,
      nextExamEndTime: block.nextExamEndTime,
      nextExamRoom: resolveNextExamRoom(matchedStudent?.seatNumber, block),
      matchedStudentName: matchedStudent?.chineseName ?? targetName,
      candidateNumber: matchedStudent?.candidateNumber,
      seatNumber: matchedStudent?.seatNumber,
      sourceDriveItemId,
      sourceFileName,
    });
  }

  const seen = new Set<string>();
  return matches.filter((record) => {
    const key = [
      record.examDate,
      record.supervisionStartTime,
      record.supervisionEndTime,
      normalizeSubject(record.nextExamName),
      record.nextExamRoom ?? "",
      record.candidateNumber ?? "",
      record.seatNumber ?? "",
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function applyFullCentreSupervision(records: MatchedExamRecord[], supervisionRecords: MatchedSupervisionRecord[]) {
  if (!supervisionRecords.length) return records;

  return records.map((record) => {
    const recordLabel = buildExamLabel(record.subject, record.paperName);
    const match = supervisionRecords.find((supervision) => {
      if (record.examDate !== supervision.examDate) return false;

      if (supervision.candidateNumber && record.candidateNumber && supervision.candidateNumber !== record.candidateNumber) {
        return false;
      }

      const startMatches = !supervision.nextExamStartTime || supervision.nextExamStartTime === record.startTime;
      const endMatches = !supervision.nextExamEndTime || supervision.nextExamEndTime === record.endTime;
      if (!startMatches || !endMatches) return false;

      const supervisionLabel = normalizeSubject(supervision.nextExamName);
      if (!supervisionLabel) return true;
      return recordLabel === supervisionLabel
        || recordLabel.includes(supervisionLabel)
        || supervisionLabel.includes(recordLabel)
        || labelsLooselyMatch(recordLabel, supervisionLabel);
    });

    if (!match) return record;

    return {
      ...record,
      supervisionStartTime: match.supervisionStartTime,
      supervisionEndTime: match.supervisionEndTime,
      supervisionRoom: match.supervisionRoom,
      nextExamName: match.nextExamName || [record.subject, record.paperName].filter(Boolean).join(" - "),
      nextExamRoom: match.nextExamRoom,
      nextExamStartTime: match.nextExamStartTime || record.startTime,
      nextExamEndTime: match.nextExamEndTime || record.endTime,
    };
  });
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
      normalizeSubject(record.paperName ?? ""),
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
