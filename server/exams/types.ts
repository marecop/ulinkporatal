export type ExamFileKind = "attendance" | "classroom-change" | "full-centre-supervision";

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
  paperName: string;
  paperCode?: string;
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

export interface SupervisionSeatRoomRule {
  startSeat: number;
  endSeat: number;
  room: string;
}

export interface SupervisionBlock {
  examDate: string;
  supervisionStartTime: string;
  supervisionEndTime: string;
  supervisionRoom: string;
  nextExamName: string;
  nextExamStartTime: string;
  nextExamEndTime: string;
  seatRoomRules: SupervisionSeatRoomRule[];
  students: ParsedStudentRow[];
  rawText: string;
  sourceLabel?: string;
}

export interface ParsedFullCentreSupervisionResult {
  kind: "full-centre-supervision";
  blocks: SupervisionBlock[];
  warnings: string[];
}

export interface MatchedSupervisionRecord {
  examDate: string;
  supervisionStartTime: string;
  supervisionEndTime: string;
  supervisionRoom: string;
  nextExamName: string;
  nextExamStartTime: string;
  nextExamEndTime: string;
  nextExamRoom?: string;
  matchedStudentName: string;
  candidateNumber?: string;
  seatNumber?: string;
  sourceDriveItemId: string;
  sourceFileName: string;
}

export interface MatchedExamRecord {
  subject: string;
  paperName?: string;
  durationMinutes?: number;
  examDate: string;
  startTime: string;
  endTime: string;
  room: string;
  supervisionStartTime?: string;
  supervisionEndTime?: string;
  supervisionRoom?: string;
  nextExamName?: string;
  nextExamRoom?: string;
  nextExamStartTime?: string;
  nextExamEndTime?: string;
  matchedStudentName: string;
  candidateNumber?: string;
  seatNumber?: string;
  sourceDriveItemId: string;
  sourceFileName: string;
}
