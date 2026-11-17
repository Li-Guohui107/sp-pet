import type { Health, ImageModel, PetState, PhonePlan } from "@/types/pet";

export type Credentials = Pick<PetState, "deepseekKey" | "dashscopeKey" | "region" | "customBase">;

function headers(creds: Credentials): HeadersInit {
  const result: Record<string, string> = { "Content-Type": "application/json" };
  if (creds.deepseekKey.trim()) result["x-sp-deepseek-key"] = creds.deepseekKey.trim();
  if (creds.dashscopeKey.trim()) result["x-sp-dashscope-key"] = creds.dashscopeKey.trim();
  result["x-sp-dashscope-region"] = creds.region;
  if (creds.customBase.trim()) result["x-sp-dashscope-base"] = creds.customBase.trim();
  return result;
}

async function payload(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function getHealth(): Promise<Health> {
  try {
    const res = await fetch("/api/health");
    const data = await payload(res);
    if (!res.ok) throw new Error(data.message || "服务没有应答");
    return data as Health;
  } catch (error) {
    if (error instanceof Error && error.message !== "Failed to fetch") throw error;
    throw new Error("本机服务没有连上。请在项目根目录运行 npm run dev。");
  }
}

export async function streamChat(
  creds: Credentials,
  profile: Pick<PetState, "name" | "owner" | "notes">,
  messages: { role: "user" | "assistant"; content: string }[],
  onDelta: (text: string) => void,
) {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: headers(creds),
      body: JSON.stringify({ profile, messages }),
    });
  } catch {
    throw new Error("本机服务没有连上。请在项目根目录运行 npm run dev。");
  }
  if (!res.ok) {
    const data = await payload(res);
    throw new Error(data.message || "这次对话没有发出去。");
  }
  if (!res.body) throw new Error("没有收到回复。");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content || "";
        if (delta) {
          full += delta;
          onDelta(full);
        }
      } catch {
        // 半行 JSON 留到下一块再解析。
      }
    }
  }
  return full;
}

export async function planPhone(creds: Credentials, task: string): Promise<PhonePlan> {
  let res: Response;
  try {
    res = await fetch("/api/phone/plan", {
      method: "POST",
      headers: headers(creds),
      body: JSON.stringify({ task }),
    });
  } catch {
    throw new Error("本机服务没有连上。请在项目根目录运行 npm run dev。");
  }
  const data = await payload(res);
  if (!res.ok) throw new Error(data.message || "这件事还没拆开。");
  return data as PhonePlan;
}

export async function generateImage(creds: Credentials, prompt: string, model: ImageModel) {
  let res: Response;
  try {
    res = await fetch("/api/pet/image", {
      method: "POST",
      headers: headers(creds),
      body: JSON.stringify({ prompt, model }),
    });
  } catch {
    throw new Error("本机服务没有连上。请在项目根目录运行 npm run dev。");
  }
  const data = await payload(res);
  if (!res.ok) throw new Error(data.message || "形象没有生成。");
  return data as { url: string; model: string };
}

export async function deleteImage(url: string) {
  const name = url.split("/").pop();
  if (!name) return;
  await fetch(`/api/media/${encodeURIComponent(name)}`, { method: "DELETE" });
}
