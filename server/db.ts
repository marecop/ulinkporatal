import { Pool, type PoolClient, type PoolConfig } from "pg";
import type { ExamFileKind, MatchedExamRecord } from "./exams/types.js";

export interface MicrosoftBindingRow {
  pupilId: string;
  microsoftEmail: string;
  microsoftUserId: string | null;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiresAt: string;
  scope: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamSourceFileInsert {
  driveItemId: string;
  fileName: string;
  webUrl?: string;
  mimeType?: string;
  etag?: string;
  lastModifiedAt?: string;
  sourceHash: string;
  parseStatus: string;
  parseMessage?: string;
  kind: ExamFileKind;
}

export interface StoredExamRecord {
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

export interface ExamScheduleStateRow {
  pupilId: string;
  sourceMode: string;
  lastRefreshedForDate: string | null;
  validUntil: string | null;
  lastRefreshAt: string | null;
  lastRefreshStatus: string | null;
  lastRefreshMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

let pool: Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

function useSsl(databaseUrl: string) {
  return !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
}

function getPoolConfig(databaseUrl: string): PoolConfig {
  return {
    connectionString: databaseUrl,
    ssl: useSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
    query_timeout: 8000,
    statement_timeout: 8000,
    idleTimeoutMillis: 30000,
  };
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool(getPoolConfig(process.env.DATABASE_URL));
  }

  return pool;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function ensureSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const client = await getPool().connect();
      try {
        await client.query(`
          create table if not exists microsoft_account_bindings (
            pupil_id text primary key,
            microsoft_email text not null,
            microsoft_user_id text,
            access_token_encrypted text not null,
            refresh_token_encrypted text not null,
            token_expires_at timestamptz not null,
            scope text,
            last_sync_at timestamptz,
            last_sync_status text,
            last_sync_message text,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          );
        `);

        await client.query(`
          create table if not exists exam_source_files (
            id bigserial primary key,
            pupil_id text not null,
            drive_item_id text not null,
            file_name text not null,
            source_kind text not null,
            web_url text,
            mime_type text,
            etag text,
            last_modified_at timestamptz,
            source_hash text not null,
            parse_status text not null default 'pending',
            parse_message text,
            downloaded_at timestamptz not null default now(),
            parsed_at timestamptz,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now(),
            unique (pupil_id, drive_item_id)
          );
        `);

        await client.query(`
          create table if not exists exam_records (
            id bigserial primary key,
            pupil_id text not null,
            source_file_id bigint references exam_source_files(id) on delete set null,
            source_drive_item_id text,
            source_file_name text,
            subject text not null,
            exam_date date not null,
            start_time text not null,
            end_time text not null,
            room text not null default '',
            matched_student_name text not null,
            candidate_number text,
            seat_number text,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          );
        `);

        await client.query(`
          alter table exam_records
          add column if not exists paper_name text,
          add column if not exists duration_minutes integer,
          add column if not exists supervision_start_time text,
          add column if not exists supervision_end_time text,
          add column if not exists supervision_room text,
          add column if not exists next_exam_name text,
          add column if not exists next_exam_room text,
          add column if not exists next_exam_start_time text,
          add column if not exists next_exam_end_time text;
        `);

        await client.query(`
          create table if not exists exam_schedule_states (
            pupil_id text primary key,
            source_mode text not null,
            last_refreshed_for_date date,
            valid_until date,
            last_refresh_at timestamptz,
            last_refresh_status text,
            last_refresh_message text,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          );
        `);

        await client.query("create index if not exists idx_exam_records_pupil_id on exam_records (pupil_id);");
        await client.query("create index if not exists idx_exam_records_exam_date on exam_records (exam_date);");
      } finally {
        client.release();
      }
    })();
  }

  await schemaReadyPromise;
}

function mapMicrosoftBinding(row: any): MicrosoftBindingRow {
  return {
    pupilId: row.pupil_id,
    microsoftEmail: row.microsoft_email,
    microsoftUserId: row.microsoft_user_id ?? null,
    accessTokenEncrypted: row.access_token_encrypted,
    refreshTokenEncrypted: row.refresh_token_encrypted,
    tokenExpiresAt: row.token_expires_at instanceof Date ? row.token_expires_at.toISOString() : String(row.token_expires_at),
    scope: row.scope ?? null,
    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at).toISOString() : null,
    lastSyncStatus: row.last_sync_status ?? null,
    lastSyncMessage: row.last_sync_message ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapExamRecord(row: any): StoredExamRecord {
  return {
    id: Number(row.id),
    pupilId: row.pupil_id,
    sourceDriveItemId: row.source_drive_item_id ?? null,
    sourceFileName: row.source_file_name ?? null,
    subject: row.subject,
    paperName: row.paper_name ?? null,
    durationMinutes: row.duration_minutes === null || row.duration_minutes === undefined ? null : Number(row.duration_minutes),
    examDate: row.exam_date instanceof Date
      ? row.exam_date.toISOString().slice(0, 10)
      : String(row.exam_date),
    startTime: row.start_time,
    endTime: row.end_time,
    room: row.room ?? "",
    supervisionStartTime: row.supervision_start_time ?? null,
    supervisionEndTime: row.supervision_end_time ?? null,
    supervisionRoom: row.supervision_room ?? null,
    nextExamName: row.next_exam_name ?? null,
    nextExamRoom: row.next_exam_room ?? null,
    nextExamStartTime: row.next_exam_start_time ?? null,
    nextExamEndTime: row.next_exam_end_time ?? null,
    matchedStudentName: row.matched_student_name,
    candidateNumber: row.candidate_number ?? null,
    seatNumber: row.seat_number ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapExamScheduleState(row: any): ExamScheduleStateRow {
  return {
    pupilId: row.pupil_id,
    sourceMode: row.source_mode,
    lastRefreshedForDate: row.last_refreshed_for_date
      ? (row.last_refreshed_for_date instanceof Date
        ? row.last_refreshed_for_date.toISOString().slice(0, 10)
        : String(row.last_refreshed_for_date))
      : null,
    validUntil: row.valid_until
      ? (row.valid_until instanceof Date ? row.valid_until.toISOString().slice(0, 10) : String(row.valid_until))
      : null,
    lastRefreshAt: row.last_refresh_at ? new Date(row.last_refresh_at).toISOString() : null,
    lastRefreshStatus: row.last_refresh_status ?? null,
    lastRefreshMessage: row.last_refresh_message ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getMicrosoftBinding(pupilId: string) {
  await ensureSchema();
  const result = await getPool().query("select * from microsoft_account_bindings where pupil_id = $1 limit 1", [pupilId]);
  return result.rows[0] ? mapMicrosoftBinding(result.rows[0]) : null;
}

export async function upsertMicrosoftBinding(input: {
  pupilId: string;
  microsoftEmail: string;
  microsoftUserId?: string | null;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiresAt: string;
  scope?: string | null;
}) {
  await ensureSchema();
  await getPool().query(`
    insert into microsoft_account_bindings (
      pupil_id,
      microsoft_email,
      microsoft_user_id,
      access_token_encrypted,
      refresh_token_encrypted,
      token_expires_at,
      scope,
      updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7, now())
    on conflict (pupil_id) do update set
      microsoft_email = excluded.microsoft_email,
      microsoft_user_id = excluded.microsoft_user_id,
      access_token_encrypted = excluded.access_token_encrypted,
      refresh_token_encrypted = excluded.refresh_token_encrypted,
      token_expires_at = excluded.token_expires_at,
      scope = excluded.scope,
      updated_at = now()
  `, [
    input.pupilId,
    input.microsoftEmail,
    input.microsoftUserId ?? null,
    input.accessTokenEncrypted,
    input.refreshTokenEncrypted,
    input.tokenExpiresAt,
    input.scope ?? null,
  ]);
}

export async function deleteMicrosoftBinding(pupilId: string) {
  await ensureSchema();
  await getPool().query("delete from exam_records where pupil_id = $1", [pupilId]);
  await getPool().query("delete from exam_source_files where pupil_id = $1", [pupilId]);
  await getPool().query("delete from exam_schedule_states where pupil_id = $1", [pupilId]);
  await getPool().query("delete from microsoft_account_bindings where pupil_id = $1", [pupilId]);
}

export async function clearExamData(pupilId: string) {
  await ensureSchema();
  await getPool().query("delete from exam_records where pupil_id = $1", [pupilId]);
  await getPool().query("delete from exam_source_files where pupil_id = $1", [pupilId]);
}

export async function updateMicrosoftBindingSyncStatus(
  pupilId: string,
  status: string,
  message?: string | null,
  lastSyncAt?: string | null,
) {
  await ensureSchema();
  await getPool().query(`
    update microsoft_account_bindings
    set last_sync_status = $2,
        last_sync_message = $3,
        last_sync_at = coalesce($4::timestamptz, last_sync_at),
        updated_at = now()
    where pupil_id = $1
  `, [pupilId, status, message ?? null, lastSyncAt ?? null]);
}

export async function listExamRecords(pupilId: string, options?: { from?: string; to?: string }) {
  await ensureSchema();
  const whereParts = ["pupil_id = $1"];
  const params: Array<string> = [pupilId];

  if (options?.from) {
    params.push(options.from);
    whereParts.push(`exam_date >= $${params.length}`);
  }

  if (options?.to) {
    params.push(options.to);
    whereParts.push(`exam_date <= $${params.length}`);
  }

  const result = await getPool().query(
    `select * from exam_records where ${whereParts.join(" and ")} order by exam_date asc, start_time asc, subject asc`,
    params,
  );

  return result.rows.map(mapExamRecord);
}

export async function getExamScheduleState(pupilId: string) {
  await ensureSchema();
  const result = await getPool().query("select * from exam_schedule_states where pupil_id = $1 limit 1", [pupilId]);
  return result.rows[0] ? mapExamScheduleState(result.rows[0]) : null;
}

export async function upsertExamScheduleState(input: {
  pupilId: string;
  sourceMode: string;
  lastRefreshedForDate?: string | null;
  validUntil?: string | null;
  lastRefreshAt?: string | null;
  lastRefreshStatus?: string | null;
  lastRefreshMessage?: string | null;
}) {
  await ensureSchema();
  await getPool().query(`
    insert into exam_schedule_states (
      pupil_id,
      source_mode,
      last_refreshed_for_date,
      valid_until,
      last_refresh_at,
      last_refresh_status,
      last_refresh_message,
      updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7, now())
    on conflict (pupil_id) do update set
      source_mode = excluded.source_mode,
      last_refreshed_for_date = excluded.last_refreshed_for_date,
      valid_until = excluded.valid_until,
      last_refresh_at = excluded.last_refresh_at,
      last_refresh_status = excluded.last_refresh_status,
      last_refresh_message = excluded.last_refresh_message,
      updated_at = now()
  `, [
    input.pupilId,
    input.sourceMode,
    input.lastRefreshedForDate ?? null,
    input.validUntil ?? null,
    input.lastRefreshAt ?? null,
    input.lastRefreshStatus ?? null,
    input.lastRefreshMessage ?? null,
  ]);
}

export async function replaceExamData(
  pupilId: string,
  sourceFiles: ExamSourceFileInsert[],
  records: MatchedExamRecord[],
) {
  return withTransaction(async (client) => {
    await client.query("delete from exam_records where pupil_id = $1", [pupilId]);
    await client.query("delete from exam_source_files where pupil_id = $1", [pupilId]);

    const sourceIds = new Map<string, number>();

    for (const source of sourceFiles) {
      const inserted = await client.query(`
        insert into exam_source_files (
          pupil_id,
          drive_item_id,
          file_name,
          source_kind,
          web_url,
          mime_type,
          etag,
          last_modified_at,
          source_hash,
          parse_status,
          parse_message,
          parsed_at,
          updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())
        returning id
      `, [
        pupilId,
        source.driveItemId,
        source.fileName,
        source.kind,
        source.webUrl ?? null,
        source.mimeType ?? null,
        source.etag ?? null,
        source.lastModifiedAt ?? null,
        source.sourceHash,
        source.parseStatus,
        source.parseMessage ?? null,
      ]);

      sourceIds.set(source.driveItemId, Number(inserted.rows[0].id));
    }

    for (const record of records) {
      await client.query(`
        insert into exam_records (
          pupil_id,
          source_file_id,
          source_drive_item_id,
          source_file_name,
          subject,
          paper_name,
          duration_minutes,
          exam_date,
          start_time,
          end_time,
          room,
          supervision_start_time,
          supervision_end_time,
          supervision_room,
          next_exam_name,
          next_exam_room,
          next_exam_start_time,
          next_exam_end_time,
          matched_student_name,
          candidate_number,
          seat_number,
          updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, now())
      `, [
        pupilId,
        sourceIds.get(record.sourceDriveItemId) ?? null,
        record.sourceDriveItemId,
        record.sourceFileName,
        record.subject,
        record.paperName ?? null,
        record.durationMinutes ?? null,
        record.examDate,
        record.startTime,
        record.endTime,
        record.room ?? "",
        record.supervisionStartTime ?? null,
        record.supervisionEndTime ?? null,
        record.supervisionRoom ?? null,
        record.nextExamName ?? null,
        record.nextExamRoom ?? null,
        record.nextExamStartTime ?? null,
        record.nextExamEndTime ?? null,
        record.matchedStudentName,
        record.candidateNumber ?? null,
        record.seatNumber ?? null,
      ]);
    }
  });
}
