<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { deleteImage } from "@/api/client";
import ChatPanel from "@/components/ChatPanel.vue";
import DesktopOrganizer from "@/components/DesktopOrganizer.vue";
import LookStudio from "@/components/LookStudio.vue";
import PetStage from "@/components/PetStage.vue";
import PhoneWork from "@/components/PhoneWork.vue";
import SettingsDialog from "@/components/SettingsDialog.vue";
import { useFloatPet } from "@/composables/useFloatPet";
import { usePet } from "@/composables/usePet";
import { visibleReply } from "@/lib/text";
import type { GalleryItem, TabId } from "@/types/pet";

const {
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
} = usePet();

const floatPet = useFloatPet((text) => {
  void send(text);
});

const line = computed(() => {
  if (pending.value === "chat") return visibleReply(liveReply.value) || "我想想…";
  if (pending.value === "image") return "我在照镜子，新样子马上出来。";
  if (pending.value === "phone") return "我在把这件事拆成一步一步。";
  const last = [...state.messages].reverse().find((item) => item.role === "assistant")?.content;
  return notice.value || last || `${state.name}在。可以聊天、换样子、整理文件夹，或把手机上的一件事交给我。`;
});

const chatReady = computed(() => Boolean(state.deepseekKey.trim()) || Boolean(health.value?.deepseekEnv));
const imageReady = computed(() => Boolean(state.dashscopeKey.trim()) || Boolean(health.value?.dashscopeEnv));

watchEffect(() => {
  floatPet.snapshot.value = {
    name: state.name,
    line: line.value,
    imageUrl: state.imageUrl,
  };
});

async function float() {
  try {
    await floatPet.open();
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "小窗没有打开。";
  }
}

async function install() {
  await installEvent.value?.prompt();
  installEvent.value = null;
}

function chooseTab(next: TabId) {
  tab.value = next;
}

function clearChat() {
  notice.value = "";
  state.messages = [];
}

function useLook(url: string) {
  state.imageUrl = url;
  notice.value = "就用这张脸。";
}

function removeLook(item: GalleryItem) {
  if (state.imageUrl === item.url) state.imageUrl = "";
  state.gallery = state.gallery.filter((entry) => entry.id !== item.id);
  void deleteImage(item.url);
}

function toggleStep(taskId: string, index: number) {
  state.phoneTasks = state.phoneTasks.map((task) => {
    if (task.id !== taskId) return task;
    const done = task.done.includes(index) ? task.done.filter((item) => item !== index) : [...task.done, index];
    return { ...task, done };
  });
}
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_8%_0%,rgba(227,106,69,0.18),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(231,177,90,0.28),transparent_26%),var(--color-cream)] px-4 py-7 text-ink sm:px-8">
    <header class="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
      <div class="flex items-center gap-3.5">
        <img src="/favicon.svg" alt="" width="42" height="42" class="rounded-2xl shadow-[0_24px_50px_rgba(42,33,24,0.12)]" />
        <div>
          <h1 class="font-display text-3xl font-medium">超级宠物</h1>
          <p class="mt-1 text-ink/70">住在桌面上，帮你聊天、收拾文件夹、把手机上的事拆开。</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full border px-2.5 py-1.5 text-[13px]" :class="chatReady ? 'border-[#cfe3d4] bg-[#edf6ef]' : 'border-line bg-white'">
          {{ chatReady ? "对话就绪" : "对话待配置" }}
        </span>
        <span class="rounded-full border px-2.5 py-1.5 text-[13px]" :class="imageReady ? 'border-[#cfe3d4] bg-[#edf6ef]' : 'border-line bg-white'">
          {{ imageReady ? "形象就绪" : "形象待配置" }}
        </span>
        <button type="button" class="btn-ghost" @click="settingsOpen = true">密钥</button>
      </div>
    </header>

    <p v-if="offline" class="mt-4 rounded-2xl border border-[#f0c2b4] bg-[#fff1ea] px-3 py-2.5 leading-relaxed">{{ offline }}</p>

    <main class="mt-6 grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <PetStage
        :name="state.name"
        :image-url="state.imageUrl"
        :line="line"
        :tab="tab"
        :can-install="Boolean(installEvent)"
        @tab="chooseTab"
        @float="float"
        @install="install"
      />
      <div>
        <ChatPanel
          v-if="tab === 'chat'"
          v-model="draft"
          :messages="state.messages"
          :live-reply="liveReply"
          :streaming="pending === 'chat'"
          :busy="pending !== null"
          @send="send"
          @clear="clearChat"
        />
        <LookStudio
          v-else-if="tab === 'look'"
          v-model="lookPrompt"
          :model="state.imageModel"
          :running="pending === 'image'"
          :busy="pending !== null"
          :error="lookError"
          :gallery="state.gallery"
          :current-url="state.imageUrl"
          @model="state.imageModel = $event"
          @generate="draw"
          @use="useLook"
          @delete="removeLook"
        />
        <DesktopOrganizer v-else-if="tab === 'desktop'" @speak="notice = $event" />
        <PhoneWork
          v-else
          v-model="phoneDraft"
          :tasks="state.phoneTasks"
          :running="pending === 'phone'"
          :busy="pending !== null"
          :error="phoneError"
          @plan="plan"
          @toggle="toggleStep"
          @copy="copyTask"
        />
      </div>
    </main>

    <SettingsDialog
      v-if="settingsOpen"
      :state="state"
      :env-chat="Boolean(health?.deepseekEnv)"
      :env-image="Boolean(health?.dashscopeEnv)"
      @close="settingsOpen = false"
      @save="saveSettings"
    />
  </div>
</template>
