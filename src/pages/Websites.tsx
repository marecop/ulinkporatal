import { PageTransition } from "../components/PageTransition";
import { StaggerContainer, StaggerItem, MotionCard } from "../components/MotionCard";
import { motion } from "motion/react";
import { ExternalLink } from "lucide-react";

const links = [
  { title: "学校官网", url: "https://www.ulinkcollege.com", description: "ULink College 官方网站" },
  { title: "Engage Portal", url: "https://ulinkcollege.engagehosted.cn", description: "原版 ULC Engage 学生门户" },
  { title: "广州优联国际学校", url: "https://www.guiscn.com", description: "GUIS 官方网站" },
  { title: "Landing Page", url: "https://guischina.sharepoint.com/sites/ulcstudentportal", description: "GUIS 学生着陆页面" },
];

export default function Websites() {
  return (
    <PageTransition>
      <StaggerContainer className="max-w-4xl mx-auto space-y-6">
        <StaggerItem>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>相关网站</h1>
        </StaggerItem>

        <div className="grid gap-4 md:grid-cols-2">
          {links.map((link, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
                visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 24 } },
              }}
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="block">
                <MotionCard
                  delay={0.05 * index}
                  className="rounded-2xl border p-6 h-full cursor-pointer"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                        {link.title}
                      </h3>
                      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {link.description}
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
                  </div>
                </MotionCard>
              </a>
            </motion.div>
          ))}
        </div>
      </StaggerContainer>
    </PageTransition>
  );
}
