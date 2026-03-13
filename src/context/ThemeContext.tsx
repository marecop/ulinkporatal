import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = "blue" | "purple" | "pink" | "cyan" | "gold";

interface ThemeContextType {
  theme: "light" | "dark";
  themeMode: ThemeMode;
  accentColor: AccentColor;
  animationsEnabled: boolean;
  toggleTheme: () => void;
  setTheme: (t: "light" | "dark") => void;
  setThemeMode: (m: ThemeMode) => void;
  setAccentColor: (c: AccentColor) => void;
  setAnimationsEnabled: (v: boolean) => void;
}

const accentPalettes: Record<AccentColor, Record<"light" | "dark", { accent: string; hover: string; soft: string; glowRgb: string }>> = {
  blue: {
    light: { accent: "#0071e3", hover: "#0077ed", soft: "rgba(0,113,227,0.08)", glowRgb: "0,113,227" },
    dark: { accent: "#0a84ff", hover: "#409cff", soft: "rgba(10,132,255,0.10)", glowRgb: "10,132,255" },
  },
  purple: {
    light: { accent: "#7c3aed", hover: "#6d28d9", soft: "rgba(124,58,237,0.08)", glowRgb: "124,58,237" },
    dark: { accent: "#8b5cf6", hover: "#a78bfa", soft: "rgba(139,92,246,0.10)", glowRgb: "139,92,246" },
  },
  pink: {
    light: { accent: "#db2777", hover: "#be185d", soft: "rgba(219,39,119,0.08)", glowRgb: "219,39,119" },
    dark: { accent: "#ec4899", hover: "#f472b6", soft: "rgba(236,72,153,0.10)", glowRgb: "236,72,153" },
  },
  cyan: {
    light: { accent: "#0891b2", hover: "#0e7490", soft: "rgba(8,145,178,0.08)", glowRgb: "8,145,178" },
    dark: { accent: "#06b6d4", hover: "#22d3ee", soft: "rgba(6,182,212,0.10)", glowRgb: "6,182,212" },
  },
  gold: {
    light: { accent: "#d97706", hover: "#b45309", soft: "rgba(217,119,6,0.08)", glowRgb: "217,119,6" },
    dark: { accent: "#f59e0b", hover: "#fbbf24", soft: "rgba(245,158,11,0.10)", glowRgb: "245,158,11" },
  },
};

interface SavedPrefs {
  themeMode?: ThemeMode;
  accentColor?: AccentColor;
  animationsEnabled?: boolean;
}

function loadPrefs(): SavedPrefs {
  try {
    const raw = localStorage.getItem("appPrefs");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const legacy = localStorage.getItem("theme");
  if (legacy === "light" || legacy === "dark") return { themeMode: legacy };
  return {};
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const prefs = loadPrefs();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(prefs.themeMode ?? "system");
  const [accentColor, setAccentColorState] = useState<AccentColor>(prefs.accentColor ?? "blue");
  const [animationsEnabled, setAnimationsEnabledState] = useState(prefs.animationsEnabled ?? true);
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolveTheme(prefs.themeMode ?? "system"));

  useEffect(() => {
    const newResolved = resolveTheme(themeMode);
    setResolved(newResolved);
    const root = document.documentElement;
    root.classList.toggle("dark", newResolved === "dark");

    const palette = accentPalettes[accentColor][newResolved];
    root.style.setProperty("--accent", palette.accent);
    root.style.setProperty("--accent-hover", palette.hover);
    root.style.setProperty("--accent-soft", palette.soft);
    root.style.setProperty("--glow-rgb", palette.glowRgb);

    root.style.setProperty("--glow-soft", `rgba(${palette.glowRgb},${newResolved === "dark" ? "0.08" : "0.06"})`);
    root.style.setProperty("--glow-medium", `rgba(${palette.glowRgb},${newResolved === "dark" ? "0.15" : "0.12"})`);
    root.style.setProperty("--glow-strong", `rgba(${palette.glowRgb},${newResolved === "dark" ? "0.28" : "0.22"})`);
    root.style.setProperty("--glow-border", `rgba(${palette.glowRgb},${newResolved === "dark" ? "0.22" : "0.18"})`);
    root.style.setProperty("--glow-shadow", `0 0 25px rgba(${palette.glowRgb},${newResolved === "dark" ? "0.12" : "0.08"}), 0 0 80px rgba(${palette.glowRgb},0.04)`);
    root.style.setProperty("--glow-shadow-hover", `0 0 40px rgba(${palette.glowRgb},${newResolved === "dark" ? "0.22" : "0.15"}), 0 0 100px rgba(${palette.glowRgb},0.06)`);

    localStorage.setItem("appPrefs", JSON.stringify({ themeMode, accentColor, animationsEnabled }));
    localStorage.setItem("theme", newResolved);
  }, [themeMode, accentColor, animationsEnabled]);

  useEffect(() => {
    if (themeMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeModeState(m => {
      const next = resolveTheme(m) === "light" ? "dark" : "light";
      return next;
    });
  }, []);

  const setTheme = useCallback((t: "light" | "dark") => setThemeModeState(t), []);
  const setThemeMode = useCallback((m: ThemeMode) => setThemeModeState(m), []);
  const setAccentColor = useCallback((c: AccentColor) => setAccentColorState(c), []);
  const setAnimationsEnabled = useCallback((v: boolean) => setAnimationsEnabledState(v), []);

  return (
    <ThemeContext.Provider value={{
      theme: resolved,
      themeMode,
      accentColor,
      animationsEnabled,
      toggleTheme,
      setTheme,
      setThemeMode,
      setAccentColor,
      setAnimationsEnabled,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
