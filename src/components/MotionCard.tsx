import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode, useCallback, type CSSProperties, type MouseEvent } from "react";

interface MotionCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  tiltDegree?: number;
  glow?: boolean;
  as?: "div" | "section" | "article";
  [key: string]: any;
}

export function MotionCard({
  children,
  className = "",
  style,
  delay = 0,
  tiltDegree = 2,
  glow = false,
  as = "div",
  ...rest
}: MotionCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const smoothX = useSpring(mouseX, { stiffness: 200, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 200, damping: 20 });

  const rotateX = useTransform(smoothY, [0, 1], [tiltDegree, -tiltDegree]);
  const rotateY = useTransform(smoothX, [0, 1], [-tiltDegree, tiltDegree]);

  const glowBackground = useTransform(
    [smoothX, smoothY],
    ([x, y]: number[]) =>
      `radial-gradient(400px circle at ${x * 100}% ${y * 100}%, rgba(var(--glow-rgb), 0.07), transparent 60%)`
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  const Component = motion[as];

  return (
    <Component
      ref={ref}
      className={`relative ${className}`}
      style={{
        ...style,
        rotateX,
        rotateY,
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        scale: 1.015,
        boxShadow: glow ? "var(--glow-shadow-hover)" : "var(--card-shadow-hover)",
        transition: { duration: 0.25 },
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Mouse-follow glow highlight */}
      <motion.div
        className="absolute inset-0 rounded-[inherit] pointer-events-none z-0"
        style={{ background: glowBackground, opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </Component>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({ children, className, staggerDelay = 0.06 }: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 24,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
