const KINDS = new Set(["open", "tap", "type", "scroll", "check", "stop"]);
const SECRET = /密码|验证码|支付密码|银行卡|指纹|面容|身份证号/;
const CONFIRM = /发送|付款|支付|转账|删除|发表|发布|下单|提交订单/;

export const PHONE_PLAN_PROMPT = `你是超级宠物的办事员。主人要在自己的手机上完成一件工作。你只输出一个 JSON 对象，不要写别的字。

JSON 形状：
{
  "refused": false,
  "app": "应用名",
  "goal": "一句话目标",
  "summary": "你会怎么帮，两句以内",
  "steps": [
    {
      "title": "这一小步的短标题",
      "detail": "具体点哪里、看什么。用主人能在屏幕上找到的词。",
      "kind": "open",
      "text": "",
      "needsConfirm": false
    }
  ]
}

kind 只能是 open、tap、type、scroll、check、stop。
规则：
- 只规划主人自己的手机和自己的账号。
- 步骤控制在 4 到 8 步，每步只做一件事。
- 打开应用用 open。点击用 tap。输入用 type，并把要输入的内容放进 text。翻页用 scroll。核对结果用 check。
- 遇到密码、验证码、指纹、面容、支付密码、银行卡，这一步 kind 必须是 stop，text 必须是空字符串，needsConfirm 为 true。不要编写这些内容。
- 发送、付款、转账、删除、公开发布、下单，needsConfirm 为 true，停在动作之前。
- 如果请求是在骗别人、盗号、入侵、操控别人的手机，输出 {"refused": true, "reason": "一句话原因"}。`;

export function parseModelJson(text) {
  const trimmed = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(trimmed);
}

export function normalizePlan(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("办事计划是空的");
  }
  if (raw.refused) {
    return {
      refused: true,
      reason: clip(raw.reason, 200) || "这件事实在帮不上。",
    };
  }
  const stepsIn = Array.isArray(raw.steps) ? raw.steps : [];
  const steps = stepsIn.slice(0, 8).map((step, index) => normalizeStep(step, index));
  if (!steps.length) {
    throw new Error("没有拆出可以执行的步骤");
  }
  return {
    refused: false,
    app: clip(raw.app, 40) || "手机应用",
    goal: clip(raw.goal, 200),
    summary: clip(raw.summary, 300),
    steps,
  };
}

export function chatSystem({ name, owner, notes }) {
  const pet = clip(name, 20) || "团子";
  const person = clip(owner, 20) || "主人";
  const habit = clip(notes, 200);
  return `你是桌面宠物「${pet}」。主人叫「${person}」。${habit ? `主人希望你：${habit}。` : ""}
你住在主人的电脑桌面上，用简体中文说话。句子短，语气暖和，像一只靠得住的小动物。不要客服腔，不要堆表情符号。
你有三样本领：
1. 陪主人聊天，记住这段对话里说过的事。
2. 整理主人选中的文件夹。主人点头后，网页会把散落文件移进分类文件夹。
3. 把手机上的工作拆成一步步操作。网页会把步骤列给主人，发送、付款和删除会先停下来等主人点头。
网页版现在把步骤交给主人照着做。不要说自己已经发送、已经付款，或已经打开了某个手机应用。
主人如果是想整理桌面，正文之后另起一行写 [[open:desktop]]
如果是想换形象或生成图片，另起一行写 [[open:look]]
如果是想在手机上办事，另起一行写 [[open:phone]]
标记单独成行。不要向主人解释标记。`;
}

function normalizeStep(step, index) {
  const title = clip(step?.title, 40) || `第 ${index + 1} 步`;
  let detail = clip(step?.detail, 240) || "看一眼这一步的结果，再继续。";
  let kind = KINDS.has(step?.kind) ? step.kind : "tap";
  let text = clip(step?.text, 200);
  let needsConfirm = Boolean(step?.needsConfirm);
  const blob = `${title} ${detail}`;
  if (SECRET.test(blob)) {
    kind = "stop";
    text = "";
    needsConfirm = true;
    detail = "这里由你自己完成。我在旁边等。";
  }
  if (CONFIRM.test(blob)) needsConfirm = true;
  if (kind === "stop") {
    text = "";
    needsConfirm = true;
  }
  if (kind !== "type") text = "";
  return { title, detail, kind, text, needsConfirm };
}

function clip(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
