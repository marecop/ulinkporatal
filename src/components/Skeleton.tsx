import { motion } from "motion/react";
import type { CSSProperties } from "react";

function Bone({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <motion.div
      className={`rounded-lg ${className}`}
      style={{
        background: "var(--bg-tertiary)",
        ...style,
      }}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div
      className="rounded-2xl border p-5 space-y-3"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <Bone className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-3/4" />
          <Bone className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex gap-2">
        <Bone className="h-8 w-16 rounded-lg" />
        <Bone className="h-8 w-16 rounded-lg" />
        <Bone className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4 border-b last:border-b-0"
          style={{ borderColor: "var(--border)" }}
        >
          <Bone className="w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4" style={{ width: `${60 + Math.random() * 30}%` }} />
            <Bone className="h-3" style={{ width: `${30 + Math.random() * 20}%` }} />
          </div>
          <Bone className="w-12 h-6 rounded-md flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Bone className="h-8 w-48" />
      <Bone className="h-4 w-72" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      className="rounded-2xl border p-5 space-y-3"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
    >
      <Bone className="w-9 h-9 rounded-xl" />
      <Bone className="h-3 w-16" />
      <Bone className="h-6 w-12" />
    </div>
  );
}

export function GradesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <CardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div
            className="rounded-2xl border p-5 flex items-center gap-6"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
          >
            <div className="space-y-1 w-16">
              <Bone className="h-5 w-14" />
              <Bone className="h-3 w-10" />
            </div>
            <Bone className="w-[3px] h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-5 w-32 rounded-lg" />
              <div className="flex gap-4">
                <Bone className="h-3 w-20" />
                <Bone className="h-3 w-24" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div
        className="rounded-3xl border p-8"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-6">
          <Bone className="w-24 h-24 rounded-3xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Bone className="h-7 w-48" />
            <Bone className="h-5 w-32" />
            <div className="flex gap-2">
              <Bone className="h-7 w-20 rounded-full" />
              <Bone className="h-7 w-16 rounded-full" />
              <Bone className="h-7 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <ListSkeleton rows={6} />
    </div>
  );
}
