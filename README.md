<div align="center">
<a href="https://portal.flaps1f.com/">
  <img width="1200" height="475"
       alt="SPN"
       src="https://www.ulinkcollege.com/img/logo.png">
</a>
</div>

# ULink College Student Portal New
欢迎大家，我是Flaps1+F，这里是马库斯伊兰姆公司发布的第一个软件产品：Student Portal New - SPN。
目前网页版的正式版本：`v1.2.0`（未来计划整一个手机app应用） *如果你有遇到任何问题，请你联系zhahuang2868@guiscn.com，或者直接在本页提交issues。*

## 关于项目
### 原网页的问题
学校这套系统本体是 ASP.NET WebForms，页面还在用 `.aspx`，接口还在用 `.asmx`。其实没问题，有问题的是学生端很丑，我就想看看能不能重新换壳。

### 这个项目的思路
思路其实不复杂：保留原始数据来源，不碰学校账号体系，然后在前端和服务端之间自己做一层整合。前端用 React + Vite 重构页面，后端用 Express 代理 Engage / Microsoft Graph 请求，再把考试数据做解析和缓存。

### 换壳怎么实现
方法很朴素，就是在 `ulinkcollege.engagehosted.cn` 里实际点页面、抓请求、看请求头和请求体，然后把学生端真正用到的接口一条条整理出来。你会发现原网页很多功能其实都能直接复刻，只是原版前端真的写得很难看。

## 现在支持的功能
- Engage 账号登录，服务端代理学校接口并维护签名会话 Cookie
- 首页总览、今日课程、下一场考试
- 学生详情读取与展示
- 成绩页面与 marksheet 渲染
- 周时间表与活动列表
- 考试信息页面，支持按日期分组显示考试卡片
- 解析 `Attendance Sheet` 与 `Full Centre Supervision Arrangement`
- Microsoft 账号绑定状态、考试同步状态展示
- 主题切换、强调色切换、动画开关
- 移动端适配、隐私政策、法律声明、技术说明、更新日志

## 考试功能说明
考试模块是这个版本里比较重要的一部分。

- 未绑定 Microsoft 时，可以读取部署在站点上的本地 Mock Exam 样本文件
- 已绑定 Microsoft 时，可以从 SharePoint / Microsoft Graph 自动搜索考试相关文件并同步到数据库
- 系统会按学生 `middleName` 匹配当前用户自己的考试记录
- 支持解析考试时间、试卷名称、房间，以及 Full Centre Supervision 全面监管信息
- 解析后的结果会写入 PostgreSQL，页面优先直接读数据库，不会每次都重新扒文件

## 技术栈
- 前端：React 19、Vite、TypeScript、motion、Tailwind CSS v4
- 后端：Express、Axios、Cheerio
- 数据库：PostgreSQL
- 文件解析：`xlsx`、`pdf-parse`
- 部署：Vercel

## 本地运行
### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
可参考根目录的 `.env.example`。当前项目正式运行至少需要这些配置：

- `SESSION_SECRET`
- `DATABASE_URL`
- `TOKEN_ENCRYPTION_KEY`
- `APP_URL`
- `ALLOWED_ORIGINS`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_REDIRECT_URI`

如果你只想本地看前端壳子，不测试数据库和 Microsoft，同步相关功能可以先不配全，但正式版部署一定要补齐。

### 3. 启动项目
```bash
npm run start
```

默认会在 `http://localhost:3000` 提供服务。

## 线上体验
正式部署地址：<a href="https://portal.flaps1f.com">portal.flaps1f.com</a>

如果你要自己登录测试，请先确认 Engage 账号密码没输错。出现无效账号或密码时，先确认是不是密码输入错误；如果账号本身被原系统锁了，还是得先回原版 Engage 解锁。

## 注意事项
- 这是第三方重构前端，不是学校官方系统
- 页面显示的数据原则上来自学校官方 Engage / SharePoint
- 密码不会持久化保存到数据库
- Microsoft token 会在服务端加密后再落库
- 成绩查询是真的能查到你成绩。

## 更新日志入口
应用内可前往 `关于 -> 更新日志` 查看当前版本变更。

最后更新日期：2026/3/15 UTC+8
所有使用请遵循许可证内容。
