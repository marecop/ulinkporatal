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
  versionKey: "1.2.1",
  displayVersion: "v1.2.1",
  aboutTitle: "v1.2.1正式版本",
  publishedAt: "2026.3.15",
  aboutParagraphs: [
    "时间：2026.3.15",
    "更新内容：修复了 sidebar、login 与浏览器标签页的 logo 资源，统一站点图标显示，并补发一个新的正式版本。",
  ],
  modalHighlights: [
    "修复侧边栏与登录页 logo 丢失后显示占位符的问题。",
    "将浏览器标签页图标统一替换为新的 Student Portal 图示。",
    "同步补发 v1.2.1 正式版本与对应更新日志。",
  ],
  readMorePath: "/about/app",
};

export function buildVersionSeenStorageKey(pupilId: string, versionKey = CURRENT_RELEASE.versionKey) {
  return `portal:version-update:seen:${pupilId}:${versionKey}`;
}
