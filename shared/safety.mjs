const CHILD_SEXUAL =
  /(幼女|幼童|儿童|未成年|小学生|初中生|萝莉|正太).{0,16}(裸|色情|性交|强奸|色情片)|((裸|色情|性交|强奸).{0,16}(幼女|幼童|儿童|未成年|小学生|萝莉|正太))/;

const PHONE_ABUSE = /盗号|木马|钓鱼网站|窃取密码|偷密码|破解别人|入侵别人|操控别人的手机|验证码转发给/;

export function blockedImagePrompt(text) {
  if (CHILD_SEXUAL.test(String(text || ""))) return "这个形象不能生成。";
  return "";
}

export function blockedTask(text) {
  const value = String(text || "");
  if (CHILD_SEXUAL.test(value)) return "这个请求不能做。";
  if (PHONE_ABUSE.test(value)) return "这种事我不能帮。我可以帮你整理自己的工作和桌面。";
  return "";
}

export function redact(text) {
  return String(text || "")
    .replace(/sk-[a-zA-Z0-9_-]{6,}/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]{8,}/gi, "Bearer ***")
    .slice(0, 500);
}

export function explainProvider(status, body) {
  const detail = redact(body).replace(/\s+/g, " ").trim();
  if (status === 401) return "密钥没有通过校验。请检查是否复制完整，以及形象接口的区域是否和密钥一致。";
  if (status === 402) return "账户额度不足。到对应平台看一下余额后再试。";
  if (status === 429) return "请求太密了。等一会儿再试。";
  if (status === 400 || status === 422) {
    return detail ? `接口没有接受这次请求：${detail}` : "接口没有接受这次请求。";
  }
  return detail ? `接口返回 ${status}：${detail}` : `接口返回 ${status}。`;
}
