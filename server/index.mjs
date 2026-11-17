import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { streamChat, completeJson, PHONE_PLAN_PROMPT } from "./deepseek.mjs";
import { generatePetImage, resolveBase, resolveModel, buildPetPrompt } from "./qwen.mjs";
import { blockedImagePrompt, blockedTask } from "../shared/safety.mjs";
import { normalizePlan, parseModelJson } from "../shared/phone-plan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data", "pets");
const staticRoot = path.join(root, "dist");
const serveStatic = process.argv.includes("--static");
const port = Number(process.env.PORT || 8787);
const host = "127.0.0.1";

loadEnv(path.join(root, ".env"));
loadEnv(path.join(root, ".env.local"), true);

const buckets = new Map();

const server = http.createServer(async (req, res) => {
  try {
    cors(req, res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url || "/", `http://${host}`);
    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, {
        ok: true,
        deepseekEnv: Boolean(process.env.DEEPSEEK_API_KEY),
        dashscopeEnv: Boolean(process.env.DASHSCOPE_API_KEY),
        region: process.env.DASHSCOPE_REGION === "intl" ? "intl" : "cn",
      });
    }
    if (req.method === "GET" && url.pathname.startsWith("/media/pets/")) {
      return servePetImage(res, path.basename(url.pathname));
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/api/media/")) {
      return deletePetImage(res, path.basename(url.pathname));
    }
    if (req.method === "POST" && url.pathname === "/api/chat") {
      return handleChat(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/phone/plan") {
      return handlePhone(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/pet/image") {
      return handleImage(req, res);
    }
    if (serveStatic && req.method === "GET") {
      return serveWeb(res, url.pathname);
    }
    json(res, 404, { message: "没有这条路径" });
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    const status = Number(error?.status) || 500;
    json(res, status, { message: error?.message || "服务出错了" });
  }
});

server.listen(port, host, () => {
  console.log(`超级宠物服务 http://${host}:${port}`);
});

async function handleChat(req, res) {
  limit(req, "chat", 30);
  const body = await readBody(req);
  const apiKey = pickKey(req, "x-sp-deepseek-key", process.env.DEEPSEEK_API_KEY);
  if (!apiKey) {
    return json(res, 400, { message: "先在右上角填写 DeepSeek 密钥，或把它写进 .env。" });
  }
  const last = [...(body.messages || [])].reverse().find((item) => item.role === "user");
  const blocked = blockedTask(last?.content || "");
  if (blocked) return json(res, 400, { message: blocked });
  const controller = new AbortController();
  req.on("close", () => controller.abort());
  const upstream = await streamChat({
    apiKey,
    profile: body.profile,
    messages: body.messages,
    signal: controller.signal,
  });
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const reader = upstream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } catch (error) {
    if (error?.name !== "AbortError" && !res.headersSent) throw error;
  } finally {
    reader.releaseLock();
    if (!res.writableEnded) res.end();
  }
}

async function handlePhone(req, res) {
  limit(req, "phone", 20);
  const body = await readBody(req);
  const task = String(body.task || "").trim().slice(0, 1000);
  if (task.length < 2) return json(res, 400, { message: "先写下要在手机上完成的事。" });
  const blocked = blockedTask(task);
  if (blocked) return json(res, 400, { message: blocked });
  const apiKey = pickKey(req, "x-sp-deepseek-key", process.env.DEEPSEEK_API_KEY);
  if (!apiKey) {
    return json(res, 400, { message: "先在右上角填写 DeepSeek 密钥，或把它写进 .env。" });
  }
  const text = await completeJson({
    apiKey,
    system: PHONE_PLAN_PROMPT,
    user: task,
    signal: AbortSignal.timeout(60000),
  });
  let raw;
  try {
    raw = parseModelJson(text);
  } catch {
    return json(res, 502, { message: "计划没有解析成功，换种说法再试一次。" });
  }
  json(res, 200, normalizePlan(raw));
}

async function handleImage(req, res) {
  limit(req, "image", 8);
  const body = await readBody(req);
  const prompt = String(body.prompt || "").trim();
  if (prompt.length < 2) return json(res, 400, { message: "先描述这只宠物长什么样。" });
  const blocked = blockedImagePrompt(prompt);
  if (blocked) return json(res, 400, { message: blocked });
  const apiKey = pickKey(req, "x-sp-dashscope-key", process.env.DASHSCOPE_API_KEY);
  if (!apiKey) {
    return json(res, 400, { message: "先在右上角填写百炼密钥，或把它写进 .env 的 DASHSCOPE_API_KEY。" });
  }
  const regionHeader = header(req, "x-sp-dashscope-region");
  const region = regionHeader || (process.env.DASHSCOPE_REGION === "intl" ? "intl" : "cn");
  const baseUrl = resolveBase(header(req, "x-sp-dashscope-base") || process.env.DASHSCOPE_BASE_URL, region);
  const model = resolveModel(body.model);
  const id = randomUUID();
  const saved = await generatePetImage({
    apiKey,
    baseUrl,
    model,
    prompt: buildPetPrompt(prompt),
    filePath: path.join(dataDir, `${id}.png`),
  });
  json(res, 200, {
    id: saved.fileName.replace(/\.(png|jpg|webp)$/i, ""),
    url: `/media/pets/${saved.fileName}`,
    model,
  });
}

function servePetImage(res, fileName) {
  if (!/^[\w-]+\.(png|jpg|webp)$/.test(fileName)) {
    return json(res, 400, { message: "图片名字不对" });
  }
  const file = path.join(dataDir, fileName);
  if (!fs.existsSync(file)) return json(res, 404, { message: "找不到这张形象" });
  const ext = path.extname(file).slice(1);
  const type = ext === "jpg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
  fs.createReadStream(file).pipe(res);
}

function deletePetImage(res, fileName) {
  if (!/^[\w-]+\.(png|jpg|webp)$/.test(fileName)) {
    return json(res, 400, { message: "图片名字不对" });
  }
  const file = path.join(dataDir, fileName);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  json(res, 200, { ok: true });
}

function serveWeb(res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = safeFile(staticRoot, requested);
  const target = file && fs.existsSync(file) && fs.statSync(file).isFile()
    ? file
    : safeFile(staticRoot, "/index.html");
  if (!target || !fs.existsSync(target)) {
    return json(res, 404, { message: "还没有构建网页。先运行 npm run build。" });
  }
  res.writeHead(200, { "Content-Type": contentType(target) });
  fs.createReadStream(target).pipe(res);
}

function safeFile(dir, pathname) {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return "";
  }
  const file = path.normalize(path.join(dir, decoded));
  const relative = path.relative(dir, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return "";
  return file;
}

function contentType(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".webmanifest")) return "application/manifest+json";
  if (file.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

function pickKey(req, headerName, envValue) {
  const fromHeader = header(req, headerName).trim();
  if (fromHeader) return fromHeader;
  return String(envValue || "").trim();
}

function header(req, name) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function limit(req, name, max) {
  const ip = req.socket.remoteAddress || "local";
  const key = `${ip}:${name}`;
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((time) => now - time < 60_000);
  if (hits.length >= max) {
    throw Object.assign(new Error("这一分钟里的请求够多了，稍后再试。"), { status: 429 });
  }
  hits.push(now);
  buckets.set(key, hits);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(Object.assign(new Error("请求太大"), { status: 413 }));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("请求格式不对"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function cors(req, res) {
  const origin = header(req, "origin");
  if (origin === "http://127.0.0.1:5173" || origin === "http://localhost:5173") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader(
    "Access-Control-Allow-Headers",
    "content-type, x-sp-deepseek-key, x-sp-dashscope-key, x-sp-dashscope-base, x-sp-dashscope-region",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
}

function loadEnv(file, override) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}
