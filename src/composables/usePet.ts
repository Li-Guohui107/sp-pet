import { onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { generateImage, getHealth, planPhone, streamChat, type Credentials } from "@/api/client";
import { loadState, saveState } from "@/lib/storage";
import { openedTab, visibleReply } from "@/lib/text";
import type { GalleryItem, Health, PetState, PhoneTask, SettingsDraft, TabId } from "@/types/pet";

type InstallPrompt = Event & { prompt: () => Promise<void> };

export function usePet() {
  const state = reactive<PetState>(loadState());
  const tab = ref<TabId>("chat");
  const settingsOpen = ref(false);
  const health = ref<Health | null>(null);
  const offline = ref("");
  const draft = ref("");
  const lookPrompt = ref("圆滚滚的橘猫，围着一条短围巾");
  const phoneDraft = ref("");
  const liveReply = ref("");
  const notice = ref("");
  const lookError = ref("");
  const phoneError = ref("");
  const pending = ref<"chat" | "image" | "phone" | null>(null);
  const installEvent = ref<InstallPrompt | null>(null);

  watch(
    state,
    () => {
      saveState(JSON.parse(JSON.stringify(state)) as PetState);
    },
    { deep: true },
  );

  onMounted(() => {
    getHealth()
      .then((next) => {
        health.value = next;
        offline.value = "";
      })
      .catch((error: unknown) => {
        offline.value = error instanceof Error ? error.message : "本机服务没有连上。";
      });
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
  });

  onUnmounted(() => {
    window.removeEventListener("beforeinstallprompt", onInstallPrompt);
  });

  function onInstallPrompt(event: Event) {
    event.preventDefault();
    installEvent.value = event as InstallPrompt;
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending.value) return;
    notice.value = "";
    tab.value = "chat";
    const userMessage = { id: crypto.randomUUID(), role: "user" as const, content, createdAt: Date.now() };
    const history = [...state.messages, userMessage].slice(-80);
    state.messages = history;
    draft.value = "";
    liveReply.value = "";
    pending.value = "chat";
    try {
      const full = await streamChat(credentials(), state, history, (value) => {
        liveReply.value = value;
      });
      const clean = visibleReply(full) || "我在这边。";
      const nextTab = openedTab(full);
      state.messages = [...history, { id: crypto.randomUUID(), role: "assistant" as const, content: clean, createdAt: Date.now() }].slice(-80);
      if (nextTab) tab.value = nextTab;
    } catch (error) {
      const message = error instanceof Error ? error.message : "这次没说成。";
      state.messages = [...history, { id: crypto.randomUUID(), role: "assistant" as const, content: message, createdAt: Date.now() }].slice(-80);
    } finally {
      liveReply.value = "";
      pending.value = null;
    }
  }

  async function draw() {
    if (pending.value) return;
    lookError.value = "";
    pending.value = "image";
    try {
      const result = await generateImage(credentials(), lookPrompt.value, state.imageModel);
      const item: GalleryItem = {
        id: crypto.randomUUID(),
        url: result.url,
        prompt: lookPrompt.value.trim(),
        model: result.model,
        createdAt: Date.now(),
      };
      state.imageUrl = result.url;
      state.gallery = [item, ...state.gallery].slice(0, 24);
      notice.value = "新样子好了。";
    } catch (error) {
      lookError.value = error instanceof Error ? error.message : "形象没有生成。";
    } finally {
      pending.value = null;
    }
  }

  async function plan() {
    if (pending.value) return;
    phoneError.value = "";
    pending.value = "phone";
    try {
      const result = await planPhone(credentials(), phoneDraft.value);
      const task: PhoneTask = {
        id: crypto.randomUUID(),
        request: phoneDraft.value.trim(),
        plan: result,
        done: [],
        createdAt: Date.now(),
      };
      state.phoneTasks = [task, ...state.phoneTasks].slice(0, 20);
      notice.value = result.refused ? result.reason : `「${result.app}」的步骤列好了。`;
    } catch (error) {
      phoneError.value = error instanceof Error ? error.message : "这件事还没拆开。";
    } finally {
      pending.value = null;
    }
  }

  async function copyTask(task: PhoneTask) {
    const text = task.plan.refused
      ? task.plan.reason
      : [
          `${task.plan.app}：${task.plan.goal}`,
          task.plan.summary,
          ...task.plan.steps.map((step, index) => `${index + 1}. ${step.title}：${step.detail}${step.text ? `（输入：${step.text}）` : ""}`),
        ]
          .filter(Boolean)
          .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      notice.value = "步骤已经复制好，可以带到手机旁边。";
    } catch {
      notice.value = "复制没有成功，你可以直接对照页面上的步骤。";
    }
  }

  function saveSettings(next: SettingsDraft) {
    Object.assign(state, next);
    settingsOpen.value = false;
  }

  function credentials(): Credentials {
    return {
      deepseekKey: state.deepseekKey,
      dashscopeKey: state.dashscopeKey,
      region: state.region,
      customBase: state.customBase,
    };
  }

  return {
    state,
    tab,
    settingsOpen,
    health,
    offline,
    draft,
    lookPrompt,
    phoneDraft,
    liveReply,
    notice,
    lookError,
    phoneError,
    pending,
    installEvent,
    send,
    draw,
    plan,
    copyTask,
    saveSettings,
  };
}
