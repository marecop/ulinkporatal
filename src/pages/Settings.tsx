import { type ReactNode, useMemo } from "react";
import { PageTransition } from "../components/PageTransition";
import { StaggerContainer, StaggerItem } from "../components/MotionCard";
import { motion } from "motion/react";
import { useTheme, type ThemeMode, type AccentColor } from "../context/ThemeContext";
import { Sun, Moon, Monitor, Check, Sparkles, Globe, Image, Link2, RefreshCw, Unplug, AlertCircle, Cloud } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useMicrosoftBinding } from "../hooks/useMicrosoftBinding";

const themeModes: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "浅色", icon: Sun },
  { id: "dark", label: "深色", icon: Moon },
  { id: "system", label: "跟随系统", icon: Monitor },
];

const accentColors: { id: AccentColor; label: string; lightColor: string; darkColor: string }[] = [
  { id: "blue", label: "蓝色", lightColor: "#0071e3", darkColor: "#0a84ff" },
  { id: "purple", label: "紫色", lightColor: "#7c3aed", darkColor: "#8b5cf6" },
  { id: "pink", label: "粉色", lightColor: "#db2777", darkColor: "#ec4899" },
  { id: "cyan", label: "青色", lightColor: "#0891b2", darkColor: "#06b6d4" },
  { id: "gold", label: "金色", lightColor: "#d97706", darkColor: "#f59e0b" },
];

export default function Settings() {
  const { theme, themeMode, accentColor, animationsEnabled, setThemeMode, setAccentColor, setAnimationsEnabled } = useTheme();
  const [searchParams] = useSearchParams();
  const { status: microsoftStatus, loading: microsoftLoading, syncing: microsoftSyncing, error: microsoftError, unbind, syncNow } = useMicrosoftBinding();

  const microsoftBanner = useMemo(() => {
    const state = searchParams.get("ms");
    if (!state) return null;

    const reason = searchParams.get("reason");
    const messages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
      connected: { tone: "success", text: "Microsoft 账号已成功绑定，可开始同步考试安排。" },
      "config-error": { tone: "warning", text: "Microsoft 集成尚未完成配置，请先补齐服务器环境变量与数据库。" },
      "portal-auth-required": { tone: "warning", text: "当前门户登录已失效，请重新登录后再绑定 Microsoft 账号。" },
      "state-error": { tone: "danger", text: "Microsoft 授权状态校验失败，请重新发起绑定。" },
      "oauth-error": { tone: "danger", text: `Microsoft 授权失败${reason ? `：${reason}` : ""}` },
      "connect-error": { tone: "danger", text: `无法发起 Microsoft 授权${reason ? `：${reason}` : ""}` },
      "callback-error": { tone: "danger", text: `Microsoft 回调处理失败${reason ? `：${reason}` : ""}` },
    };

    return messages[state] ?? null;
  }, [searchParams]);

  const handleMicrosoftConnect = () => {
    window.location.href = "/api/microsoft/connect";
  };

  const handleMicrosoftUnbind = async () => {
    try {
      await unbind();
    } catch {
      // hook state already captures errors
    }
  };

  const handleSync = async () => {
    try {
      await syncNow();
    } catch {
      // hook state already captures errors
    }
  };

  return (
    <PageTransition>
      <StaggerContainer className="max-w-2xl mx-auto space-y-8 pb-16">
        <StaggerItem>
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>设置</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-secondary)" }}>自定义您的门户体验</p>
        </StaggerItem>

        {microsoftBanner && (
          <StaggerItem>
            <div
              className="rounded-2xl border px-4 py-3 flex items-start gap-3"
              style={{
                background: microsoftBanner.tone === "success" ? "rgba(52,199,89,0.08)" : microsoftBanner.tone === "warning" ? "rgba(255,149,0,0.08)" : "rgba(255,59,48,0.08)",
                borderColor: microsoftBanner.tone === "success" ? "rgba(52,199,89,0.22)" : microsoftBanner.tone === "warning" ? "rgba(255,149,0,0.22)" : "rgba(255,59,48,0.22)",
                color: microsoftBanner.tone === "success" ? "#34c759" : microsoftBanner.tone === "warning" ? "#ff9500" : "var(--danger)",
              }}
            >
              <AlertCircle className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
              <p className="text-[13px] font-medium leading-6">{microsoftBanner.text}</p>
            </div>
          </StaggerItem>
        )}

        {/* Theme Mode */}
        <StaggerItem>
          <SettingsSection title="主题" description="选择界面的外观模式">
            <div className="grid grid-cols-3 gap-2">
              {themeModes.map(mode => {
                const active = themeMode === mode.id;
                return (
                  <motion.button
                    key={mode.id}
                    onClick={() => setThemeMode(mode.id)}
                    className="relative flex flex-col items-center gap-2.5 px-4 py-5 rounded-2xl border transition-colors"
                    style={{
                      background: active ? "var(--accent-soft)" : "var(--bg-secondary)",
                      borderColor: active ? "var(--accent)" : "var(--border)",
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    {active && (
                      <motion.div
                        layoutId="theme-indicator"
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "var(--accent)" }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    <mode.icon className="w-6 h-6" style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }} />
                    <span className="text-[13px] font-semibold" style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}>
                      {mode.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </SettingsSection>
        </StaggerItem>

        {/* Accent Color */}
        <StaggerItem>
          <SettingsSection title="强调色" description="选择界面的主色调">
            <div className="flex gap-3">
              {accentColors.map(color => {
                const active = accentColor === color.id;
                const displayColor = theme === "dark" ? color.darkColor : color.lightColor;
                return (
                  <motion.button
                    key={color.id}
                    onClick={() => setAccentColor(color.id)}
                    className="group flex flex-col items-center gap-2"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <div
                      className="relative w-10 h-10 rounded-full transition-shadow duration-300"
                      style={{
                        background: displayColor,
                        boxShadow: active
                          ? `0 0 0 3px var(--bg-primary), 0 0 0 5px ${displayColor}, 0 0 20px ${displayColor}40`
                          : `0 0 0 2px transparent`,
                      }}
                    >
                      {active && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                      {color.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </SettingsSection>
        </StaggerItem>

        {/* Animations */}
        <StaggerItem>
          <SettingsSection title="动画效果" description="控制界面过渡和动画效果">
            <ToggleRow
              icon={Sparkles}
              label="启用动画"
              description="页面过渡、卡片悬停、交错出现效果"
              checked={animationsEnabled}
              onChange={setAnimationsEnabled}
            />
          </SettingsSection>
        </StaggerItem>

        <StaggerItem>
          <SettingsSection title="Microsoft 账号绑定（用于获取考试信息）" description="绑定后可从学校 SharePoint 自动同步当前学生的考试安排">
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent-soft)" }}
                >
                  <Cloud className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    {microsoftLoading
                      ? "正在检查绑定状态"
                      : microsoftStatus?.bound
                        ? (microsoftStatus.email || "已绑定 Microsoft 账号")
                        : "未绑定 Microsoft 账号"}
                  </p>
                  <p className="text-[11px] leading-5" style={{ color: "var(--text-tertiary)" }}>
                    {!microsoftStatus?.configured
                      ? "服务器尚未完成 Microsoft / 数据库配置。"
                      : microsoftStatus?.bound
                        ? `最近同步：${microsoftStatus.lastSyncAt ? new Date(microsoftStatus.lastSyncAt).toLocaleString("zh-CN") : "尚未同步"}${microsoftStatus.lastSyncMessage ? ` · ${microsoftStatus.lastSyncMessage}` : ""}`
                        : "绑定后系统会通过 Microsoft Graph 读取 SharePoint 中的考试文件。"}
                  </p>
                </div>
                <span
                  className="text-[11px] px-2 py-1 rounded-full font-semibold flex-shrink-0"
                  style={{
                    background: microsoftStatus?.bound ? "var(--accent-soft)" : "var(--bg-tertiary)",
                    color: microsoftStatus?.bound ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {microsoftStatus?.bound ? "已绑定" : "未绑定"}
                </span>
              </div>

              {microsoftError && (
                <div className="px-4 py-3 rounded-xl text-[12px] font-medium" style={{ background: "rgba(255,59,48,0.08)", color: "var(--danger)" }}>
                  {microsoftError}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {!microsoftStatus?.bound ? (
                  <ActionButton icon={Link2} onClick={handleMicrosoftConnect} disabled={microsoftLoading || !microsoftStatus?.configured}>
                    绑定 Microsoft 账号
                  </ActionButton>
                ) : (
                  <>
                    <ActionButton icon={RefreshCw} onClick={handleSync} disabled={microsoftSyncing}>
                      {microsoftSyncing ? "同步中..." : "立即同步考试安排"}
                    </ActionButton>
                    <ActionButton icon={Link2} onClick={handleMicrosoftConnect} variant="secondary">
                      重新绑定
                    </ActionButton>
                    <ActionButton icon={Unplug} onClick={handleMicrosoftUnbind} variant="danger">
                      解绑
                    </ActionButton>
                  </>
                )}
              </div>
            </div>
          </SettingsSection>
        </StaggerItem>

        {/* Language (placeholder) */}
        <StaggerItem>
          <SettingsSection title="语言" description="界面显示语言设置">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
              <Globe className="w-5 h-5" style={{ color: "var(--text-tertiary)" }} />
              <div className="flex-1">
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>简体中文</p>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>更多语言即将推出</p>
              </div>
              <span className="text-[11px] px-2 py-1 rounded-full font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                当前
              </span>
            </div>
          </SettingsSection>
        </StaggerItem>

        {/* Background (placeholder) */}
        <StaggerItem>
          <SettingsSection title="背景" description="自定义门户背景主题">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
              <Image className="w-5 h-5" style={{ color: "var(--text-tertiary)" }} />
              <div className="flex-1">
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>默认背景</p>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>自定义背景功能即将推出</p>
              </div>
              <span className="text-[11px] px-2 py-1 rounded-full font-semibold" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                即将推出
              </span>
            </div>
          </SettingsSection>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-6 space-y-4"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
    >
      <div>
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h3>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{description}</p>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }: {
  icon: typeof Sparkles;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors"
      style={{ background: "var(--bg-secondary)" }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" style={{ color: checked ? "var(--accent)" : "var(--text-tertiary)" }} />
      <div className="flex-1 text-left">
        <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{description}</p>
      </div>
      <motion.div
        className="w-11 h-6 rounded-full p-0.5 flex-shrink-0 cursor-pointer"
        style={{ background: checked ? "var(--accent)" : "var(--bg-tertiary)" }}
        animate={{ background: checked ? "var(--accent)" : "var(--bg-tertiary)" }}
      >
        <motion.div
          className="w-5 h-5 rounded-full bg-white"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.div>
    </button>
  );
}

function ActionButton({
  icon: Icon,
  children,
  onClick,
  disabled = false,
  variant = "primary",
}: {
  icon: typeof Link2;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const palette = variant === "primary"
    ? { background: "var(--accent)", color: "#fff", borderColor: "transparent" }
    : variant === "danger"
      ? { background: "rgba(255,59,48,0.08)", color: "var(--danger)", borderColor: "rgba(255,59,48,0.16)" }
      : { background: "var(--bg-secondary)", color: "var(--text-primary)", borderColor: "var(--border)" };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      style={palette}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Icon className="w-4 h-4" />
      {children}
    </motion.button>
  );
}
