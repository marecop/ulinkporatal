import { motion } from "motion/react";
import { type ReactNode } from "react";
import { useNavigation } from "../context/NavigationContext";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

export function PageTransition({ children, className }: PageTransitionProps) {
  const { direction } = useNavigation();
  const yOffset = direction === 0 ? 30 : direction * 60;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: yOffset,
        scale: 0.98,
        filter: "blur(6px)",
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      }}
      exit={{
        opacity: 0,
        y: -yOffset * 0.5,
        scale: 0.97,
        filter: "blur(4px)",
      }}
      transition={springTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
