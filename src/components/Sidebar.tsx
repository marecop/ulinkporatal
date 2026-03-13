import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, User, GraduationCap, Target, FileText, Info,
  MessageSquare, ShieldAlert, Calendar, Activity,
  Book, Globe, LogOut, Settings,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useNavigation } from "../context/NavigationContext";

const navItems = [
  { name: "主页", path: "/home", icon: Home },
  { name: "学生详情", path: "/details", icon: User },
  { name: "成绩", path: "/grades", icon: GraduationCap },
  { name: "分数", path: "/scores", icon: Target },
  { name: "成绩报告", path: "/reports", icon: FileText },
  { name: "额外信息", path: "/extra", icon: Info },
  { name: "我的报告评论", path: "/comments", icon: MessageSquare },
  { name: "我的DMS", path: "/dms", icon: ShieldAlert },
  { name: "周时间表", path: "/schedule", icon: Calendar },
  { name: "活动", path: "/activities", icon: Activity },
  { name: "日记簿", path: "/diary", icon: Book },
  { name: "网站", path: "/websites", icon: Globe },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateWithDirection } = useNavigation();

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    sessionStorage.removeItem("activitiesData");
    sessionStorage.removeItem("timetableData");
    localStorage.removeItem("authToken");
    navigate("/");
  };

  const handleNavClick = (targetPath: string) => {
    if (targetPath === location.pathname) return;
    navigateWithDirection(targetPath, location.pathname);
  };

  return (
    <aside
      className="w-64 h-screen flex flex-col pt-8 pb-5 px-3 shrink-0 border-r glass"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <motion.div
        className="flex items-center gap-3 px-3 mb-8"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "0 2px 12px rgba(var(--glow-rgb), 0.2)",
          }}
          whileHover={{ scale: 1.08, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <GraduationCap className="w-5 h-5 text-white relative z-10" />
        </motion.div>
        <span className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Student Portal
        </span>
      </motion.div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto space-y-0.5 pr-1 hide-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => handleNavClick(item.path)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative group",
                isActive ? "font-semibold" : ""
              )
            }
            style={({ isActive }) => ({
              color: isActive ? "var(--accent)" : "var(--text-secondary)",
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: "var(--accent-soft)",
                      boxShadow: "inset 0 0 0 1px var(--glow-border)",
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <motion.div
                  className="flex items-center gap-3 w-full relative z-10"
                  initial={false}
                  whileHover={{ x: isActive ? 0 : 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <item.icon
                    className="w-[18px] h-[18px] transition-colors duration-200"
                    style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)" }}
                  />
                  <span>{item.name}</span>
                </motion.div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="pt-3 mt-2 space-y-1 border-t" style={{ borderColor: "var(--border)" }}>
        {/* Settings */}
        <NavLink
          to="/settings"
          onClick={() => handleNavClick("/settings")}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium transition-all duration-200 relative",
              isActive ? "font-semibold" : ""
            )
          }
          style={({ isActive }) => ({
            color: isActive ? "var(--accent)" : "var(--text-secondary)",
          })}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: "var(--accent-soft)", boxShadow: "inset 0 0 0 1px var(--glow-border)" }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <motion.div
                className="flex items-center gap-3 w-full relative z-10"
                whileHover={{ x: isActive ? 0 : 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Settings className="w-[18px] h-[18px]" style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)" }} />
                <span>设置</span>
              </motion.div>
            </>
          )}
        </NavLink>

        {/* Logout */}
        <motion.button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium transition-colors duration-200"
          style={{ color: "var(--danger)" }}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <LogOut className="w-[18px] h-[18px]" />
          退出登录
        </motion.button>
      </div>
    </aside>
  );
}
