import { useCallback, useEffect, useState } from "react";
import type { MicrosoftBindingStatus, SyncExamResponse } from "../types/exam";

const STATUS_TIMEOUT_MS = 10000;
const MUTATION_TIMEOUT_MS = 15000;
const SYNC_TIMEOUT_MS = 120000;

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

export function useMicrosoftBinding() {
  const [status, setStatus] = useState<MicrosoftBindingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchJsonWithTimeout("/api/microsoft/status", { credentials: "include" }, STATUS_TIMEOUT_MS);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json() as MicrosoftBindingStatus;
      setStatus(data);
      return data;
    } catch (err: any) {
      const message = err.name === "AbortError"
        ? "Microsoft 绑定状态请求超时"
        : (err.message || "无法加载 Microsoft 绑定状态");
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const unbind = useCallback(async () => {
    setError(null);
    const response = await fetchJsonWithTimeout("/api/microsoft/unbind", {
      method: "POST",
      credentials: "include",
    }, MUTATION_TIMEOUT_MS);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    sessionStorage.removeItem("examsData");
    sessionStorage.removeItem("examsAutoSyncAt");
    await refresh();
  }, [refresh]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetchJsonWithTimeout("/api/exams/sync", {
        method: "POST",
        credentials: "include",
      }, SYNC_TIMEOUT_MS);

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      sessionStorage.removeItem("examsData");
      sessionStorage.setItem("examsAutoSyncAt", String(Date.now()));
      await refresh();
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
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    status,
    loading,
    syncing,
    error,
    refresh,
    unbind,
    syncNow,
  };
}
