import { PageTransition } from "../components/PageTransition";
import { StaggerContainer, StaggerItem } from "../components/MotionCard";
import { Calendar, Clock, MapPin, ChevronRight, User, Activity, FileText, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ListSkeleton } from "../components/Skeleton";
import { useExams } from "../hooks/useExams";
import { buildTodayTimeline, formatDurationMinutes, formatExamDate, getNextUpcomingExam } from "../lib/exam";
import { redirectToLogin } from "../lib/auth";
import { fetchWithTimeout } from "../lib/http";

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

const getSubjectColor = (subject: string) => {
  const palettes = [
    { bg: "rgba(0,113,227,0.08)", text: "var(--accent)" },
    { bg: "rgba(88,86,214,0.08)", text: "#5856d6" },
    { bg: "rgba(255,45,85,0.08)", text: "#ff2d55" },
    { bg: "rgba(52,199,89,0.08)", text: "#34c759" },
    { bg: "rgba(255,149,0,0.08)", text: "#ff9500" },
    { bg: "rgba(175,82,222,0.08)", text: "#af52de" },
    { bg: "rgba(255,59,48,0.08)", text: "#ff3b30" },
  ];
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = subject.charCodeAt(i) + ((h << 5) - h);
  return palettes[Math.abs(h) % palettes.length];
};

export default function Home() {
  const HOME_FETCH_TIMEOUT_MS = 15000;
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState("");
  const [todayClasses, setTodayClasses] = useState<Lesson[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState("");
  const { data: examsData, loading: isLoadingExams } = useExams({ autoSync: false });
  const activitiesRequestedRef = useRef(false);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const cached = sessionStorage.getItem("timetableData");
        if (cached) {
          const d = JSON.parse(cached);
          const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
          setTodayClasses((d.lessons || []).filter((l: Lesson) => l.day === days[new Date().getDay()]));
          setIsLoadingClasses(false); return;
        }
        const response = await fetchWithTimeout("/api/timetable", { credentials: "include" }, HOME_FETCH_TIMEOUT_MS);
        if (response.status === 401) { redirectToLogin(); return; }
        if (!response.ok) throw new Error("Failed");
        const data = await response.json();
        sessionStorage.setItem("timetableData", JSON.stringify(data));
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        setTodayClasses((data.lessons || []).filter((l: Lesson) => l.day === days[new Date().getDay()]));
      } catch (error: any) {
        setClassesError(error?.name === "AbortError" ? "课程表请求超时" : "无法加载课程表");
      }
      finally { setIsLoadingClasses(false); }
    };

    void fetchTimetable();
  }, []);

  useEffect(() => {
    if (activitiesRequestedRef.current || isLoadingClasses || isLoadingExams) {
      return;
    }

    activitiesRequestedRef.current = true;
    const fetchActivities = async () => {
      try {
        const cached = sessionStorage.getItem("activitiesData");
        if (cached) { setActivities(JSON.parse(cached).slice(0, 5)); setIsLoadingActivities(false); return; }
        const response = await fetchWithTimeout("/api/activities", { credentials: "include" }, HOME_FETCH_TIMEOUT_MS);
        if (response.status === 401) { redirectToLogin(); return; }
        if (!response.ok) throw new Error("Failed");
        const data = await response.json();
        let parsed = data?.d ? (() => { try { return JSON.parse(data.d); } catch { return data.d; } })() : data;
        let final = Array.isArray(parsed) ? parsed : parsed?.Data || parsed?.schedules || [];
        sessionStorage.setItem("activitiesData", JSON.stringify(final));
        setActivities(final.slice(0, 5));
      } catch (error: any) {
        setActivitiesError(error?.name === "AbortError" ? "活动请求超时" : "无法加载活动");
      }
      finally { setIsLoadingActivities(false); }
    };

    void fetchActivities();
  }, [isLoadingClasses, isLoadingExams]);

  const todayTimeline = buildTodayTimeline(todayClasses, examsData?.exams ?? []);
  const nextUpcomingExam = getNextUpcomingExam(examsData?.exams ?? []);
  const isLoadingSchedule = isLoadingClasses;
  const scheduleError = classesError;

  return (
    <PageTransition>
      <StaggerContainer className="space-y-8">
        {/* Header */}
        <StaggerItem>
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            主页
          </h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-secondary)" }}>
            欢迎回来，这是您今天的概览。如果在使用中遇到任何问题，恳请联系zhahuang2868@guiscn.com或者去github（https://github.com/marecop/ulinkporatal/issues）提交issues。
          </p>
        </StaggerItem>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <StaggerItem>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
                今日课程
              </h2>
              <Link
                to="/schedule"
                className="text-[13px] font-semibold flex items-center gap-0.5 transition-colors"
                style={{ color: "var(--accent)" }}
              >
                完整课表 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div
              className="rounded-2xl border overflow-hidden min-h-[200px] relative transition-shadow duration-300"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--card-shadow-hover)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "var(--card-shadow)")}
            >
              {isLoadingSchedule ? (
                <div className="p-3">
                  <ListSkeleton rows={4} />
                </div>
              ) : scheduleError ? (
                <div className="absolute inset-0 flex items-center justify-center text-[13px]" style={{ color: "var(--danger)" }}>
                  {scheduleError}
                </div>
              ) : todayTimeline.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ color: "var(--text-tertiary)" }}>
                  <Calendar className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-[13px]">今天没有课程或考试安排</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {todayTimeline.map((item, i) => {
                    const c = getSubjectColor(item.subject);
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 24 }}
                        className="flex items-start gap-4 p-3 rounded-xl transition-colors duration-150"
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--sidebar-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div className="flex flex-col items-center min-w-[52px] pt-0.5">
                          <span className="text-[14px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{item.startTime}</span>
                          <span className="text-[11px] font-medium tabular-nums" style={{ color: "var(--text-tertiary)" }}>{item.endTime}</span>
                        </div>
                        <div className="w-[3px] h-10 rounded-full mt-0.5" style={{ background: c.text, opacity: 0.4 }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-[14px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{item.subject}</h4>
                            {item.kind === "lesson" && item.period && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                                style={{ background: "var(--bg-secondary)", color: "var(--text-tertiary)" }}
                              >
                                {item.period}
                              </span>
                            )}
                            {item.kind === "exam" && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 inline-flex items-center gap-1"
                                style={{ background: "rgba(255,149,0,0.12)", color: "#ff9500" }}
                              >
                                <FileText className="w-3 h-3" />
                                考试
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                            {item.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.room}</span>}
                            {item.kind === "lesson" && item.teacher && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.teacher}</span>}
                            {item.kind === "exam" && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 考试安排</span>}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </StaggerItem>

          {/* Activities */}
          <StaggerItem>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
                近期活动
              </h2>
              <Link
                to="/activities"
                className="text-[13px] font-semibold flex items-center gap-0.5 transition-colors"
                style={{ color: "var(--accent)" }}
              >
                更多活动 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div
              className="rounded-2xl border overflow-hidden min-h-[200px] relative transition-shadow duration-300"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--card-shadow-hover)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "var(--card-shadow)")}
            >
              {isLoadingActivities ? (
                <div className="p-3">
                  <ListSkeleton rows={4} />
                </div>
              ) : activitiesError ? (
                <div className="absolute inset-0 flex items-center justify-center text-[13px]" style={{ color: "var(--danger)" }}>
                  {activitiesError}
                </div>
              ) : activities.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ color: "var(--text-tertiary)" }}>
                  <Activity className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-[13px]">暂无近期活动</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {activities.map((act, i) => {
                    let dateStr = "时间待定";
                    if (act.ScheduleDate?.StartDate) dateStr = act.ScheduleDate.StartDate.split("T")[0];
                    else if (act.StartDate || act.Date) dateStr = act.StartDate || act.Date;
                    return (
                      <motion.div
                        key={act.ID || act.ActivityID || i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 24 }}
                        className="flex items-center justify-between px-5 py-4 transition-colors duration-150"
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--sidebar-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div className="min-w-0">
                          <h4 className="text-[14px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                            {act.Name || act.ActivityName || act.Title || "未知活动"}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                            <Clock className="w-3 h-3" />
                            {dateStr}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </StaggerItem>
        </div>

        <StaggerItem>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
              下一场考试
            </h2>
            <Link
              to="/exams"
              className="text-[13px] font-semibold flex items-center gap-0.5 transition-colors"
              style={{ color: "var(--accent)" }}
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div
            className="rounded-2xl border overflow-hidden min-h-[180px] relative transition-shadow duration-300"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--card-shadow-hover)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "var(--card-shadow)")}
          >
            {!examsData ? (
              <div className="p-3">
                <ListSkeleton rows={2} />
              </div>
            ) : !nextUpcomingExam ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ color: "var(--text-tertiary)" }}>
                <FileText className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-[13px]">当前没有即将到来的考试安排</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold"
                    style={{ background: "rgba(255,149,0,0.12)", color: "#ff9500" }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    即将开始
                  </span>
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-lg text-[12px] font-semibold"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                  >
                    {formatExamDate(nextUpcomingExam.examDate)}
                  </span>
                </div>

                <h3 className="text-[18px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {nextUpcomingExam.subject}
                </h3>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
                  {nextUpcomingExam.paperName || "试卷名称待识别"}
                </p>

                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {nextUpcomingExam.startTime}-{nextUpcomingExam.endTime}
                  </span>
                  {!!formatDurationMinutes(nextUpcomingExam.durationMinutes, nextUpcomingExam.startTime, nextUpcomingExam.endTime) && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDurationMinutes(nextUpcomingExam.durationMinutes, nextUpcomingExam.startTime, nextUpcomingExam.endTime)}
                    </span>
                  )}
                  {nextUpcomingExam.room && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {nextUpcomingExam.room}
                    </span>
                  )}
                </div>

                {nextUpcomingExam.supervisionStartTime && nextUpcomingExam.supervisionEndTime && (
                  <div
                    className="mt-4 rounded-xl border px-4 py-3"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Shield className="w-4 h-4" style={{ color: "#ff9500" }} />
                      <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>全面监管</span>
                    </div>
                    <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      {nextUpcomingExam.supervisionStartTime}-{nextUpcomingExam.supervisionEndTime}
                      {nextUpcomingExam.nextExamRoom ? ` · 房间 ${nextUpcomingExam.nextExamRoom}` : ""}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
