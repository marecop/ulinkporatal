export interface MicrosoftBindingStatus {
  configured: boolean;
  databaseConfigured?: boolean;
  microsoftConfigured?: boolean;
  tokenEncryptionConfigured?: boolean;
  bound: boolean;
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
  examDate: string;
  startTime: string;
  endTime: string;
  room: string;
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
