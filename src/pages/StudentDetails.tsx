import { PageTransition } from "../components/PageTransition";
import { StaggerContainer, StaggerItem, MotionCard } from "../components/MotionCard";
import { DetailsSkeleton } from "../components/Skeleton";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  User, Calendar, GraduationCap, Users, Cake,
  AlertCircle, Hash, UserCircle,
} from "lucide-react";

interface StudentInfo {
  surname: string;
  forename: string;
  middleName: string;
  preferredName: string;
  yearGroup: string;
  homeroom: string;
  age: string;
  dateOfBirth: string;
  tutor: string;
  gender: string;
  email: string;
  studentId: string;
  pupilId: string;
  mobile?: string;
}

export default function StudentDetails() {
  const [info, setInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/student-details", {
          credentials: "include",
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setInfo(data);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(err.message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-[900px] mx-auto pb-16">
          <DetailsSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl flex items-center gap-3 font-medium text-[14px]"
          style={{ background: "rgba(255,59,48,0.08)", color: "var(--danger)" }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </motion.div>
      </PageTransition>
    );
  }

  if (!info) return null;

  const fullName = [info.forename, info.middleName, info.surname].filter(Boolean).join(" ");
  const displayName = info.preferredName
    ? `${info.preferredName} ${info.surname}`
    : fullName;
  const chineseName = info.middleName || "";

  const infoCards = [
    { icon: GraduationCap, label: "Year Group", value: info.yearGroup, accent: true },
    { icon: Users, label: "Homeroom", value: info.homeroom, accent: false },
    { icon: Cake, label: "Date of Birth", value: info.dateOfBirth, accent: false },
    { icon: Hash, label: "Age", value: info.age ? `${info.age}` : "", accent: false },
  ].filter(c => c.value);

  const detailRows = [
    { label: "Surname", value: info.surname },
    { label: "Forename", value: info.forename },
    { label: "Chinese Name", value: chineseName },
    { label: "Preferred Name", value: info.preferredName },
    { label: "Gender", value: info.gender },
    { label: "Email", value: info.email },
    { label: "Mobile", value: info.mobile },
    { label: "Tutor", value: info.tutor },
    { label: "Student ID", value: info.studentId },
    { label: "System ID", value: info.pupilId },
  ].filter(r => r.value);

  return (
    <PageTransition>
      <StaggerContainer className="max-w-[900px] mx-auto space-y-8 pb-16">

        {/* Header Card */}
        <StaggerItem>
          <div
            className="rounded-3xl border p-8 md:p-10 relative overflow-hidden"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
          >
            <motion.div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: "var(--accent)", opacity: 0.05, filter: "blur(60px)" }}
              animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
              <motion.div
                className="w-24 h-24 rounded-3xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent-soft)" }}
                whileHover={{ scale: 1.06, rotate: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <User className="w-10 h-10" style={{ color: "var(--accent)" }} />
              </motion.div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-[28px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {displayName}
                </h1>
                {chineseName && (
                  <p className="text-[18px] font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {chineseName}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                  {info.yearGroup && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      {info.yearGroup}
                    </span>
                  )}
                  {info.homeroom && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                      style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {info.homeroom}
                    </span>
                  )}
                  {info.gender && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                      style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                    >
                      <UserCircle className="w-3.5 h-3.5" />
                      {info.gender}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </StaggerItem>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {infoCards.map((card, i) => (
            <MotionCard
              key={card.label}
              delay={0.1 + i * 0.06}
              className="rounded-2xl border p-5 cursor-default"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: card.accent ? "var(--accent-soft)" : "var(--bg-secondary)" }}
              >
                <card.icon className="w-[18px] h-[18px]" style={{ color: card.accent ? "var(--accent)" : "var(--text-secondary)" }} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                {card.label}
              </p>
              <p className="text-[18px] font-bold" style={{ color: "var(--text-primary)" }}>
                {card.value}
              </p>
            </MotionCard>
          ))}
        </div>

        {/* Detail List */}
        <StaggerItem>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                Personal Information
              </h2>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {detailRows.map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.04, type: "spring", stiffness: 300, damping: 24 }}
                  className="flex items-center justify-between px-6 py-4 transition-colors duration-150"
                  style={{ borderColor: "var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--sidebar-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    {row.label}
                  </span>
                  <span className="text-[14px] font-semibold text-right" style={{ color: "var(--text-primary)" }}>
                    {row.value}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </StaggerItem>

        {/* Tutor Card */}
        {info.tutor && (
          <StaggerItem>
            <MotionCard
              delay={0.5}
              className="rounded-2xl border p-6 flex items-center gap-5"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent-soft)" }}
              >
                <Calendar className="w-6 h-6" style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Tutor / Advisor
                </p>
                <p className="text-[17px] font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                  {info.tutor}
                </p>
              </div>
            </MotionCard>
          </StaggerItem>
        )}
      </StaggerContainer>
    </PageTransition>
  );
}
