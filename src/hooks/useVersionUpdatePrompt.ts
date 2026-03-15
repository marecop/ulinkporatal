import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildVersionSeenStorageKey, CURRENT_RELEASE } from "../lib/appMeta";
import { redirectToLogin } from "../lib/auth";

interface VersionUpdateStatusResponse {
  pupilId: string;
  version: string;
  dismissed: boolean;
}

function markSeen(pupilId: string, version: string) {
  localStorage.setItem(buildVersionSeenStorageKey(pupilId, version), "1");
}

function hasSeenVersion(pupilId: string, version: string) {
  return localStorage.getItem(buildVersionSeenStorageKey(pupilId, version)) === "1";
}

export function useVersionUpdatePrompt(enabled: boolean) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pupilId, setPupilId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const checkUpdateStatus = async () => {
      try {
        const response = await fetch("/api/version-updates/status", {
          credentials: "include",
        });

        if (response.status === 401) {
          redirectToLogin();
          return;
        }

        if (!response.ok) {
          return;
        }

        const payload = await response.json() as VersionUpdateStatusResponse;
        if (cancelled) return;

        setPupilId(payload.pupilId);
        if (!payload.dismissed && !hasSeenVersion(payload.pupilId, payload.version)) {
          setOpen(true);
        }
      } catch {
        // 版本提示讀取失敗不應阻塞整個應用。
      }
    };

    void checkUpdateStatus();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const handleConfirm = useCallback(() => {
    if (pupilId) {
      markSeen(pupilId, CURRENT_RELEASE.versionKey);
    }
    setOpen(false);
  }, [pupilId]);

  const handleReadMore = useCallback(() => {
    if (pupilId) {
      markSeen(pupilId, CURRENT_RELEASE.versionKey);
    }
    setOpen(false);
    navigate(CURRENT_RELEASE.readMorePath);
  }, [navigate, pupilId]);

  const handleDismiss = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/version-updates/dismiss", {
        method: "POST",
        credentials: "include",
      });

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "无法保存版本提示状态");
      }

      if (pupilId) {
        markSeen(pupilId, CURRENT_RELEASE.versionKey);
      }
      setOpen(false);
    } catch (dismissError: any) {
      setError(dismissError.message || "无法保存“不再提示”状态，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }, [pupilId]);

  return {
    open,
    error,
    saving,
    release: CURRENT_RELEASE,
    handleConfirm,
    handleReadMore,
    handleDismiss,
  };
}
