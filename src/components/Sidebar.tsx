import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, User, GraduationCap, FileText, CalendarRange,
  MessageSquare, Calendar, Activity,
  Book, Globe, LogOut, Settings, Info, ChevronDown, Menu, X
} from "lucide-react";
import { cn } from "../lib/utils";
import { useNavigation } from "../context/NavigationContext";

type NavLeafItem = {
  name: string;
  path: string;
  icon: typeof Home;
};

type NavGroupItem = {
  name: string;
  icon: typeof Info;
  subItems: Array<{ name: string; path: string }>;
};

type NavItem = NavLeafItem | NavGroupItem;

const navItems = [
  { name: "主页", path: "/home", icon: Home },
  { name: "学生详情", path: "/details", icon: User },
  { name: "成绩", path: "/grades", icon: GraduationCap },
  { name: "成绩报告", path: "/reports", icon: FileText },
  { name: "考试信息", path: "/exams", icon: CalendarRange },
  { name: "我的报告评论", path: "/comments", icon: MessageSquare },
  { name: "周时间表", path: "/schedule", icon: Calendar },
  { name: "活动", path: "/activities", icon: Activity },
  { name: "日记簿", path: "/diary", icon: Book },
  { name: "网站", path: "/websites", icon: Globe },
  { 
    name: "关于", 
    icon: Info, 
    subItems: [
      { name: "技术说明", path: "/about/tech" },
      { name: "法律声明", path: "/about/legal" },
      { name: "隐私政策", path: "/about/privacy" },
      { name: "更新日志", path: "/about/app" },
    ]
  }
] satisfies NavItem[];

function isLeafItem(item: NavItem): item is NavLeafItem {
  return "path" in item;
}

function isGroupItem(item: NavItem): item is NavGroupItem {
  return "subItems" in item;
}

function SidebarGroup({
  item,
  handleNavClick,
  mobile = false,
}: {
  item: NavGroupItem;
  handleNavClick: (targetPath: string, options?: { navigateNow?: boolean }) => void;
  mobile?: boolean;
}) {
  const location = useLocation();
  const isActiveGroup = item.subItems.some((sub) => location.pathname.startsWith(sub.path));
  const [isOpen, setIsOpen] = useState(isActiveGroup);

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full rounded-xl font-medium transition-all duration-200 group touch-manipulation",
          mobile ? "px-4 py-3.5 text-[14px] min-h-[52px]" : "px-3 py-2.5 text-[13px]",
          isActiveGroup ? "font-semibold text-[var(--accent)]" : "text-[var(--text-secondary)]"
        )}
        style={mobile ? { background: isActiveGroup ? "var(--accent-soft)" : "transparent" } : undefined}
      >
        <div className="flex items-center gap-3">
          <item.icon
            className={cn("transition-colors duration-200", mobile ? "w-5 h-5" : "w-[18px] h-[18px]")}
            style={{ color: isActiveGroup ? "var(--accent)" : "var(--text-tertiary)" }}
          />
          <span>{item.name}</span>
        </div>
        <ChevronDown
          className={cn("w-4 h-4 transition-transform duration-200", isOpen ? "rotate-180" : "")}
          style={{ color: "var(--text-tertiary)" }}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={cn(mobile ? "pl-4 pr-0 py-2 space-y-1" : "pl-9 pr-1 py-1 space-y-0.5")}>
              {item.subItems.map((sub) => {
                if (mobile) {
                  const isActive = location.pathname.startsWith(sub.path);
                  return (
                    <button
                      key={sub.path}
                      type="button"
                      onClick={() => handleNavClick(sub.path, { navigateNow: true })}
                      className="w-full flex items-center relative group transition-all duration-200 touch-manipulation px-4 py-3 rounded-2xl text-[13px] min-h-[48px]"
                      style={{
                        color: isActive ? "var(--accent)" : "var(--text-secondary)",
                        background: isActive ? "var(--accent-soft)" : "transparent",
                      }}
                    >
                      <span className="relative z-10">{sub.name}</span>
                    </button>
                  );
                }

                return (
                  <NavLink
                    key={sub.path}
                    to={sub.path}
                    onClick={() => handleNavClick(sub.path)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center relative group transition-all duration-200 touch-manipulation px-3 py-2 rounded-lg text-[12px]",
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
                            layoutId="sidebar-sub-active"
                            className="absolute inset-0 rounded-lg"
                            style={{
                              background: "var(--accent-soft)",
                            }}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">{sub.name}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateWithDirection } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    sessionStorage.removeItem("activitiesData");
    sessionStorage.removeItem("timetableData");
    sessionStorage.removeItem("examsData");
    sessionStorage.removeItem("examsAutoSyncAt");
    localStorage.removeItem("authToken");
    navigate("/");
  };

  const handleNavClick = (targetPath: string, options?: { navigateNow?: boolean }) => {
    if (targetPath === location.pathname) {
      setMobileMenuOpen(false);
      return;
    }
    navigateWithDirection(targetPath, location.pathname);
    if (options?.navigateNow) {
      navigate(targetPath);
    }
    setMobileMenuOpen(false);
  };

  const mobileBottomItems = [
    navItems.filter(isLeafItem).find(i => i.path === "/home"),
    navItems.filter(isLeafItem).find(i => i.path === "/exams"),
    navItems.filter(isLeafItem).find(i => i.path === "/schedule"),
  ].filter((item): item is NavLeafItem => Boolean(item));

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex w-64 h-screen flex-col pt-8 pb-5 px-3 shrink-0 border-r glass"
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
              background: "#2E5CA8",
              boxShadow: "0 2px 12px rgba(46,92,168,0.3)",
            }}
            whileHover={{ scale: 1.08, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <img src="/logo_ulc.png" alt="ULC" className="w-7 h-7 object-contain relative z-10" />
          </motion.div>
          <span className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Student Portal
          </span>
        </motion.div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto space-y-0.5 pr-1 hide-scrollbar">
          {navItems.map((item) => {
            if (isGroupItem(item)) {
              return (
                <div key={item.name}>
                  <SidebarGroup item={item} handleNavClick={handleNavClick} />
                </div>
              );
            }
            return (
              <NavLink
                key={item.path}
                to={item.path!}
                onClick={() => handleNavClick(item.path!)}
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
            );
          })}
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

      {/* Mobile Bottom Navigation */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t pb-[calc(env(safe-area-inset-bottom)+0.35rem)]"
        style={{ background: "var(--glass-bg)", borderColor: "var(--border)", backdropFilter: "blur(var(--glass-blur))", WebkitBackdropFilter: "blur(var(--glass-blur))" }}
      >
        <div className="flex items-end justify-around gap-1 px-2 pt-2">
          {mobileBottomItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavClick(item.path, { navigateNow: true })}
                className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 min-h-[58px] relative touch-manipulation"
                style={{ background: isActive ? "var(--accent-soft)" : "transparent" }}
              >
                <motion.div
                  animate={{ 
                    y: isActive ? -2 : 0,
                    scale: isActive ? 1.1 : 1
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <item.icon
                    className="w-[22px] h-[22px]"
                    style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)" }}
                  />
                </motion.div>
                <motion.span
                  className="text-[10px] font-medium leading-none"
                  initial={false}
                  animate={{ opacity: isActive ? 1 : 0.72 }}
                  style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)" }}
                >
                  {item.name}
                </motion.span>
              </button>
            );
          })}
          
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 min-h-[58px] relative touch-manipulation"
            style={{ background: mobileMenuOpen ? "var(--accent-soft)" : "transparent" }}
          >
            <motion.div
              animate={{ scale: mobileMenuOpen ? 1.1 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Menu
                className="w-6 h-6"
                style={{ color: mobileMenuOpen ? "var(--accent)" : "var(--text-tertiary)" }}
              />
            </motion.div>
            <motion.span
              className="text-[10px] font-medium leading-none"
              animate={{ 
                opacity: mobileMenuOpen ? 1 : 0.72,
              }}
              style={{ color: mobileMenuOpen ? "var(--accent)" : "var(--text-tertiary)" }}
            >
              菜单
            </motion.span>
          </button>
        </div>
      </div>

      {/* Mobile Full Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass rounded-t-3xl flex flex-col max-h-[min(88dvh,720px)]"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#2E5CA8" }}>
                    <img src="/logo_ulc.png" alt="ULC" className="w-5 h-5 object-contain" />
                  </div>
                  <span className="font-semibold text-[15px]" style={{ color: "var(--text-primary)" }}>
                    Student Portal
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 touch-manipulation"
                >
                  <X className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-1 pb-[calc(6rem+env(safe-area-inset-bottom))]">
                {navItems.map((item) => {
                  if (isGroupItem(item)) {
                    return (
                      <div key={item.name}>
                        <SidebarGroup item={item} handleNavClick={handleNavClick} mobile />
                      </div>
                    );
                  }
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleNavClick(item.path, { navigateNow: true })}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[14px] font-medium transition-all touch-manipulation min-h-[52px]"
                      style={{ 
                        background: location.pathname === item.path ? "var(--accent-soft)" : "transparent",
                        color: location.pathname === item.path ? "var(--accent)" : "var(--text-secondary)"
                      }}
                    >
                      <item.icon className="w-5 h-5" style={{ color: location.pathname === item.path ? "var(--accent)" : "var(--text-tertiary)" }} />
                      {item.name}
                    </button>
                  );
                })}
                
                <div className="my-4 border-t" style={{ borderColor: "var(--border)" }} />
                
                <button
                  type="button"
                  onClick={() => handleNavClick("/settings", { navigateNow: true })}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[14px] font-medium transition-all touch-manipulation min-h-[52px]"
                  style={{ 
                    background: location.pathname === "/settings" ? "var(--accent-soft)" : "transparent",
                    color: location.pathname === "/settings" ? "var(--accent)" : "var(--text-secondary)"
                  }}
                >
                  <Settings className="w-5 h-5" style={{ color: location.pathname === "/settings" ? "var(--accent)" : "var(--text-tertiary)" }} />
                  设置
                </button>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[14px] font-medium transition-all touch-manipulation min-h-[52px]"
                  style={{ color: "var(--danger)" }}
                >
                  <LogOut className="w-5 h-5" />
                  退出登录
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
