import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import StudentDetails from "./pages/StudentDetails";
import Grades from "./pages/Grades";
import Schedule from "./pages/Schedule";
import Websites from "./pages/Websites";
import Activities from "./pages/Activities";
import Settings from "./pages/Settings";
import GenericPage from "./pages/GenericPage";
import ExamSchedule from "./pages/ExamSchedule";
import { TechSpecs, LegalNotice, PrivacyPolicy, AboutApp } from "./pages/AboutPages";
import { FileText, MessageSquare, Book, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PublicPrivacy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen noise-overlay" style={{ background: "var(--bg-secondary)" }}>
      <div className="max-w-4xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
        <button 
          onClick={() => navigate(-1)}
          className="mb-4 sm:mb-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[14px] font-medium transition-colors touch-manipulation"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <PrivacyPolicy />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/privacy" element={<PublicPrivacy />} />
        
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/details" element={<StudentDetails />} />
          <Route path="/grades" element={<Grades />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/exams" element={<ExamSchedule />} />
          <Route path="/websites" element={<Websites />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/settings" element={<Settings />} />
          
          <Route path="/reports" element={<GenericPage title="成绩报告" description="查看和下载您的官方成绩单" icon={FileText} />} />
          <Route path="/extra" element={<Navigate to="/exams" replace />} />
          <Route path="/comments" element={<GenericPage title="我的报告评论" description="查看导师对您的评价" icon={MessageSquare} />} />
          <Route path="/diary" element={<GenericPage title="日记簿" description="个人学习日志与记录" icon={Book} />} />

          {/* About Pages */}
          <Route path="/about/tech" element={<TechSpecs />} />
          <Route path="/about/legal" element={<LegalNotice />} />
          <Route path="/about/privacy" element={<PrivacyPolicy />} />
          <Route path="/about/app" element={<AboutApp />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
