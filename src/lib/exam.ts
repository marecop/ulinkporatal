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
