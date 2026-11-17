import { explainProvider } from "../shared/safety.mjs";
import { PHONE_PLAN_PROMPT, chatSystem } from "../shared/phone-plan.mjs";

const CHAT_URL = "https://api.deepseek.com/chat/completions";

export async function streamChat({ apiKey, profile, messages, signal }) {
  const history = (Array.isArray(messages) ? messages : [])
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .slice(-30)
    .map((item) => ({
      role: item.role,
      content: String(item.content || "").slice(0, 4000),
    }))
    .filter((item) => item.content);

  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.7,
      stream: true,
      messages: [{ role: "system", content: chatSystem(profile || {}) }, ...history],
    }),
    signal,
  });

  if (!response.ok) {
    throw await providerError(response);
  }
  if (!response.body) {
    throw Object.assign(new Error("对话没有返回内容"), { status: 502 });
  }
  return response.body;
}

export async function completeJson({ apiKey, system, user, signal }) {
  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal,
  });
  if (!response.ok) throw await providerError(response);
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw Object.assign(new Error("模型没有给出计划"), { status: 502 });
  return text;
}

export { PHONE_PLAN_PROMPT };

async function providerError(response) {
  const body = await response.text();
  const error = new Error(explainProvider(response.status, body));
  error.status = response.status === 401 || response.status === 429 ? response.status : 502;
  return error;
}
