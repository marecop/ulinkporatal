import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/me", { credentials: "include", signal: ctrl.signal })
      .then((res) => {
        if (ctrl.signal.aborted) return;
        if (!res.ok) {
          sessionStorage.removeItem("activitiesData");
          sessionStorage.removeItem("timetableData");
          sessionStorage.removeItem("examsData");
          sessionStorage.removeItem("examsAutoSyncAt");
          localStorage.removeItem("authToken");
          navigate("/", { replace: true });
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        navigate("/", { replace: true });
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setChecking(false);
      });
    return () => ctrl.abort();
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="w-8 h-8 rounded-full border-2"
            style={{ borderColor: "var(--border-strong)", borderTopColor: "var(--accent)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="noise-overlay flex h-screen w-full overflow-hidden relative" style={{ background: "var(--bg-secondary)" }}>
      {/* Ambient glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(var(--glow-rgb),0.04), transparent 70%)",
            top: "-10%", right: "5%",
            filter: "blur(40px)",
            animation: "float-orb 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(var(--glow-rgb),0.03), transparent 70%)",
            bottom: "0%", left: "20%",
            filter: "blur(50px)",
            animation: "float-orb 20s ease-in-out infinite reverse",
          }}
        />
      </div>

      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto relative z-10">
        <div className="max-w-5xl mx-auto p-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:p-12 md:pb-24">
          <AnimatePresence mode="wait" initial={false}>
            <div key={location.pathname}>
              <Outlet />
            </div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
