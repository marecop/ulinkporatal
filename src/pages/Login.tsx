import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "motion/react";
import { GraduationCap, ArrowRight, Loader2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

// ─── Math ────────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOutQuart(t: number) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function noise(x: number, t: number): number {
  return Math.sin(x * 2.7 + t * 1.8) * 0.38
    + Math.sin(x * 4.3 - t * 2.4) * 0.25
    + Math.sin(x * 7.1 + t * 1.1) * 0.18
    + Math.sin(x * 11.3 - t * 0.7) * 0.12
    + Math.sin(x * 15.7 + t * 0.4) * 0.07;
}

type Pt = [number, number];

// ─── Bubble geometry ─────────────────────────────────────────────────────────

function generateBubblePoints(
  btn: DOMRect, progress: number, time: number,
): { points: Pt[]; cx: number; cy: number; baseR: number } {
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  const ease = easeOutCubic(progress);

  const btnCx = btn.left + btn.width / 2;
  const btnCy = btn.top + btn.height / 2;
  const cx = lerp(btnCx, sw / 2, ease);
  const cy = lerp(btnCy, sh / 2, ease);

  const diagonal = Math.sqrt(sw * sw + sh * sh) / 2;
  const btnR = Math.min(btn.width, btn.height) / 2;
  const baseR = lerp(btnR, diagonal * 1.25, ease);

  const noiseAmt = Math.pow(Math.sin(progress * Math.PI), 2.2) * baseR * 0.09;

  const N = 32;
  const points: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2;
    const n = noise(angle * 2.5 + i * 0.4, time * 1.2);
    const r = baseR + n * noiseAmt;
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }

  return { points, cx, cy, baseR };
}

// Catmull-Rom → cubic bezier (closed loop, smooth bubble curve)
function drawCatmullRom(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  const n = pts.length;
  if (n < 3) return;
  const T = 5;
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / T,
      p1[1] + (p2[1] - p0[1]) / T,
      p2[0] - (p3[0] - p1[0]) / T,
      p2[1] - (p3[1] - p1[1]) / T,
      p2[0], p2[1],
    );
  }
}

// ─── Canvas drawing ──────────────────────────────────────────────────────────

function drawBubble(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  pts: Pt[],
  cx: number, cy: number,
  baseR: number,
  progress: number,
  borderGrad: CanvasGradient,
) {
  ctx.clearRect(0, 0, w, h);

  ctx.beginPath();
  drawCatmullRom(ctx, pts);
  ctx.closePath();

  const alpha = lerp(0.45, 0.88, easeOutCubic(progress));
  const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR);
  fill.addColorStop(0,    `rgba(139,92,246,${alpha * 0.82})`);
  fill.addColorStop(0.22, `rgba(236,72,153,${alpha * 0.68})`);
  fill.addColorStop(0.44, `rgba(59,130,246,${alpha * 0.54})`);
  fill.addColorStop(0.66, `rgba(245,158,11,${alpha * 0.38})`);
  fill.addColorStop(0.88, `rgba(16,185,129,${alpha * 0.26})`);
  fill.addColorStop(1,    `rgba(6,182,212,${alpha * 0.16})`);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  drawCatmullRom(ctx, pts);
  ctx.closePath();

  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = lerp(16, 5, easeOutCubic(progress));
  ctx.shadowColor = "rgba(139,92,246,0.30)";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ─── Transition controller (vanilla DOM — survives route change) ─────────────

function runTransition(
  btnRect: DOMRect,
  apiPromise: Promise<{ success: boolean; error?: string }>,
  onSuccess: () => void,
  onError: (msg: string) => void,
) {
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const root = document.createElement("div");
  root.style.cssText = "position:fixed;inset:0;z-index:10000;pointer-events:none;overflow:hidden;";

  const canvas = document.createElement("canvas");
  canvas.width = sw * dpr;
  canvas.height = sh * dpr;
  canvas.style.cssText = `position:absolute;inset:0;width:${sw}px;height:${sh}px;`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const borderGrad = ctx.createLinearGradient(0, 0, sw, sh);
  borderGrad.addColorStop(0, "#8b5cf6");
  borderGrad.addColorStop(0.2, "#ec4899");
  borderGrad.addColorStop(0.4, "#ef4444");
  borderGrad.addColorStop(0.6, "#3b82f6");
  borderGrad.addColorStop(0.8, "#f59e0b");
  borderGrad.addColorStop(1, "#10b981");

  const glass = document.createElement("div");
  glass.style.cssText = `
    position:absolute;inset:0;opacity:0;
    backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
    background:radial-gradient(ellipse at 50% 50%,
      rgba(139,92,246,0.32),rgba(236,72,153,0.26),
      rgba(59,130,246,0.20),rgba(245,158,11,0.14),
      rgba(16,185,129,0.08));
    transition:opacity 0.25s ease;
  `;

  const borderEl = document.createElement("div");
  borderEl.style.cssText = `
    position:absolute;inset:0;opacity:0;
    border:5px solid transparent;
    border-image:linear-gradient(135deg,#8b5cf6,#ec4899,#ef4444,#3b82f6,#f59e0b,#10b981) 1;
    box-shadow:inset 0 0 20px rgba(139,92,246,0.10),inset 0 0 40px rgba(236,72,153,0.05);
    transition:opacity 0.35s ease;
  `;

  root.appendChild(canvas);
  root.appendChild(glass);
  root.appendChild(borderEl);
  document.body.appendChild(root);

  let animId = 0;
  let apiResult: { success: boolean; error?: string } | null = null;
  apiPromise.then(r => { apiResult = r; });

  // ── Phase 1: Expansion on canvas ──
  const expandStart = performance.now();
  const expandDuration = 1500;

  function expandTick(now: number) {
    const elapsed = (now - expandStart) / 1000;
    const t = Math.min((now - expandStart) / expandDuration, 1);
    const { points, cx, cy, baseR } = generateBubblePoints(btnRect, t, elapsed);
    drawBubble(ctx, sw, sh, points, cx, cy, baseR, t, borderGrad);

    if (t < 1) {
      animId = requestAnimationFrame(expandTick);
    } else {
      glass.style.opacity = "1";
      borderEl.style.opacity = "1";
      setTimeout(() => { canvas.style.display = "none"; }, 280);
      startHold();
    }
  }
  animId = requestAnimationFrame(expandTick);

  // ── Phase 2: Hold (frosted glass + breathing) ──
  function startHold() {
    const holdStart = performance.now();
    const minHold = 500;

    function holdTick(now: number) {
      const elapsed = (now - holdStart) / 1000;
      const breathe = 1 + Math.sin(elapsed * 1.5) * 0.005;
      glass.style.transform = `scale(${breathe})`;

      const bOp = 0.75 + Math.sin(elapsed * 2.0) * 0.06;
      borderEl.style.opacity = String(bOp);

      if (apiResult && (now - holdStart) >= minHold) {
        glass.style.transform = "";
        handleResult();
        return;
      }
      animId = requestAnimationFrame(holdTick);
    }
    animId = requestAnimationFrame(holdTick);
  }

  // ── Phase 3: Reveal from center ──
  function handleResult() {
    const result = apiResult!;
    if (result.success) onSuccess();
    else onError(result.error || "Login failed");

    setTimeout(() => startReveal(), result.success ? 100 : 50);
  }

  function startReveal() {
    const revealStart = performance.now();
    const revealDuration = 850;
    const maxR = Math.sqrt(sw * sw + sh * sh) / 2 * 1.15;

    function revealTick(now: number) {
      const t = Math.min((now - revealStart) / revealDuration, 1);
      const ease = easeInOutQuart(t);
      const r = ease * maxR;
      const soft = Math.max(25, r * 0.07);

      const m = `radial-gradient(circle ${r}px at 50% 50%,transparent 0px,transparent ${Math.max(0, r - soft)}px,black ${r}px)`;
      glass.style.maskImage = m;
      glass.style.webkitMaskImage = m;

      const bf = Math.max(0, 1 - ease * 1.6);
      borderEl.style.opacity = String(bf);

      if (t < 1) {
        animId = requestAnimationFrame(revealTick);
      } else {
        root.remove();
      }
    }
    animId = requestAnimationFrame(revealTick);
  }

  return () => {
    cancelAnimationFrame(animId);
    try { root.remove(); } catch { /* already removed */ }
  };
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

    const apiCall = fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    }).then(async res => {
      const data = await res.json();
      return { success: res.ok && data.success, error: data.error };
    }).catch(() => ({ success: false, error: "网络错误，请重试。" }));

    const onSuccess = () => {
      sessionStorage.removeItem("activitiesData");
      sessionStorage.removeItem("timetableData");
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
      className="noise-overlay min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{
        background: isDark
          ? "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, rgba(10,10,12,1) 60%)"
          : "radial-gradient(ellipse at 50% 0%, rgba(0,113,227,0.04) 0%, #f5f5f7 60%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)", top: "-20%", right: "-15%", filter: "blur(60px)" }}
          animate={{ scale: [1, 1.2, 1], x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.1), transparent 70%)", bottom: "-15%", left: "-10%", filter: "blur(60px)" }}
          animate={{ scale: [1.1, 1, 1.1], x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.08), transparent 70%)", top: "50%", left: "20%", filter: "blur(50px)" }}
          animate={{ scale: [1, 1.3, 1], y: [0, -40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[400px] p-8 rounded-3xl z-10 glass"
        style={{
          boxShadow: isDark
            ? "0 8px 40px rgba(0,0,0,0.4), 0 0 80px rgba(139,92,246,0.06)"
            : "0 4px 30px rgba(0,0,0,0.06), 0 0 60px rgba(0,113,227,0.04)",
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
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative"
            style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 20px rgba(var(--glow-rgb), 0.25)" }}
            whileHover={{ scale: 1.06, rotate: 3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <GraduationCap className="w-8 h-8 text-white" />
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{ background: "var(--gradient-primary)", opacity: 0.4 }}
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
    </div>
  );
}
