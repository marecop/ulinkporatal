import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, User, GraduationCap, FileText, CalendarRange,
  MessageSquare, Calendar, Activity,
  Book, Globe, LogOut, Settings, Info, ChevronDown, Menu, X
} from "lucide-react";
import { cn } from "../lib/utils";
import { useNavigation } from "../context/NavigationContext";

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
      { name: "关于程序", path: "/about/app" },
    ]
  }
];

function SidebarGroup({ item, handleNavClick }: any) {
  const location = useLocation();
  const isActiveGroup = item.subItems.some((sub: any) => location.pathname.startsWith(sub.path));
  const [isOpen, setIsOpen] = useState(isActiveGroup);

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group",
          isActiveGroup ? "font-semibold text-[var(--accent)]" : "text-[var(--text-secondary)]"
        )}
      >
        <div className="flex items-center gap-3">
          <item.icon
            className="w-[18px] h-[18px] transition-colors duration-200"
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
            <div className="pl-9 pr-1 py-1 space-y-0.5">
              {item.subItems.map((sub: any) => (
                <NavLink
                  key={sub.path}
                  to={sub.path}
                  onClick={() => handleNavClick(sub.path)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 relative group",
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
              ))}
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

  const handleNavClick = (targetPath: string) => {
    if (targetPath === location.pathname) {
      setMobileMenuOpen(false);
      return;
    }
    navigateWithDirection(targetPath, location.pathname);
    setMobileMenuOpen(false);
  };

  const mobileBottomItems = [
    navItems.find(i => i.path === "/home"),
    navItems.find(i => i.path === "/grades"),
    navItems.find(i => i.path === "/schedule"),
  ];

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
            if (item.subItems) {
              return <SidebarGroup key={item.name} item={item} handleNavClick={handleNavClick} />;
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t pb-[env(safe-area-inset-bottom)]" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-around px-2 py-2">
          {mobileBottomItems.map((item) => {
            if (!item) return null;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path!)}
                className="flex flex-col items-center justify-center w-16 h-12 relative"
              >
                <motion.div
                  animate={{ 
                    y: isActive ? -4 : 0,
                    scale: isActive ? 1.1 : 1
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <item.icon
                    className="w-6 h-6"
                    style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)" }}
                  />
                </motion.div>
                <motion.span
                  className="text-[10px] font-medium absolute bottom-0"
                  initial={false}
                  animate={{ 
                    opacity: isActive ? 1 : 0.7,
                    y: isActive ? 4 : 8
                  }}
                  style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)" }}
                >
                  {item.name}
                </motion.span>
              </button>
            );
          })}
          
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center w-16 h-12 relative"
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
              className="text-[10px] font-medium absolute bottom-0"
              animate={{ 
                opacity: mobileMenuOpen ? 1 : 0.7,
                y: mobileMenuOpen ? 4 : 8
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
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass rounded-t-3xl flex flex-col max-h-[85vh]"
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
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-full bg-black/5 dark:bg-white/10"
                >
                  <X className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-1 pb-24">
                {navItems.map((item) => {
                  if (item.subItems) {
                    return <SidebarGroup key={item.name} item={item} handleNavClick={handleNavClick} />;
                  }
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavClick(item.path!)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[14px] font-medium transition-all"
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
                  onClick={() => handleNavClick("/settings")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[14px] font-medium transition-all"
                  style={{ 
                    background: location.pathname === "/settings" ? "var(--accent-soft)" : "transparent",
                    color: location.pathname === "/settings" ? "var(--accent)" : "var(--text-secondary)"
                  }}
                >
                  <Settings className="w-5 h-5" style={{ color: location.pathname === "/settings" ? "var(--accent)" : "var(--text-tertiary)" }} />
                  设置
                </button>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[14px] font-medium transition-all"
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
