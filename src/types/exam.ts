export interface MicrosoftBindingStatus {
  configured: boolean;
  databaseConfigured?: boolean;
  microsoftConfigured?: boolean;
  tokenEncryptionConfigured?: boolean;
  bound: boolean;
  bindingStatusKnown?: boolean;
  pupilResolved?: boolean;
  pupilId?: string;
  email?: string | null;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncMessage?: string | null;
}

export interface ExamRecord {
  id: number;
  pupilId: string;
  sourceDriveItemId: string | null;
  sourceFileName: string | null;
  subject: string;
  paperName: string | null;
  durationMinutes: number | null;
  examDate: string;
  startTime: string;
  endTime: string;
  room: string;
  supervisionStartTime: string | null;
  supervisionEndTime: string | null;
  supervisionRoom: string | null;
  nextExamName: string | null;
  nextExamRoom: string | null;
  nextExamStartTime: string | null;
  nextExamEndTime: string | null;
  matchedStudentName: string;
  candidateNumber: string | null;
  seatNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamsResponse extends MicrosoftBindingStatus {
  exams: ExamRecord[];
}

export interface SyncExamResponse {
  success: boolean;
  siteId: string;
  filesFound: number;
  filesProcessed: number;
  recordsCount: number;
  lastSyncAt: string;
  warnings: string[];
}
