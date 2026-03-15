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
        "制作这个系统的目的是优化学校Engage的前端，因为界面布局审美已经过时，并且功能不全，学校在Sharepoint发布的内容不能在原网页直接查到，还需要另外前往外部网站，很不方便。",
        "前端使用 React 19 与 Vite 构建，负责页面渲染、动画交互、主题切换以及移动端适配。后端使用 Express 作为聚合层，统一代理 Engage 与 Microsoft Graph 请求，并把考试资料持久化到数据库。",
        "在部署环境中，前端构建产物由静态站点输出，后端接口通过 Vercel Serverless Function 提供。这样可以让页面加载保持轻量，同时把认证逻辑和第三方访问限制在服务端。最重要的是，这方案免费。",
        "学校后端服务器使用的是极其老式的ASP.NET WebForms，竟然还使用.asmx和.aspx。"
      ]}
      bullets={[
        "课程表、活动、学生详情等内容皆来自学校 Engage 系统。",
        "考试资料支持自动从 SharePoint 文件与临时本地样本的表格与pdf中解析。"
      ]}
    />

    <SectionCard
      title="2. 数据刷新与缓存"
      paragraphs={[
        "系统会在每日首次登录或首次读取考试资料时检查刷新状态，一般来说，首次登录即为首次读取考试资料。若是本地手动上传样本数据，则会在当天重新解析并写回数据库；如果已经绑定 Microsoft 账号，则可通过后端同步 SharePoint 文件，并写回数据库。",
        "前端也会对课表、活动与考试结果做浏览器级缓存，以减少重复请求和等待时间。缓存会依日期失效，避免旧考试数据一直留在界面上，数据库的考试数据也会一并被更新。"
      ]}
      bullets={[
        "考试页面按日期分组并按开始时间排序。",
        "主页只读取下一场考试和今日融合后的时间线，不会阻塞周课表页面。",
        "所有读取的考试会在所有考试结束后被清除。过了考试最后一日就停止读取。"
      ]}
    />

    <SectionCard
      title="3. 安全与边界"
      paragraphs={[
        "登录学校门户时，密码仅用于向学校官方登录端点发起认证，请求成功后只保留经过签名的会话 Cookie，不会把明文密码写入数据库。我们也绝对不会获取任何你的账号密码和数据。所有进入数据库的内容都是加密过的。",
        "如果绑定 Microsoft 账号，访问令牌与刷新令牌会在服务端加密后再落库。系统只请求与考试文件读取相关的最小必要权限，不会擅自访问你的其他 Microsoft 数据。"
      ]}
      bullets={[
        "门户会话通过 HttpOnly Cookie 管理，前端脚本无法直接读取。",
        "所有第三方请求都通过 HTTPS 加密发送。",
        "考试解析结果仅保留页面展示所需字段，例如科目、试卷、时间、房间与全面监管信息。"
      ]}
    />

    <SectionCard
      title="4. 已知限制"
      bullets={[
        "学校上游页面结构或字段名称一旦变动，相关抓取逻辑可能需要跟着调整。",
        "SharePoint 文件命名方式如果与当前识别规则差异太大，可能需要补充分类词或解析规则。目前的规则是Attendance Sheet, Full Centre Superision Arrangement等。",
        "部分动画和玻璃拟态效果在低性能移动设备上可能会被自动简化，以保证流畅度和读取速度。"
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
        "成绩、课表、活动、考试安排等信息原则上来自学校官方 Engage 页面、SharePoint 文件或已经经过用户授权的 Microsoft Graph 接口。虽然系统会尽量及时刷新，但仍可能受到上游延迟、文件更新滞后、字段异常或解析失败的影响。"
      ]}
      bullets={[
        "请以学校官方通知、监考安排或教师说明为最终依据。此网站并不保证信息是最新的、最准确的。",
        "若页面显示与官方文件不一致，应优先相信学校正式渠道。",
        "开发者不对因上游数据错误、延迟或临时不可用造成的损失承担责任。"
      ]}
    />

    <SectionCard
      title="3. 使用者义务"
      bullets={[
        "请仅使用你本人有权访问的学校账号与 Microsoft 账号。",
        "请勿尝试绕过学校权限限制、批量抓取他人数据或将本程序用于非授权用途。",
        "若你发现明显的安全问题、权限异常或数据泄露风险，应立即停止使用并通知维护者。联系方式zhahuang2868@guiscn.com，或前往GitHub Issues提出。</a>"
      ]}
    />

    <SectionCard
      title="4. 知识产权与服务调整"
      paragraphs={[
        "本程序的界面实现、交互逻辑与源代码归开发者所有；学校系统的名称、Logo、原始数据和文档版权归学校或原平台方所有。开发者保留在不另行通知的情况下修改、暂停或下线部分功能的权利。虽然应该还是会提示的。"
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
    title="更新日志"
    subtitle="这是一套围绕学生真实使用场景打造的校园门户重构界面，目标是在不改变数据来源的前提下，把常用信息整理得更快、更清楚、也更适合移动端。本页面展示更新日志。所有贝塔都是劣迹艺人那艺娜的。"
    icon={Info}
    tags={["更新日志"]}
  >
    <SectionCard
      title="v0.0贝塔"
      paragraphs={[
        "时间：2026.3.11",
        "更新内容：立项了。开始进行基础搭建工作。从Engage抓取到了后端接口，并且模仿前端发送的请求，成功收到后端登录接口返回的内容。"
      ]}
    />

    <SectionCard
      title="v0.1贝塔"
      paragraphs={[
        "时间：2026.3.11",
        "更新内容：把Engage原本的SideBar内容搬到了新网页并用占位页面填充。",
      ]}
    />

    <SectionCard
      title="v0.2贝塔"
      paragraphs={[
        "时间：2026.3.12",
        "更新内容：成功抓取到Engage查询成绩的接口，把查成绩功能做了，真实可查。",
      ]}
    />

    <SectionCard
      title="v0.3贝塔"
      paragraphs={[
        "时间：2026.3.12",
        "更新内容：学生详情界面也做好了。期间出现了难点，不知道pupilID是什么，实际上应该是engage在后台分配给账号的编号。好在后面抓取到接口返回的html有包含该字段，直接让程序在里面查询相关字段就行，还省了我精力去抓后端。"
      ]}
    />
    <SectionCard
      title="v0.3贝塔hotfix"
      paragraphs={[
        "时间：2026.3.12",
        "更新内容：修复了学生详情页内容解析失败的问题。原本只解析到了pupilID，年级以及Homeroom，但是除了puipilID其他这俩全是错的。其实是因为解析关键字是错的。配置里改一下就行。"
      ]}
    />
    <SectionCard
      title="v0.4贝塔"
      paragraphs={[
        "时间：2026.3.12",
        "更新内容：为我们的门户添加了一个网站的界面，使用户可以很方便的前往高频访问网站如Landing Page或原版Engage。"
      ]}
    />
    <SectionCard
      title="v0.5贝塔"
      paragraphs={[
        "时间：2026.3.13",
        "更新内容：优化了一下整体界面和布局，增加了更多动画和个性化样式，包括亮色和暗色主题，预留了更改语言和背景的接口。"
      ]}
    />
    <SectionCard
      title="v0.6贝塔"
      paragraphs={[
        "时间：2026.3.13",
        "更新内容：本来想做一个很牛逼的登录动画效果，使用canva，结果做完直接失败，一登录跟狗屎一样，优化太拉，M4都会卡。而且一不小心还把登录搞炸了。感想只有3个字：何意味。感谢鞋陈格的友情评价。但是只能先这样了。不过我给主页layout做了很多动画，弹弹的。给设置增加了动画开关。"
      ]}
    />
    <SectionCard
      title="v0.6贝塔hotfix"
      paragraphs={[
        "时间：2026.3.13",
        "更新内容：修复了登录和查成绩卡HTTP 500的报错。原因是server.ts转发问题。"
      ]}
    />
    <SectionCard
      title="v嘎嘎滴蜡吓"
      paragraphs={[
        "时间：2026.3.13",
        "更新内容：没啥事，就一个下午没上课而已。"
      ]}
    />
    <SectionCard
      title="v0.6贝塔hotfix"
      paragraphs={[
        "时间：2026.3.14",
        "更新内容：把原本那个丑陋的不知道有啥用处的登录动画删掉了，改成了更简单的纯色不规则填充屏幕。大幅优化流畅度，提升使用感受。"
      ]}
    />
    <SectionCard
      title="v0.7贝塔"
      paragraphs={[
        "时间：2026.3.14",
        "更新内容：已经在服务端配置好了生产环境和环境变量，以及配置了Entra的应用码。"
      ]}
    />
    <SectionCard
      title="v0.7贝塔hotfix"
      paragraphs={[
        "时间：2026.3.14",
        "更新内容：修复了在设置里绑定微软账号但是显示服务器未正确配置，不让绑的情况（实际上正确配置了）"
      ]}
    />
    <SectionCard
      title="v0.8贝塔"
      paragraphs={[
        "时间：2026.3.14",
        "更新内容：网站理论上已经能够支持Microsoft账号绑定，在设置里点击绑定按钮可以跳转到login.microsoftonline.com，但是GUIS没有给我在Entra注册的程序权限，所以没法绑定，以后要是想整还得给IT发申请。"
      ]}
    />
    <SectionCard
      title="v0.9贝塔"
      paragraphs={[
        "时间：2026.3.15",
        "更新内容：新增了考试表格解析的功能，用户可以在主页或考试信息页面查看自己的考试日程。包括全面中心监管的时间。由于微软API不可用，现在是我自己上传的表格给系统解析。每天只解析一次，解析一次之后储存到数据库里，减少读取时间，用户可以更快的查看，但是牺牲了时效性。"
      ]}
    />
    <SectionCard
      title="v1.0贝塔"
      paragraphs={[
        "时间：2026.3.15",
        "更新内容：想发布正式版，刚在写readme发现移动端不适配。妈的"
      ]}
    />
    <SectionCard
      title="v1.1.0正式版本"
      paragraphs={[
        "时间：2026.3.15",
        "更新内容：目前一切正常，于是我把LICENSE写好了，决定发布这个正式版。现在是正式版了。非常棒。哈哈，牛逼，强大。"
      ]}
    />
  </PageWrapper>
);
