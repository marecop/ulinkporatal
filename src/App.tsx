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
import { Target, FileText, MessageSquare, ShieldAlert, Book } from "lucide-react";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/details" element={<StudentDetails />} />
          <Route path="/grades" element={<Grades />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/exams" element={<ExamSchedule />} />
          <Route path="/websites" element={<Websites />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/settings" element={<Settings />} />
          
          <Route path="/scores" element={<GenericPage title="分数" description="查看您的各项作业和考试分数" icon={Target} />} />
          <Route path="/reports" element={<GenericPage title="成绩报告" description="查看和下载您的官方成绩单" icon={FileText} />} />
          <Route path="/extra" element={<Navigate to="/exams" replace />} />
          <Route path="/comments" element={<GenericPage title="我的报告评论" description="查看导师对您的评价" icon={MessageSquare} />} />
          <Route path="/dms" element={<GenericPage title="我的DMS" description="直接消息与通知系统" icon={ShieldAlert} />} />
          <Route path="/diary" element={<GenericPage title="日记簿" description="个人学习日志与记录" icon={Book} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
