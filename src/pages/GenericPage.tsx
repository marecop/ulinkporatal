import { PageTransition } from "../components/PageTransition";
import { StaggerContainer, StaggerItem } from "../components/MotionCard";
import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";

interface GenericPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function GenericPage({ title, description, icon: Icon }: GenericPageProps) {
  return (
    <PageTransition>
      <StaggerContainer className="max-w-4xl mx-auto space-y-6">
        <StaggerItem>
          <div className="flex items-center space-x-4">
            <motion.div
              className="p-3 rounded-xl"
              style={{ background: "var(--accent-soft)" }}
              whileHover={{ scale: 1.06, rotate: 3 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Icon className="w-8 h-8" style={{ color: "var(--accent)" }} />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{title}</h1>
              <p className="mt-1 text-[14px]" style={{ color: "var(--text-secondary)" }}>{description}</p>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div
            className="p-12 rounded-2xl border text-center"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
          >
            <Icon className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: "var(--text-tertiary)" }} />
            <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>即将推出</h2>
            <p className="text-[14px] max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
              此功能正在开发中。我们正在努力为您带来更好的体验，敬请期待。
            </p>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
