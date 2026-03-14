export type ExamFileKind = "attendance" | "classroom-change";

export interface DownloadedGraphFile {
  id: string;
  driveId: string;
  driveName?: string;
  name: string;
  webUrl?: string;
  mimeType?: string;
  etag?: string;
  lastModifiedDateTime?: string;
  kind: ExamFileKind;
  buffer: Buffer;
}

export interface ParsedStudentRow {
  seatNumber?: string;
  homeroom?: string;
  candidateNumber?: string;
  chineseName?: string;
  passportName?: string;
  englishName?: string;
  rawText: string;
}

export interface ExamSession {
  subject: string;
  examDate: string;
  startTime: string;
  endTime: string;
  room: string;
  students: ParsedStudentRow[];
  rawText: string;
  sourceLabel?: string;
}

export interface ParsedAttendanceResult {
  kind: "attendance";
  sessions: ExamSession[];
  warnings: string[];
}

export interface RoomChangeRecord {
  subject: string;
  examDate: string;
  startTime: string;
  endTime: string;
  room: string;
  rawText: string;
}

export interface ParsedClassroomChangeResult {
  kind: "classroom-change";
  changes: RoomChangeRecord[];
  warnings: string[];
}

export interface MatchedExamRecord {
  subject: string;
  examDate: string;
  startTime: string;
  endTime: string;
  room: string;
  matchedStudentName: string;
  candidateNumber?: string;
  seatNumber?: string;
  sourceDriveItemId: string;
  sourceFileName: string;
}
