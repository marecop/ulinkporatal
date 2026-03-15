import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Scale, FileCode2, Info } from 'lucide-react';

const PageWrapper = ({ children, title, icon: Icon }: any) => (
  <div className="p-6 max-w-4xl mx-auto space-y-8">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 mb-8"
    >
      <div className="p-3 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h1>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[var(--text-secondary)]"
    >
      {children}
    </motion.div>
  </div>
);

export const TechSpecs = () => (
  <PageWrapper title="技术说明 (Technical Specifications)" icon={FileCode2}>
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">1. 架构概述 (Architecture Overview)</h2>
        <p>本系统采用现代化的前后端分离架构，旨在提供高性能、高可用且安全的学生门户体验。</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong>前端 (Frontend):</strong> 基于 React 19 和 Vite 构建，采用 Tailwind CSS 进行响应式样式设计，结合 Motion 进行流畅的动画过渡。</li>
          <li><strong>后端 (Backend):</strong> 采用 Node.js (Express) 作为中间层，负责与 Engage 官方系统进行安全的数据交互与会话管理。</li>
          <li><strong>数据持久化 (Persistence):</strong> 使用 SQLite 进行本地缓存与配置管理，PostgreSQL 用于云端扩展支持。</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">2. 安全与认证 (Security & Authentication)</h2>
        <p>系统严格遵循最小权限原则，所有敏感数据均经过加密处理。</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong>会话管理:</strong> 采用 HttpOnly 和 Secure 标记的加密 Cookie 进行会话维持，防范 XSS 和 CSRF 攻击。</li>
          <li><strong>凭证加密:</strong> Microsoft OAuth 令牌使用 AES-256-GCM 算法进行高强度加密存储。</li>
          <li><strong>数据脱敏:</strong> 传输过程全程采用 TLS 1.3 加密，确保数据在传输过程中的机密性与完整性。</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">3. 性能优化 (Performance Optimization)</h2>
        <p>通过多级缓存与预加载策略，显著提升页面响应速度。</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong>静态资源:</strong> 启用 Brotli/Gzip 压缩，配合强缓存策略。</li>
          <li><strong>API 缓存:</strong> 针对高频且非实时数据（如课表、活动）实施内存级与持久化双重缓存。</li>
        </ul>
      </section>
    </div>
  </PageWrapper>
);

export const LegalNotice = () => (
  <PageWrapper title="法律声明 (Legal Notice)" icon={Scale}>
    <div className="space-y-6">
      <p>欢迎使用本学生门户系统。在使用本系统前，请仔细阅读以下法律声明。</p>
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">1. 免责声明</h2>
        <p>本系统作为第三方辅助工具，旨在优化学生访问学校官方 Engage 系统的体验。本系统提供的数据（包括但不限于成绩、课表、考试安排等）均抓取自官方系统。我们不对数据的绝对准确性、实时性或完整性提供任何明示或暗示的保证。如因数据延迟或错误导致的任何直接或间接损失，本系统及开发者概不负责。</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">2. 知识产权</h2>
        <p>本系统的源代码、UI 设计、交互逻辑等均受版权法保护。未经授权，任何人不得擅自复制、修改、反编译或用于商业用途。学校官方系统的商标、Logo 及相关数据版权归原学校或系统供应商所有。</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">3. 服务变更与终止</h2>
        <p>我们保留在不事先通知的情况下，随时修改、暂停或终止本系统部分或全部服务的权利。</p>
      </section>
    </div>
  </PageWrapper>
);

export const PrivacyPolicy = () => (
  <PageWrapper title="隐私政策 (Privacy Policy)" icon={ShieldCheck}>
    <div className="space-y-6">
      <p>您的隐私对我们至关重要。本隐私政策解释了我们如何收集、使用和保护您的个人信息。</p>
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">1. 信息收集</h2>
        <p>当您使用本系统时，我们需要收集以下信息以提供服务：</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong>登录凭证:</strong> 您的 Engage 账号和密码（仅用于向官方系统发起认证请求，本系统<strong>绝不</strong>持久化存储您的密码）。</li>
          <li><strong>基础数据:</strong> 您的姓名、学号、班级、成绩、课表等（这些数据缓存在您的本地浏览器或我们的临时缓存服务器中，以提升加载速度）。</li>
          <li><strong>第三方授权:</strong> 如果您绑定了 Microsoft 账号，我们将存储加密后的 OAuth 令牌，用于同步日历等功能。</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">2. 信息使用</h2>
        <p>我们收集的信息仅用于以下目的：</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>为您提供、维护和改进本系统的各项功能。</li>
          <li>处理您的请求并提供客户支持。</li>
          <li>在您授权的情况下，同步数据至第三方服务（如 Microsoft Calendar）。</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">3. 信息安全</h2>
        <p>我们采用业界标准的安全措施（如 AES-256 加密、HTTPS 传输）来保护您的个人信息，防止未经授权的访问、使用或泄露。但请注意，互联网传输无法保证 100% 的绝对安全。</p>
      </section>
    </div>
  </PageWrapper>
);

export const AboutApp = () => (
  <PageWrapper title="关于程序 (About the App)" icon={Info}>
    <div className="space-y-6">
      <p>本程序是一个由学生为学生打造的现代化校园门户客户端。</p>
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">初衷</h2>
        <p>传统的校园系统往往存在界面陈旧、加载缓慢、移动端适配差等问题。本程序的诞生旨在通过现代 Web 技术，重新构建一个美观、流畅、高效的学生门户，让获取校园信息变得更加愉悦。</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">核心特性</h2>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>✨ <strong>现代化 UI:</strong> 采用毛玻璃效果和流畅的动画，提供极佳的视觉体验。</li>
          <li>⚡ <strong>极致性能:</strong> 优化的数据抓取和缓存策略，告别漫长的等待。</li>
          <li>📱 <strong>全端适配:</strong> 完美支持桌面端和移动端浏览。</li>
          <li>📅 <strong>生态整合:</strong> 支持将考试安排一键同步至 Microsoft 日历。</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">版本信息</h2>
        <p>当前版本: v1.0.0</p>
        <p>构建时间: 2026年</p>
      </section>
    </div>
  </PageWrapper>
);
