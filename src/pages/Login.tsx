import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { clearPortalTransientStorage } from "../lib/auth";

// ─── Expanding-circle transition (vanilla DOM, survives route change) ────────

function runTransition(
  btnRect: DOMRect,
  apiPromise: Promise<{ success: boolean; error?: string }>,
  onSuccess: () => void,
  onError: (msg: string) => void,
) {
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  const cx = btnRect.left + btnRect.width / 2;
  const cy = btnRect.top + btnRect.height / 2;

  const maxDist = Math.sqrt(
    Math.max(cx, sw - cx) ** 2 + Math.max(cy, sh - cy) ** 2,
  );
  const circleSize = 50;
  const targetScale = (maxDist * 2.2) / circleSize;

  const isDark = document.documentElement.classList.contains("dark");

  const root = document.createElement("div");
  root.style.cssText = "position:fixed;inset:0;z-index:10000;pointer-events:none;overflow:hidden;";

  const glow = document.createElement("div");
  glow.style.cssText = `
    position:absolute;
    width:${circleSize * 3}px;height:${circleSize * 3}px;
    left:${cx - circleSize * 1.5}px;top:${cy - circleSize * 1.5}px;
    border-radius:50%;
    background:radial-gradient(circle,rgba(46,92,168,0.35),transparent 70%);
    transform:scale(0);opacity:0;
    transition:transform 0.5s cubic-bezier(0.4,0,0.2,1),opacity 0.3s ease;
  `;

  const circle = document.createElement("div");
  circle.style.cssText = `
    position:absolute;
    width:${circleSize}px;height:${circleSize}px;
    left:${cx - circleSize / 2}px;top:${cy - circleSize / 2}px;
    border-radius:50%;
    background:${isDark
      ? "linear-gradient(135deg,#0f1923,#1a3058,#2E5CA8)"
      : "linear-gradient(135deg,#2E5CA8,#4a7dd4,#6fa0e8)"};
    transform:scale(0);
    transition:transform 0.7s cubic-bezier(0.4,0,0.2,1),opacity 0.35s ease;
    box-shadow:0 0 80px rgba(46,92,168,0.5);
  `;

  root.appendChild(glow);
  root.appendChild(circle);
  document.body.appendChild(root);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      glow.style.transform = `scale(${targetScale * 0.5})`;
      glow.style.opacity = "1";
      circle.style.transform = `scale(${targetScale})`;
    });
  });

  let apiResult: { success: boolean; error?: string } | null = null;
  apiPromise.then(r => { apiResult = r; });

  const expandDone = 750;

  setTimeout(() => {
    glow.style.opacity = "0";

    function check() {
      if (!apiResult) { setTimeout(check, 60); return; }

      if (apiResult.success) onSuccess();
      else onError(apiResult.error || "Login failed");

      const delay = apiResult.success ? 80 : 40;
      setTimeout(() => {
        circle.style.transition = "transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease";
        circle.style.transform = `scale(${targetScale * 1.15})`;
        circle.style.opacity = "0";
        setTimeout(() => root.remove(), 460);
      }, delay);
    }
    check();
  }, expandDone);

  return () => { try { root.remove(); } catch {} };
}

// ─── Simple fade (animations off) ────────────────────────────────────────────

function runSimpleTransition(
  apiPromise: Promise<{ success: boolean; error?: string }>,
  onSuccess: () => void,
  onError: (msg: string) => void,
) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;pointer-events:none;
    background:var(--bg-secondary);opacity:0;
    transition:opacity 0.4s ease;
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = "1"; });

  apiPromise.then(result => {
    if (result.success) {
      onSuccess();
      setTimeout(() => {
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 420);
      }, 120);
    } else {
      onError(result.error || "Login failed");
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 420);
    }
  });

  return () => { try { overlay.remove(); } catch {} };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Login() {
  const { animationsEnabled } = useTheme();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotX = useTransform(mouseY, [0, 1], [3, -3]);
  const rotY = useTransform(mouseX, [0, 1], [-3, 3]);

  const handleCardMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width);
    mouseY.set((e.clientY - r.top) / r.height);
  }, [mouseX, mouseY]);

  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || transitioning) return;
    setIsLoading(true);
    setError("");
    setTransitioning(true);

    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const apiCall = fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, localDate }),
      credentials: "include",
    }).then(async res => {
      const data = await res.json();
      return { success: res.ok && data.success, error: data.error };
    }).catch(() => ({ success: false, error: "网络错误，请重试。" }));

    const onSuccess = () => {
      clearPortalTransientStorage();
      localStorage.setItem("authToken", "logged-in");
      navigate("/home");
    };

    const onError = (msg: string) => {
      setError(msg);
      setIsLoading(false);
      setTransitioning(false);
    };

    if (animationsEnabled) {
      const btnRect = buttonRef.current?.getBoundingClientRect();
      if (!btnRect) return;
      cleanupRef.current = runTransition(btnRect, apiCall, onSuccess, onError);
    } else {
      cleanupRef.current = runSimpleTransition(apiCall, onSuccess, onError);
    }
  };

  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div
      className="noise-overlay min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4 sm:px-6"
      style={{
        background: isDark
          ? "radial-gradient(ellipse at 50% 0%, rgba(46,92,168,0.10) 0%, rgba(10,10,12,1) 60%)"
          : "radial-gradient(ellipse at 50% 0%, rgba(46,92,168,0.06) 0%, #f5f5f7 60%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(46,92,168,0.12), transparent 70%)", top: "-20%", right: "-15%", filter: "blur(60px)" }}
          animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(46,92,168,0.08), transparent 70%)", bottom: "-15%", left: "-10%", filter: "blur(60px)" }}
          animate={{ scale: [1.1, 1, 1.1], x: [0, -20, 0], y: [0, 15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.95 }}
        animate={transitioning
          ? { opacity: 0, scale: 1.08, filter: "blur(16px)", transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }
          : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
        }
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[400px] p-6 sm:p-8 rounded-3xl z-10 glass"
        style={{
          boxShadow: isDark
            ? "0 8px 40px rgba(0,0,0,0.4), 0 0 80px rgba(46,92,168,0.06)"
            : "0 4px 30px rgba(0,0,0,0.06), 0 0 60px rgba(46,92,168,0.04)",
          rotateX: rotX, rotateY: rotY,
          transformStyle: "preserve-3d", transformPerspective: 1200,
        } as any}
        onMouseMove={handleCardMouse}
        onMouseLeave={() => { mouseX.set(0.5); mouseY.set(0.5); }}
      >
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            opacity: 0.06,
            background: useTransform(
              [mouseX, mouseY],
              ([x, y]: number[]) =>
                `radial-gradient(400px circle at ${x * 100}% ${y * 100}%, rgba(var(--glow-rgb),1), transparent)`,
            ),
          }}
        />

        <motion.div
          className="flex flex-col items-center mb-8"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative overflow-hidden"
            style={{ background: "#2E5CA8", boxShadow: "0 4px 20px rgba(46,92,168,0.35)" }}
            whileHover={{ scale: 1.06, rotate: 3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <img src={`${import.meta.env.BASE_URL}logo_ulc.png`} alt="ULC" className="w-12 h-12 object-contain relative z-10" />
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{ background: "#2E5CA8", opacity: 0.4 }}
              animate={{ scale: [1, 1.6, 1.6], opacity: [0.4, 0, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
            />
          </motion.div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Student Portal
          </h1>
          <p className="text-[13px] mt-2 text-center leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            使用 Engage 帐号登录以继续
          </p>
        </motion.div>

        <form onSubmit={handleLogin} className="space-y-3.5">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              className="p-3 rounded-xl text-[13px] font-medium text-center"
              style={{ background: "rgba(255,59,48,0.08)", color: "var(--danger)" }}
            >
              {error}
            </motion.div>
          )}

          {[
            { type: "text" as const, value: username, setter: setUsername, placeholder: "邮箱", delay: 0.3 },
            { type: "password" as const, value: password, setter: setPassword, placeholder: "密码", delay: 0.36 },
          ].map(field => (
            <motion.div
              key={field.placeholder}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: field.delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <input
                type={field.type}
                value={field.value}
                onChange={e => field.setter(e.target.value)}
                className="w-full rounded-xl px-4 py-3.5 text-[14px] outline-none transition-all duration-200 border placeholder:font-medium"
                style={{ background: "var(--input-bg)", color: "var(--text-primary)", borderColor: "var(--border)" }}
                onFocus={e => {
                  e.target.style.borderColor = "var(--accent)";
                  e.target.style.boxShadow = "0 0 0 3px var(--accent-soft), 0 0 20px rgba(var(--glow-rgb),0.08)";
                }}
                onBlur={e => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                }}
                placeholder={field.placeholder}
                required
                disabled={transitioning}
              />
            </motion.div>
          ))}

          <motion.button
            ref={buttonRef}
            type="submit"
            disabled={isLoading || transitioning}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full mt-1 rounded-xl px-4 py-3.5 text-[14px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
            style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 20px rgba(var(--glow-rgb), 0.2)" }}
            whileHover={!transitioning ? { scale: 1.02, boxShadow: "0 6px 30px rgba(var(--glow-rgb), 0.35)" } : {}}
            whileTap={!transitioning ? { scale: 0.98 } : {}}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)",
                backgroundSize: "200% 100%",
              }}
              animate={{ backgroundPosition: ["-200% 0", "200% 0"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1.5 }}
            />
            {isLoading ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <>
                登录
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-20 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 sm:bottom-6 sm:left-6 sm:w-auto sm:max-w-none sm:translate-x-0"
      >
        <div
          className="glass rounded-2xl px-4 py-3 sm:px-0 sm:py-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex flex-col gap-2 sm:items-start">
            <button
              type="button"
              onClick={() => navigate("/privacy")}
              className="text-[13px] font-semibold transition-colors duration-200 touch-manipulation text-left"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-primary)"}
            >
              隐私政策
            </button>
            <p className="text-[11px] leading-5 sm:max-w-xs" style={{ color: "var(--text-tertiary)" }}>
              登录即表示你已阅读本系统的隐私说明。我们不会持久化保存你的 Engage 密码，考试同步授权也可随时解绑。
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
