import { useCallback, useEffect, useState } from "react";
import type { ExamsResponse, SyncExamResponse } from "../types/exam";

const EXAMS_CACHE_KEY = "examsData";
const EXAMS_AUTO_SYNC_KEY = "examsAutoSyncAt";
const AUTO_SYNC_COOLDOWN_MS = 15 * 60 * 1000;
const READ_FETCH_TIMEOUT_MS = 15000;
const SYNC_FETCH_TIMEOUT_MS = 120000;

function getCurrentLocalDate() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(EXAMS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { localDate?: string; data?: ExamsResponse };
    if (!parsed || parsed.localDate !== getCurrentLocalDate() || !parsed.data) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: ExamsResponse) {
  sessionStorage.setItem(EXAMS_CACHE_KEY, JSON.stringify({
    localDate: getCurrentLocalDate(),
    data,
  }));
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

async function fetchJsonWithTimeout(url: string, init: RequestInit | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    window.clearTimeout(timer);
  }
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
      const response = await fetchJsonWithTimeout("/api/exams/sync", {
        method: "POST",
        credentials: "include",
      }, SYNC_FETCH_TIMEOUT_MS);

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      sessionStorage.removeItem(EXAMS_CACHE_KEY);
      markAutoSyncAttempt();
      return payload as SyncExamResponse;
    } catch (err: any) {
      const message = err.name === "AbortError"
        ? "同步考试安排超时，请稍后重试"
        : (err.message || "同步考试安排失败");
      setError(message);
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
      const today = getCurrentLocalDate();
      const response = await fetchJsonWithTimeout(
        `/api/exams?today=${encodeURIComponent(today)}&from=${encodeURIComponent(today)}`,
        { credentials: "include" },
        READ_FETCH_TIMEOUT_MS,
      );
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
      const message = err.name === "AbortError"
        ? "考试安排请求超时"
        : (err.message || "无法加载考试安排");
      setError(message);
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
