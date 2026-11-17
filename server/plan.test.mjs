import test from "node:test";
import assert from "node:assert/strict";
import { categoryFor, groupByCategory, shouldIgnoreFile } from "../shared/desktop-plan.mjs";
import { normalizePlan, parseModelJson } from "../shared/phone-plan.mjs";
import { blockedImagePrompt, blockedTask, explainProvider, redact } from "../shared/safety.mjs";
import { assertRemoteUrl, buildPetPrompt, extractImageUrl } from "./qwen.mjs";

test("desktop files land in stable categories", () => {
  assert.equal(categoryFor("合同.PDF"), "文档");
  assert.equal(categoryFor("照片.heic"), "图片");
  assert.equal(categoryFor("安装包.exe"), "安装包");
  assert.equal(categoryFor("readme"), "其他");
  assert.equal(shouldIgnoreFile(".gitignore"), true);
  assert.equal(shouldIgnoreFile("Thumbs.db"), true);
  const groups = groupByCategory(["a.png", "b.pdf", ".secret", "Thumbs.db", "笔记"]);
  assert.deepEqual(groups["图片"], ["a.png"]);
  assert.deepEqual(groups["文档"], ["b.pdf"]);
  assert.deepEqual(groups["其他"], ["笔记"]);
});

test("phone plan stops before secrets and confirms sends", () => {
  const plan = normalizePlan({
    app: "微信",
    goal: "给妈妈发晚安",
    summary: "打开微信，写好话，停在发送前。",
    steps: [
      { title: "打开微信", detail: "点开微信", kind: "open" },
      { title: "输入密码", detail: "填写登录密码 123456", kind: "type", text: "123456" },
      { title: "写晚安", detail: "在输入框写下晚安", kind: "type", text: "晚安" },
      { title: "发送", detail: "点击发送", kind: "tap" },
    ],
  });
  assert.equal(plan.refused, false);
  assert.equal(plan.steps[1].kind, "stop");
  assert.equal(plan.steps[1].text, "");
  assert.equal(plan.steps[1].needsConfirm, true);
  assert.match(plan.steps[1].detail, /你自己完成/);
  assert.equal(plan.steps[2].text, "晚安");
  assert.equal(plan.steps[3].needsConfirm, true);
});

test("phone plan keeps a refusal and drops extra steps", () => {
  const refused = normalizePlan({ refused: true, reason: "这是别人的手机。" });
  assert.equal(refused.refused, true);
  const long = normalizePlan({
    steps: Array.from({ length: 12 }, (_, index) => ({
      title: `步骤${index}`,
      detail: "点一下",
      kind: "tap",
    })),
  });
  assert.equal(long.steps.length, 8);
  const parsed = parseModelJson("```json\n{\"refused\":true,\"reason\":\"不行\"}\n```");
  assert.equal(parsed.reason, "不行");
});

test("safety filters and redaction", () => {
  assert.equal(blockedTask("帮我盗号登录微信"), "这种事我不能帮。我可以帮你整理自己的工作和桌面。");
  assert.equal(blockedImagePrompt("一只戴围巾的橘猫"), "");
  assert.match(blockedImagePrompt("幼女裸体"), /不能生成/);
  assert.equal(redact("key sk-abcdefghijklmnopqrstuvwxyz"), "key sk-***");
  assert.match(explainProvider(401, "invalid"), /密钥没有通过校验/);
});

test("image urls stay on Alibaba Cloud", () => {
  assert.equal(
    assertRemoteUrl("https://dashscope.aliyuncs.com/api/v1", "接口地址").hostname,
    "dashscope.aliyuncs.com",
  );
  assert.throws(() => assertRemoteUrl("http://dashscope.aliyuncs.com/api/v1", "接口地址"));
  assert.throws(() => assertRemoteUrl("https://127.0.0.1/secret", "图片地址"));
  assert.throws(() => assertRemoteUrl("https://example.com/cat.png", "图片地址"));
  assert.match(buildPetPrompt("圆滚滚的橘猫"), /橘猫/);
  assert.equal(
    extractImageUrl({ output: { choices: [{ message: { content: [{ image: "https://a.aliyuncs.com/x.png" }] } }] } }),
    "https://a.aliyuncs.com/x.png",
  );
});
