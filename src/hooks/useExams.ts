import { useCallback, useEffect, useState } from "react";
import type { ExamsResponse, SyncExamResponse } from "../types/exam";

const EXAMS_CACHE_KEY = "examsData";
const EXAMS_AUTO_SYNC_KEY = "examsAutoSyncAt";
const AUTO_SYNC_COOLDOWN_MS = 15 * 60 * 1000;

function readCache() {
  try {
    const raw = sessionStorage.getItem(EXAMS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ExamsResponse;
  } catch {
    return null;
  }
}

function writeCache(data: ExamsResponse) {
  sessionStorage.setItem(EXAMS_CACHE_KEY, JSON.stringify(data));
}

function shouldAutoSync(data: ExamsResponse) {
  return data.configured
    && data.bound
    && (!data.lastSyncAt || data.lastSyncStatus === "error" || data.exams.length === 0);
}

function canRunAutoSync() {
  const lastAttemptRaw = sessionStorage.getItem(EXAMS_AUTO_SYNC_KEY);
  if (!lastAttemptRaw) return true;
  const lastAttempt = Number(lastAttemptRaw);
  return !Number.isFinite(lastAttempt) || Date.now() - lastAttempt > AUTO_SYNC_COOLDOWN_MS;
}

function markAutoSyncAttempt() {
  sessionStorage.setItem(EXAMS_AUTO_SYNC_KEY, String(Date.now()));
}

export function useExams(options?: { autoSync?: boolean }) {
  const autoSync = options?.autoSync ?? false;
  const [data, setData] = useState<ExamsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/exams/sync", {
        method: "POST",
        credentials: "include",
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      sessionStorage.removeItem(EXAMS_CACHE_KEY);
      markAutoSyncAttempt();
      return payload as SyncExamResponse;
    } catch (err: any) {
      setError(err.message || "同步考试安排失败");
      throw err;
    } finally {
      setSyncing(false);
    }
  }, []);

  const refresh = useCallback(async (forceFresh = false, allowAutoSync = autoSync) => {
    setLoading(true);
    setError(null);

    if (!forceFresh) {
      const cached = readCache();
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    }

    try {
      const response = await fetch("/api/exams", { credentials: "include" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json() as ExamsResponse;
      setData(payload);
      writeCache(payload);

      if (allowAutoSync && shouldAutoSync(payload) && canRunAutoSync()) {
        markAutoSyncAttempt();
        await syncNow();
        return refresh(true, false);
      }

      return payload;
    } catch (err: any) {
      setError(err.message || "无法加载考试安排");
      return null;
    } finally {
      setLoading(false);
    }
  }, [autoSync, syncNow]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    loading,
    syncing,
    error,
    refresh,
    syncNow,
  };
}
