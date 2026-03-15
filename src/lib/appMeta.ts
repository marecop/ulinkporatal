export interface CurrentReleaseMeta {
  versionKey: string;
  displayVersion: string;
  aboutTitle: string;
  publishedAt: string;
  aboutParagraphs: [string, string];
  modalHighlights: [string, string, string];
  readMorePath: string;
}

// 版本資訊集中在這裡，讓 Sidebar、更新彈窗與更新日誌共用同一份來源。
export const CURRENT_RELEASE: CurrentReleaseMeta = {
  versionKey: "1.2.0",
  displayVersion: "v1.2.0",
  aboutTitle: "v1.2.0正式版本",
  publishedAt: "2026.3.15",
  aboutParagraphs: [
    "时间：2026.3.15",
    "更新内容：补上了正式发布前最后一轮完善工作：新增版本号显示、登录后的更新提示弹窗、README 整理，并修复了考试同步、缓存隔离与若干安全细节。",
  ],
  modalHighlights: [
    "新增登录后的版本更新提示弹窗，可直接确认、阅读更多或选择不再提示。",
    "侧边栏加入版本号显示，并统一更新日志、版本文案与 README。",
    "修复 Microsoft 考试同步未整合全面监管、跨账号考试缓存污染与正式环境安全细节。",
  ],
  readMorePath: "/about/app",
};

export function buildVersionSeenStorageKey(pupilId: string, versionKey = CURRENT_RELEASE.versionKey) {
  return `portal:version-update:seen:${pupilId}:${versionKey}`;
}
