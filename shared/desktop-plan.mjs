export const CATEGORIES = [
  {
    name: "图片",
    hint: "照片和图片",
    exts: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "heic", "heif", "svg"],
  },
  {
    name: "视频",
    hint: "录像和影片",
    exts: ["mp4", "mov", "mkv", "avi", "webm", "m4v"],
  },
  {
    name: "音频",
    hint: "音乐和录音",
    exts: ["mp3", "wav", "flac", "m4a", "aac", "ogg"],
  },
  {
    name: "文档",
    hint: "文字和演示",
    exts: ["pdf", "doc", "docx", "txt", "md", "ppt", "pptx", "rtf"],
  },
  {
    name: "表格",
    hint: "表格和数据",
    exts: ["xls", "xlsx", "csv"],
  },
  {
    name: "压缩包",
    hint: "打包好的文件",
    exts: ["zip", "rar", "7z", "tar", "gz"],
  },
  {
    name: "安装包",
    hint: "安装程序",
    exts: ["exe", "msi", "dmg", "apk"],
  },
  {
    name: "快捷方式",
    hint: "桌面快捷方式",
    exts: ["lnk", "url"],
  },
  {
    name: "代码",
    hint: "代码和网页文件",
    exts: ["js", "ts", "tsx", "jsx", "py", "java", "kt", "html", "css", "xml", "json"],
  },
];

export const CATEGORY_NAMES = [...CATEGORIES.map((item) => item.name), "其他"];

const SKIP = new Set(["desktop.ini", "thumbs.db"]);

export function shouldIgnoreFile(name) {
  const base = baseName(name);
  if (!base || base.startsWith(".")) return true;
  return SKIP.has(base.toLowerCase());
}

export function categoryFor(filename) {
  const base = baseName(filename);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "其他";
  const ext = base.slice(dot + 1).toLowerCase();
  for (const category of CATEGORIES) {
    if (category.exts.includes(ext)) return category.name;
  }
  return "其他";
}

export function groupByCategory(names) {
  const groups = Object.fromEntries(CATEGORY_NAMES.map((name) => [name, []]));
  for (const name of names) {
    if (shouldIgnoreFile(name)) continue;
    groups[categoryFor(name)].push(name);
  }
  return groups;
}

function baseName(name) {
  return String(name || "").split(/[/\\]/).pop() || "";
}
