import fs from "node:fs";
import path from "node:path";
import { explainProvider } from "../shared/safety.mjs";

const MODELS = {
  "qwen-image-2.0": { mode: "sync", size: "1024*1024" },
  "qwen-image-2.0-pro": { mode: "sync", size: "1024*1024" },
  "qwen-image-plus": { mode: "async", size: "1328*1328" },
  "qwen-image": { mode: "async", size: "1328*1328" },
};

const NEGATIVE = "文字，水印，logo，模糊，畸形四肢，多余手指，低清晰度，杂乱背景，相框，拼贴，多角色，真人照片";

export function resolveModel(name) {
  return MODELS[name] ? name : "qwen-image-2.0";
}

export function resolveBase(custom, region) {
  const fallback = region === "intl"
    ? "https://dashscope-intl.aliyuncs.com/api/v1"
    : "https://dashscope.aliyuncs.com/api/v1";
  const candidate = String(custom || "").trim() || fallback;
  return assertRemoteUrl(candidate, "接口地址").toString().replace(/\/$/, "");
}

export function buildPetPrompt(userPrompt) {
  const text = String(userPrompt || "").replace(/\s+/g, " ").trim().slice(0, 800);
  return `一只适合放在电脑桌面上的宠物角色，单一主体，全身可见，居中，轮廓清楚，纯色柔和背景，可爱，完成度高。不要文字，不要水印，不要真人照片。角色描述：${text}`;
}

export function assertRemoteUrl(raw, label) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw Object.assign(new Error(`${label}格式不对`), { status: 400 });
  }
  if (url.protocol !== "https:") {
    throw Object.assign(new Error(`${label}需要使用 https`), { status: 400 });
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    host.includes(":")
  ) {
    throw Object.assign(new Error(`${label}不在阿里云域名上`), { status: 400 });
  }
  const allowed = host === "dashscope.aliyuncs.com"
    || host === "dashscope-intl.aliyuncs.com"
    || host.endsWith(".aliyuncs.com")
    || host.endsWith(".aliyun.com");
  if (!allowed) {
    throw Object.assign(new Error(`${label}不在阿里云域名上`), { status: 400 });
  }
  return url;
}

export async function generatePetImage({ apiKey, baseUrl, model, prompt, filePath }) {
  const spec = MODELS[model];
  const imageUrl = spec.mode === "async"
    ? await generateAsync({ apiKey, baseUrl, model, prompt, size: spec.size })
    : await generateSync({ apiKey, baseUrl, model, prompt, size: spec.size });
  const file = await downloadImage(imageUrl, filePath);
  return file;
}

async function generateSync({ apiKey, baseUrl, model, prompt, size }) {
  const response = await fetch(`${baseUrl}/services/aigc/multimodal-generation/generation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: { messages: [{ role: "user", content: [{ text: prompt }] }] },
      parameters: {
        size,
        n: 1,
        prompt_extend: true,
        watermark: false,
        negative_prompt: NEGATIVE,
      },
    }),
    signal: AbortSignal.timeout(120000),
  });
  const data = await readJson(response);
  const url = extractImageUrl(data);
  if (!url) {
    throw Object.assign(new Error(data?.message || "没有拿到图片地址"), { status: 502 });
  }
  return url;
}

async function generateAsync({ apiKey, baseUrl, model, prompt, size }) {
  const response = await fetch(`${baseUrl}/services/aigc/text2image/image-synthesis`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({
      model,
      input: { prompt, negative_prompt: NEGATIVE },
      parameters: { size, n: 1, prompt_extend: true, watermark: false },
    }),
    signal: AbortSignal.timeout(60000),
  });
  const created = await readJson(response);
  const taskId = created?.output?.task_id;
  if (!taskId || !/^[\w-]+$/.test(taskId)) {
    throw Object.assign(new Error(created?.message || "没有拿到生图任务"), { status: 502 });
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await delay(2000);
    const polled = await fetch(`${baseUrl}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30000),
    });
    const data = await readJson(polled);
    const status = data?.output?.task_status;
    if (status === "SUCCEEDED") {
      const url = extractImageUrl(data);
      if (!url) throw Object.assign(new Error("生图完成了，但没有图片地址"), { status: 502 });
      return url;
    }
    if (status === "FAILED" || status === "UNKNOWN") {
      throw Object.assign(new Error(data?.output?.message || data?.message || "生图失败"), { status: 502 });
    }
  }
  throw Object.assign(new Error("生图等得太久了，稍后再试"), { status: 502 });
}

export function extractImageUrl(data) {
  const content = data?.output?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (typeof part?.image === "string") return part.image;
    }
  }
  const legacy = data?.output?.results?.[0]?.url;
  return typeof legacy === "string" ? legacy : "";
}

async function downloadImage(imageUrl, filePath) {
  let current = imageUrl;
  for (let hop = 0; hop < 3; hop += 1) {
    assertRemoteUrl(current, "图片地址");
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw Object.assign(new Error("图片下载失败"), { status: 502 });
      current = new URL(location, current).toString();
      continue;
    }
    if (!response.ok) {
      throw Object.assign(new Error("图片下载失败"), { status: 502 });
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 15 * 1024 * 1024) {
      throw Object.assign(new Error("图片大小不合适"), { status: 502 });
    }
    const type = response.headers.get("content-type") || "";
    const ext = type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : "png";
    const finalPath = filePath.replace(/\.(png|jpg|webp)$/i, `.${ext}`);
    await fs.promises.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.promises.writeFile(finalPath, bytes);
    return { fileName: path.basename(finalPath), contentType: type || "image/png" };
  }
  throw Object.assign(new Error("图片下载跳转过多"), { status: 502 });
}

async function readJson(response) {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  const failed = !response.ok || (typeof data.code === "string" && data.code !== "" && data.code !== "Success");
  if (failed) {
    const status = response.ok ? 502 : response.status;
    throw Object.assign(new Error(explainProvider(status, data.message || text)), {
      status: status === 401 || status === 429 ? status : 502,
    });
  }
  return data;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
