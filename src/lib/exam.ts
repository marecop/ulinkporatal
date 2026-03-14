import type { ExamRecord } from "../types/exam";

export interface LessonLike {
  day: string;
  startTime: string;
  endTime: string;
  time: string;
  subject: string;
  room: string;
  teacher: string;
  period: string;
}

export interface ScheduleTimelineItem {
  kind: "lesson" | "exam";
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
  teacher?: string;
  period?: string;
  examDate?: string;
  matchedStudentName?: string;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 0,
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getIsoDateForWeekday(weekday: string, referenceDate = new Date()) {
  const targetIndex = WEEKDAY_INDEX[weekday];
  if (targetIndex === undefined) return null;

  const current = new Date(referenceDate);
  const currentIndex = current.getDay();
  const diff = targetIndex - currentIndex;
  current.setDate(current.getDate() + diff);
  return toIsoDate(current);
}

export function buildTodayTimeline(lessons: LessonLike[], exams: ExamRecord[], referenceDate = new Date()) {
  const todayIso = toIsoDate(referenceDate);
  const todayDay = referenceDate.toLocaleDateString("en-US", { weekday: "long" });
  return mergeScheduleItems(
    lessons.filter(lesson => lesson.day === todayDay),
    exams.filter(exam => exam.examDate === todayIso),
  );
}

export function buildDayTimeline(lessons: LessonLike[], exams: ExamRecord[], weekday: string, referenceDate = new Date()) {
  const targetIso = getIsoDateForWeekday(weekday, referenceDate);
  return mergeScheduleItems(
    lessons.filter(lesson => lesson.day === weekday),
    exams.filter(exam => exam.examDate === targetIso),
  );
}

export function mergeScheduleItems(lessons: LessonLike[], exams: ExamRecord[]): ScheduleTimelineItem[] {
  const merged: ScheduleTimelineItem[] = [
    ...lessons.map((lesson) => ({
      kind: "lesson" as const,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      subject: lesson.subject,
      room: lesson.room,
      teacher: lesson.teacher,
      period: lesson.period,
    })),
    ...exams.map((exam) => ({
      kind: "exam" as const,
      startTime: exam.startTime,
      endTime: exam.endTime,
      subject: exam.subject,
      room: exam.room,
      examDate: exam.examDate,
      matchedStudentName: exam.matchedStudentName,
    })),
  ];

  return merged.sort((left, right) => {
    const leftKey = `${left.startTime}|${left.subject}|${left.kind}`;
    const rightKey = `${right.startTime}|${right.subject}|${right.kind}`;
    return leftKey.localeCompare(rightKey);
  });
}

export function formatExamDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

function parseTimeToMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match?.[1] || !match[2]) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatDurationMinutes(durationMinutes: number | null | undefined, startTime?: string, endTime?: string) {
  let totalMinutes = durationMinutes ?? null;

  if (totalMinutes === null && startTime && endTime) {
    const start = parseTimeToMinutes(startTime);
    const end = parseTimeToMinutes(endTime);
    if (start !== null && end !== null && end > start) {
      totalMinutes = end - start;
    }
  }

  if (totalMinutes === null || totalMinutes <= 0) return "";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  if (hours > 0) {
    return `${hours}小时`;
  }
  return `${minutes}分钟`;
}

export function getExamDateTime(exam: ExamRecord) {
  const candidate = new Date(`${exam.examDate}T${exam.startTime}:00`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

export function groupExamsByDate(exams: ExamRecord[]) {
  const groups = new Map<string, ExamRecord[]>();
  const sorted = [...exams].sort((left, right) => {
    const leftKey = `${left.examDate} ${left.startTime} ${left.subject} ${left.paperName ?? ""}`;
    const rightKey = `${right.examDate} ${right.startTime} ${right.subject} ${right.paperName ?? ""}`;
    return leftKey.localeCompare(rightKey);
  });

  for (const exam of sorted) {
    const bucket = groups.get(exam.examDate) ?? [];
    bucket.push(exam);
    groups.set(exam.examDate, bucket);
  }

  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
}

export function getNextUpcomingExam(exams: ExamRecord[], referenceDate = new Date()) {
  return [...exams]
    .filter((exam) => {
      const end = new Date(`${exam.examDate}T${exam.endTime}:00`);
      return !Number.isNaN(end.getTime()) && end >= referenceDate;
    })
    .sort((left, right) => {
      const leftDate = getExamDateTime(left)?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightDate = getExamDateTime(right)?.getTime() ?? Number.POSITIVE_INFINITY;
      return leftDate - rightDate;
    })[0] ?? null;
}
