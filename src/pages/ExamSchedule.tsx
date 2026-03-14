import { useMemo } from "react";
import { CalendarRange, Clock, FileText, MapPin, Shield, Sparkles } from "lucide-react";
import { PageTransition } from "../components/PageTransition";
import { MotionCard, StaggerContainer, StaggerItem } from "../components/MotionCard";
import { ScheduleSkeleton } from "../components/Skeleton";
import { useExams } from "../hooks/useExams";
import { formatDurationMinutes, formatExamDate, groupExamsByDate } from "../lib/exam";

const palettes = [
  { bg: "rgba(0,113,227,0.08)", text: "var(--accent)" },
  { bg: "rgba(88,86,214,0.08)", text: "#5856d6" },
  { bg: "rgba(255,149,0,0.10)", text: "#ff9500" },
  { bg: "rgba(52,199,89,0.10)", text: "#34c759" },
  { bg: "rgba(255,45,85,0.10)", text: "#ff2d55" },
];

function getSubjectColor(subject: string) {
  let hash = 0;
  for (let index = 0; index < subject.length; index += 1) {
    hash = subject.charCodeAt(index) + ((hash << 5) - hash);
  }
  return palettes[Math.abs(hash) % palettes.length];
}

export default function ExamSchedule() {
  const { data, loading, error } = useExams({ autoSync: false });
  const groupedExams = useMemo(() => groupExamsByDate(data?.exams ?? []), [data?.exams]);

  return (
    <PageTransition>
      <StaggerContainer className="space-y-8">
        <StaggerItem>
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            考试信息
          </h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-secondary)" }}>
            按日期查看 Mock Exam 安排与 Full Centre Supervision 信息
          </p>
        </StaggerItem>

        <StaggerItem>
          <MotionCard
            className="rounded-2xl border p-5"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
            glow
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    {data?.bound ? "考试资料已接入账户数据" : "考试资料当前来自本地 Mock Exam 样本"}
                  </p>
                  <p className="text-[12px] leading-5 mt-1" style={{ color: "var(--text-secondary)" }}>
                    {data?.lastSyncMessage || "系统会在每日首次登录时重新解析考试文件，并从数据库读取页面内容。"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className="px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                >
                  共 {data?.exams.length ?? 0} 场
                </span>
                {data?.lastSyncAt && (
                  <span
                    className="px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                  >
                    最近刷新 {new Date(data.lastSyncAt).toLocaleString("zh-CN")}
                  </span>
                )}
              </div>
            </div>
          </MotionCard>
        </StaggerItem>

        <div className="min-h-[420px] relative">
          {loading ? (
            <ScheduleSkeleton />
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center text-[14px]" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          ) : groupedExams.length === 0 ? (
            <MotionCard
              className="rounded-2xl border p-10 flex flex-col items-center justify-center text-center"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
            >
              <Sparkles className="w-12 h-12 mb-4 opacity-30" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                当前日期之后没有可显示的考试安排
              </p>
              <p className="text-[12px] mt-2 max-w-md leading-5" style={{ color: "var(--text-secondary)" }}>
                如果今天已经超过 Mock Exam 有效期，系统会自动清除 3 月 24 日之前的临时考试数据。
              </p>
            </MotionCard>
          ) : (
            <div className="space-y-7">
              {groupedExams.map(({ date, items }) => (
                <section key={date} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <h2 className="text-[18px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        {formatExamDate(date)}
                      </h2>
                      <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                        当天共 {items.length} 场考试
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map((exam, index) => {
                      const color = getSubjectColor(exam.subject);
                      const duration = formatDurationMinutes(exam.durationMinutes, exam.startTime, exam.endTime);

                      return (
                        <MotionCard
                          key={`${exam.examDate}-${exam.startTime}-${exam.subject}-${exam.paperName ?? index}`}
                          as="article"
                          delay={index * 0.04}
                          className="rounded-2xl border p-5"
                          style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-4">
                              <div className="min-w-[76px]">
                                <p className="text-[20px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                                  {exam.startTime}
                                </p>
                                <p className="text-[12px] font-medium tabular-nums mt-1" style={{ color: "var(--text-tertiary)" }}>
                                  {exam.endTime}
                                </p>
                              </div>

                              <div className="w-[3px] h-14 rounded-full" style={{ background: color.text, opacity: 0.35 }} />

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span
                                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-bold"
                                    style={{ background: color.bg, color: color.text }}
                                  >
                                    {exam.subject}
                                  </span>
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold"
                                    style={{ background: "rgba(255,149,0,0.12)", color: "#ff9500" }}
                                  >
                                    <FileText className="w-3 h-3" />
                                    考试
                                  </span>
                                </div>

                                <h3 className="text-[18px] font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                                  {exam.paperName || "未识别试卷名称"}
                                </h3>

                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                                  <span className="inline-flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {exam.startTime}-{exam.endTime}
                                  </span>
                                  {duration && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5" />
                                      {duration}
                                    </span>
                                  )}
                                  {exam.room && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {exam.room}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {exam.supervisionStartTime && exam.supervisionEndTime && (
                            <div
                              className="mt-4 rounded-xl border px-4 py-3"
                              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-4 h-4" style={{ color: "#ff9500" }} />
                                <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                                  全面监管
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                                <span>时长：{exam.supervisionStartTime}-{exam.supervisionEndTime}</span>
                                {exam.supervisionRoom && <span>监管地点：{exam.supervisionRoom}</span>}
                                {exam.nextExamName && <span>下一场考试：{exam.nextExamName}</span>}
                                {(exam.nextExamRoom || exam.room) && <span>房间：{exam.nextExamRoom || exam.room}</span>}
                              </div>
                            </div>
                          )}
                        </MotionCard>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </StaggerContainer>
    </PageTransition>
  );
}
