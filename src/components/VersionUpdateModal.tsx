import { AnimatePresence, motion } from "motion/react";
import { BookOpen, BellRing, Check, EyeOff } from "lucide-react";
import type { CurrentReleaseMeta } from "../lib/appMeta";

interface VersionUpdateModalProps {
  open: boolean;
  release: CurrentReleaseMeta;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onReadMore: () => void;
  onDismiss: () => void;
}

export default function VersionUpdateModal({
  open,
  release,
  saving,
  error,
  onConfirm,
  onReadMore,
  onDismiss,
}: VersionUpdateModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed inset-x-4 top-1/2 z-[71] mx-auto w-full max-w-xl -translate-y-1/2 rounded-3xl border p-5 sm:p-6"
            style={{
              background: "var(--bg-primary)",
              borderColor: "var(--border)",
              boxShadow: "var(--card-shadow-hover)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="version-update-title"
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                <BellRing className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold tracking-[0.18em] uppercase" style={{ color: "var(--text-tertiary)" }}>
                  Version Update
                </p>
                <h2 id="version-update-title" className="mt-1 text-[24px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {release.displayVersion}
                </h2>
                <p className="mt-2 text-[14px] leading-6" style={{ color: "var(--text-secondary)" }}>
                  {release.aboutParagraphs[1]}
                </p>
                <p className="mt-2 text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  发布时间：{release.publishedAt}
                </p>
              </div>
            </div>

            <div
              className="mt-5 rounded-2xl border p-4"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
            >
              <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                <BookOpen className="h-4 w-4" />
                更新日志
              </div>
              <ul className="space-y-2">
                {release.modalHighlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] leading-6" style={{ color: "var(--text-secondary)" }}>
                    <span
                      className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div
                className="mt-4 rounded-2xl px-4 py-3 text-[12px] font-medium"
                style={{ background: "rgba(255,59,48,0.08)", color: "var(--danger)" }}
              >
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <motion.button
                type="button"
                onClick={onConfirm}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold"
                style={{ background: "var(--gradient-primary)", color: "#fff" }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Check className="h-4 w-4" />
                确定
              </motion.button>

              <motion.button
                type="button"
                onClick={onReadMore}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <BookOpen className="h-4 w-4" />
                阅读更多
              </motion.button>

              <motion.button
                type="button"
                onClick={onDismiss}
                disabled={saving}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                whileHover={{ scale: saving ? 1 : 1.01 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
              >
                <EyeOff className="h-4 w-4" />
                {saving ? "保存中..." : "不再提示"}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
