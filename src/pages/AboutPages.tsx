import React from "react";
import { motion } from "motion/react";
import { ShieldCheck, Scale, FileCode2, Info } from "lucide-react";
import { PageTransition } from "../components/PageTransition";

function PageWrapper({
  children,
  title,
  subtitle,
  icon: Icon,
  tags,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  icon: typeof ShieldCheck;
  tags: string[];
}) {
  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-4 py-2 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border p-5 sm:p-7"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              <Icon className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[28px] font-bold tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
                {title}
              </h1>
              <p className="text-[14px] leading-6 mt-2" style={{ color: "var(--text-secondary)" }}>
                {subtitle}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4 mt-5">
          {children}
        </div>
      </div>
    </PageTransition>
  );
}

function SectionCard({
  title,
  paragraphs,
  bullets,
}: {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5 sm:p-6"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", boxShadow: "var(--card-shadow)" }}
    >
      <h2 className="text-[18px] font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {paragraphs?.map((paragraph) => (
        <p key={paragraph} className="text-[14px] leading-7 mt-3" style={{ color: "var(--text-secondary)" }}>
          {paragraph}
        </p>
      ))}
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-3">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3 text-[14px] leading-6" style={{ color: "var(--text-secondary)" }}>
              <span
                className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                style={{ background: "var(--accent)" }}
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}

export const TechSpecs = () => (
  <PageWrapper
    title="技术说明"
    subtitle="这份说明介绍本门户的前后端结构、数据来源、缓存策略以及考试同步机制，帮助你理解系统实际是如何工作的。"
    icon={FileCode2}
    tags={["React 19", "Vite", "Express", "Postgres", "Microsoft Graph"]}
  >
    <SectionCard
      title="1. 系统架构"
      paragraphs={[
        "前端使用 React 19 与 Vite 构建，负责页面渲染、动画交互、主题切换以及移动端适配。后端使用 Express 作为聚合层，统一代理 Engage 与 Microsoft Graph 请求，并把考试资料持久化到数据库。",
        "在部署环境中，前端构建产物由静态站点输出，后端接口通过 Vercel Serverless Function 提供。这样可以让页面加载保持轻量，同时把认证逻辑和第三方访问限制在服务端。"
      ]}
      bullets={[
        "课程表、活动、学生详情等内容来自学校 Engage 系统。",
        "考试资料支持从 SharePoint 文件与临时 Mock Exam 样本中解析。",
        "前端页面默认从数据库或缓存读取，避免每次打开页面都重复抓取原始文件。"
      ]}
    />

    <SectionCard
      title="2. 数据刷新与缓存"
      paragraphs={[
        "系统会在每日首次登录或首次读取考试资料时检查刷新状态。若是 Mock Exam 样本数据，则会在当天重新解析并写回数据库；如果已经绑定 Microsoft 账号，则可通过后端同步 SharePoint 文件。",
        "前端也会对课表、活动与考试结果做浏览器级缓存，以减少重复请求和等待时间。缓存会依日期失效，避免旧考试数据一直留在界面上。"
      ]}
      bullets={[
        "考试页面按日期分组并按开始时间排序。",
        "主页只读取下一场考试和今日融合后的时间线，不会阻塞周课表页面。",
        "3 月 24 日之后，Mock Exam 临时数据会自动过期并清除。"
      ]}
    />

    <SectionCard
      title="3. 安全与边界"
      paragraphs={[
        "登录学校门户时，密码仅用于向学校官方登录端点发起认证，请求成功后只保留经过签名的会话 Cookie，不会把明文密码写入数据库。",
        "如果绑定 Microsoft，访问令牌与刷新令牌会在服务端加密后再落库。系统只请求与考试文件读取相关的最小必要权限，不会擅自访问你的其他 Microsoft 数据。"
      ]}
      bullets={[
        "门户会话通过 HttpOnly Cookie 管理，前端脚本无法直接读取。",
        "所有第三方请求都通过 HTTPS 发送。",
        "考试解析结果仅保留页面展示所需字段，例如科目、试卷、时间、房间与监管信息。"
      ]}
    />

    <SectionCard
      title="4. 已知限制"
      bullets={[
        "学校上游页面结构或字段名称一旦变动，相关抓取逻辑可能需要跟着调整。",
        "SharePoint 文件命名方式如果与当前识别规则差异太大，可能需要补充分类词或解析规则。",
        "部分动画和玻璃拟态效果在低性能移动设备上会自动简化，以保证触控与滚动优先。"
      ]}
    />
  </PageWrapper>
);

export const LegalNotice = () => (
  <PageWrapper
    title="法律声明"
    subtitle="本页面说明本程序的服务性质、责任边界与用户使用时需要理解的基本条款。"
    icon={Scale}
    tags={["第三方工具", "非学校官方", "仅供辅助使用"]}
  >
    <SectionCard
      title="1. 服务性质"
      paragraphs={[
        "本程序是为提升学生访问体验而制作的第三方门户工具，并非学校官方发布的正式系统。界面优化、移动端适配、考试聚合展示等功能，属于在官方数据来源之上的二次整理与呈现。"
      ]}
    />

    <SectionCard
      title="2. 数据来源与准确性"
      paragraphs={[
        "成绩、课表、活动、考试安排等信息原则上来自学校官方 Engage 页面、SharePoint 文件或经用户授权的 Microsoft Graph 接口。虽然系统会尽量及时刷新，但仍可能受到上游延迟、文件更新滞后、字段异常或解析失败的影响。"
      ]}
      bullets={[
        "请以学校官方通知、监考安排或教师说明为最终依据。",
        "若页面显示与官方文件不一致，应优先相信学校正式渠道。",
        "开发者不对因上游数据错误、延迟或临时不可用造成的损失承担责任。"
      ]}
    />

    <SectionCard
      title="3. 使用者义务"
      bullets={[
        "请仅使用你本人有权访问的学校账号与 Microsoft 账号。",
        "请勿尝试绕过学校权限限制、批量抓取他人数据或将本程序用于非授权用途。",
        "若你发现明显的安全问题、权限异常或数据泄露风险，应立即停止使用并通知维护者。"
      ]}
    />

    <SectionCard
      title="4. 知识产权与服务调整"
      paragraphs={[
        "本程序的界面实现、交互逻辑与源代码归开发者所有；学校系统的名称、Logo、原始数据和文档版权归学校或原平台方所有。开发者保留在不另行通知的情况下修改、暂停或下线部分功能的权利。"
      ]}
    />
  </PageWrapper>
);

export const PrivacyPolicy = () => (
  <PageWrapper
    title="隐私政策"
    subtitle="这份政策适用于登录页左下角可打开的隐私政策，以及应用内“关于 → 隐私政策”页面。它说明系统会处理哪些数据、为什么处理，以及你可以如何控制这些数据。"
    icon={ShieldCheck}
    tags={["适用于登录页", "不保存明文密码", "支持解绑 Microsoft"]}
  >
    <SectionCard
      title="1. 我们会处理哪些数据"
      bullets={[
        "登录请求中的 Engage 账号与密码，但密码只用于即时向学校官方登录端发起认证，不会被持久化保存。",
        "登录后学校返回的会话 Cookie，用于在后续请求中代表你读取学生详情、课表、活动和考试信息。",
        "学生基础字段，例如姓名、学号、班级、课表、成绩与考试安排，仅在提供相关功能所需时处理。",
        "如果你主动绑定 Microsoft，我们会存储加密后的 access token、refresh token、邮箱和最近同步状态。"
      ]}
    />

    <SectionCard
      title="2. 这些数据会如何被使用"
      bullets={[
        "用于完成登录、维持会话和向你展示门户信息。",
        "用于解析考试文件，并在首页、考试页面、时间表页面中展示与你本人相关的考试安排。",
        "用于在你授权的前提下访问 SharePoint 考试文件，而不会主动读取与你当前功能无关的数据。",
        "用于故障排查、同步状态提示和最基本的缓存优化。"
      ]}
    />

    <SectionCard
      title="3. 数据保存位置与时长"
      paragraphs={[
        "浏览器端会缓存部分页面数据，例如活动、课表和考试列表，以减少重复加载。服务端会保存 Microsoft 绑定信息与解析后的考试结果，便于后续直接读取数据库而不是反复解析原始文件。",
        "Mock Exam 临时考试资料会根据有效期自动清理；Microsoft 绑定也可以在设置页手动解绑。"
      ]}
      bullets={[
        "不保存明文 Engage 密码。",
        "考试样本数据超过有效期后会自动过期清除。",
        "你可以通过设置页随时解除 Microsoft 绑定。"
      ]}
    />

    <SectionCard
      title="4. 安全措施"
      bullets={[
        "门户会话通过签名 Cookie 管理，避免前端脚本直接读取敏感认证内容。",
        "Microsoft 令牌在服务端加密后再写入数据库。",
        "所有外部请求通过 HTTPS 发送，尽量减少传输过程的风险。"
      ]}
    />

    <SectionCard
      title="5. 你的选择与提醒"
      paragraphs={[
        "如果你不同意本政策，可以停止使用本程序，或只使用不涉及 Microsoft 绑定的基础功能。继续登录并使用相关能力，表示你理解并同意本政策中描述的数据处理方式。"
      ]}
      bullets={[
        "登录页左下角的“隐私政策”会进入这份同一内容。",
        "若你发现数据异常、权限错误或想撤回授权，可在设置页解绑 Microsoft。",
        "涉及考试安排时，请始终以学校官方通知为最终依据。"
      ]}
    />
  </PageWrapper>
);

export const AboutApp = () => (
  <PageWrapper
    title="关于程序"
    subtitle="这是一套围绕学生真实使用场景打造的校园门户重构界面，目标是在不改变数据来源的前提下，把常用信息整理得更快、更清楚、也更适合移动端。"
    icon={Info}
    tags={["学生门户重构", "移动端优先", "考试聚合展示"]}
  >
    <SectionCard
      title="1. 项目初衷"
      paragraphs={[
        "原始校园门户在移动设备上往往存在页面拥挤、交互密集、加载链路长的问题。本程序希望在保留学校官方数据来源的同时，重新整理出更适合学生每天使用的首页、周时间表、考试页和设置页。",
        "它不是为了替代学校系统，而是为了把最常被查看的内容用更清晰、更现代的方式呈现出来。"
      ]}
    />

    <SectionCard
      title="2. 当前提供的核心能力"
      bullets={[
        "主页：集中展示今日课程、近期活动与下一场考试。",
        "考试页面：按日期分组展示考试卡片，并支持 Full Centre Supervision 信息。",
        "设置页面：主题、强调色、动画开关与 Microsoft 绑定状态。",
        "移动端：底部导航与展开式菜单，减少小按钮与难以命中的交互。"
      ]}
    />

    <SectionCard
      title="3. 设计原则"
      bullets={[
        "先保证信息可达，再追求动画与视觉效果。",
        "桌面端和移动端共享同一套视觉语言，但触控尺寸、底部安全区和滚动行为单独优化。",
        "考试、课表与活动都尽量围绕“今天要看什么、下一步要做什么”来组织。"
      ]}
    />

    <SectionCard
      title="4. 版本与后续方向"
      paragraphs={[
        "当前版本重点放在考试信息聚合、Microsoft 绑定流程、Mock Exam 回退方案以及移动端操作可用性上。后续如果学校侧权限允许，还可以继续扩展到更稳定的 SharePoint 正式同步、日历整合和更完整的“关于”公开说明页。"
      ]}
      bullets={[
        "当前版本：v1.x",
        "维护重点：稳定性、移动端点击体验、考试信息可读性",
        "后续方向：更多公开说明、更多页面的手机端优化、正式 SharePoint 数据同步"
      ]}
    />
  </PageWrapper>
);
