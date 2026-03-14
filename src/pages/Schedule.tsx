import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition } from "../components/PageTransition";
import { StaggerContainer, StaggerItem } from "../components/MotionCard";
import { ScheduleSkeleton } from "../components/Skeleton";
import { MapPin, User, BookOpen, FileText } from "lucide-react";
import { useExams } from "../hooks/useExams";
import { buildDayTimeline } from "../lib/exam";

interface Lesson {
  day: string;
  startTime: string;
  endTime: string;
  time: string;
  subject: string;
  room: string;
  teacher: string;
  period: string;
}

const subjectColors = [
  { bg: "rgba(0,113,227,0.08)", text: "#0071e3" },
  { bg: "rgba(88,86,214,0.08)", text: "#5856d6" },
  { bg: "rgba(255,45,85,0.08)", text: "#ff2d55" },
  { bg: "rgba(52,199,89,0.08)", text: "#34c759" },
  { bg: "rgba(255,149,0,0.08)", text: "#ff9500" },
  { bg: "rgba(175,82,222,0.08)", text: "#af52de" },
  { bg: "rgba(255,59,48,0.08)", text: "#ff3b30" },
];
const getSubjectColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return subjectColors[Math.abs(h) % subjectColors.length];
};

export default function Schedule() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const todayIndex = new Date().getDay() - 1;
  const [selectedDay, setSelectedDay] = useState(todayIndex >= 0 && todayIndex < 5 ? days[todayIndex] : 'Monday');
  const { data: examsData } = useExams({ autoSync: false });

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const cached = sessionStorage.getItem("timetableData");
        if (cached) { setLessons(JSON.parse(cached).lessons || []); setIsLoading(false); return; }
        const response = await fetch("/api/timetable", { credentials: "include" });
        if (response.status === 401) { setError("登录已过期"); return; }
        if (!response.ok) throw new Error("Failed");
        const data = await response.json();
        sessionStorage.setItem("timetableData", JSON.stringify(data));
        setLessons(data.lessons || []);
      } catch { setError("无法加载课程表"); }
      finally { setIsLoading(false); }
    };
    fetchTimetable();
  }, []);

  const dayTimeline = buildDayTimeline(lessons, examsData?.exams ?? [], selectedDay);
  const dayMap: Record<string, string> = { Monday: '周一', Tuesday: '周二', Wednesday: '周三', Thursday: '周四', Friday: '周五' };
  const isLoadingTimeline = isLoading;
  const timelineError = error;

  return (
    <PageTransition>
      <StaggerContainer className="space-y-8">
        <StaggerItem>
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>周时间表</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-secondary)" }}>查看您本周的课程安排</p>
        </StaggerItem>

        {/* Day Selector with animated indicator */}
        <StaggerItem>
          <div className="flex overflow-x-auto pb-1 hide-scrollbar">
            <div className="flex gap-1 p-1 rounded-xl relative" style={{ background: "var(--bg-secondary)" }}>
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className="relative px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap z-10"
                  style={{ color: selectedDay === day ? "var(--text-primary)" : "var(--text-secondary)" }}
                >
                  {selectedDay === day && (
                    <motion.div
                      layoutId="day-selector"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: "var(--bg-primary)", boxShadow: "var(--card-shadow)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{dayMap[day]}</span>
                </button>
              ))}
            </div>
          </div>
        </StaggerItem>

        <div className="min-h-[400px] relative">
          {isLoadingTimeline ? (
            <ScheduleSkeleton />
          ) : timelineError ? (
            <div className="absolute inset-0 flex items-center justify-center text-[14px]" style={{ color: "var(--danger)" }}>{timelineError}</div>
          ) : dayTimeline.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ color: "var(--text-tertiary)" }}
            >
              <BookOpen className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-[14px]">所选日期没有课程或考试安排</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDay}
                initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="space-y-3"
              >
                {dayTimeline.map((item, i) => {
                  const c = getSubjectColor(item.subject);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 24 }}
                      className="rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 transition-shadow duration-300"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--card-shadow-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = "var(--card-shadow)")}
                    >
                      <div className="flex flex-row sm:flex-col items-center sm:items-end sm:w-20 shrink-0 gap-2 sm:gap-0">
                        <span className="text-[18px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{item.startTime}</span>
                        <span className="text-[13px] font-medium tabular-nums" style={{ color: "var(--text-tertiary)" }}>{item.endTime}</span>
                      </div>

                      <div className="hidden sm:block w-[3px] h-12 rounded-full" style={{ background: c.text, opacity: 0.3 }} />

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-bold"
                            style={{ background: c.bg, color: c.text }}
                          >
                            {item.subject}
                          </span>
                          {item.kind === "lesson" && item.period && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
                              {item.period}
                            </span>
                          )}
                          {item.kind === "exam" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: "rgba(255,149,0,0.12)", color: "#ff9500" }}>
                              <FileText className="w-3 h-3" />
                              考试
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                          {item.room && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{item.room}</span>}
                          {item.kind === "lesson" && item.teacher && <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{item.teacher}</span>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </StaggerContainer>
    </PageTransition>
  );
}
