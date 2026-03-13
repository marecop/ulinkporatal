import { type ReactNode } from "react";
import { PageTransition } from "../components/PageTransition";
import { StaggerContainer, StaggerItem } from "../components/MotionCard";
import { motion } from "motion/react";
import { useTheme, type ThemeMode, type AccentColor } from "../context/ThemeContext";
import { Sun, Moon, Monitor, Check, Sparkles, Globe, Image } from "lucide-react";

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

  return (
    <PageTransition>
      <StaggerContainer className="max-w-2xl mx-auto space-y-8 pb-16">
        <StaggerItem>
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>设置</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-secondary)" }}>自定义您的门户体验</p>
        </StaggerItem>

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
