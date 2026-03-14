import { useCallback, useEffect, useState } from "react";
import type { MicrosoftBindingStatus, SyncExamResponse } from "../types/exam";

export function useMicrosoftBinding() {
  const [status, setStatus] = useState<MicrosoftBindingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/microsoft/status", { credentials: "include" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json() as MicrosoftBindingStatus;
      setStatus(data);
      return data;
    } catch (err: any) {
      setError(err.message || "无法加载 Microsoft 绑定状态");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const unbind = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/microsoft/unbind", {
      method: "POST",
      credentials: "include",
    });

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
      const response = await fetch("/api/exams/sync", {
        method: "POST",
        credentials: "include",
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      sessionStorage.removeItem("examsData");
      sessionStorage.setItem("examsAutoSyncAt", String(Date.now()));
      await refresh();
      return payload as SyncExamResponse;
    } catch (err: any) {
      setError(err.message || "同步考试安排失败");
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
