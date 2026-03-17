import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { PageTransition } from "../components/PageTransition";
import { StaggerContainer, StaggerItem } from "../components/MotionCard";
import { ListSkeleton } from "../components/Skeleton";
import { Activity, Clock, Hash } from "lucide-react";
import { redirectToLogin } from "../lib/auth";
import { fetchWithTimeout } from "../lib/http";

export default function Activities() {
  const ACTIVITIES_FETCH_TIMEOUT_MS = 15000;
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const cached = sessionStorage.getItem("activitiesData");
        if (cached) { setActivities(JSON.parse(cached)); setIsLoading(false); return; }
        const response = await fetchWithTimeout("/api/activities", { credentials: "include" }, ACTIVITIES_FETCH_TIMEOUT_MS);
        if (response.status === 401) { redirectToLogin(); return; }
        if (!response.ok) throw new Error("Failed");
        const data = await response.json();
        let parsed = data?.d ? (() => { try { return JSON.parse(data.d); } catch { return data.d; } })() : data;
        let final = Array.isArray(parsed) ? parsed : parsed?.Data || parsed?.schedules || [];
        sessionStorage.setItem("activitiesData", JSON.stringify(final));
        setActivities(final);
      } catch (error: any) { setError(error?.name === "AbortError" ? "活动请求超时" : "无法加载活动"); }
      finally { setIsLoading(false); }
    };
    fetchActivities();
  }, []);

  return (
    <PageTransition>
      <StaggerContainer className="space-y-8">
        <StaggerItem>
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>活动</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-secondary)" }}>
            校园活动与社团参与记录。注意！！此网站仅能获取已经报名的CCA信息，无法从此网站book任何CCA，请前往
            <a href="https://ulinkcollege.engagehosted.cn/Activities/ActivitySchedulesPP.aspx" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}> 原版Engage门户 </a>
            （点我）book活动。
          </p>
        </StaggerItem>

        <StaggerItem>
          <div
            className="rounded-2xl border overflow-hidden min-h-[300px] relative"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
          >
            {isLoading ? (
              <div className="p-3"><ListSkeleton rows={6} /></div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center text-[14px]" style={{ color: "var(--danger)" }}>{error}</div>
            ) : activities.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ color: "var(--text-tertiary)" }}
              >
                <Activity className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-[14px]">暂无活动记录</p>
              </motion.div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {activities.map((act, i) => {
                  let dateStr = "时间待定";
                  if (act.ScheduleDate?.StartDate) {
                    dateStr = act.ScheduleDate.StartDate.split("T")[0];
                    if (act.ScheduleDate.EndDate) dateStr += ` 至 ${act.ScheduleDate.EndDate.split("T")[0]}`;
                  } else if (act.StartDate || act.Date) dateStr = act.StartDate || act.Date;
                  const id = act.ID || act.ActivityID || "N/A";
                  const name = act.Name || act.ActivityName || act.Title || "未知活动";
                  return (
                    <motion.div
                      key={id !== "N/A" ? id : i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 24 }}
                      className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 transition-colors duration-150"
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--sidebar-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                            style={{ background: "var(--bg-secondary)", color: "var(--text-tertiary)" }}
                          >
                            <Hash className="w-3 h-3" />{id}
                          </span>
                          <h4 className="text-[15px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{name}</h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{dateStr}</span>
                          {act.phaseType !== undefined && <span>阶段: {act.phaseType}</span>}
                          {act.BookingCompletePercentage !== undefined && <span>完成度: {act.BookingCompletePercentage}%</span>}
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 sm:ml-4">
                        <motion.button
                          className="px-4 py-2 rounded-full text-[13px] font-semibold"
                          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                          whileHover={{ scale: 1.04, boxShadow: "0 2px 12px var(--accent-soft)" }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        >
                          查看详情
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
