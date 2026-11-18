<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { visibleReply } from "@/lib/text";
import type { ChatMessage } from "@/types/pet";

const props = defineProps<{
  messages: ChatMessage[];
  liveReply: string;
  streaming: boolean;
  busy: boolean;
}>();

const draft = defineModel<string>({ required: true });
const emit = defineEmits<{ send: [text: string]; clear: [] }>();
const end = ref<HTMLElement | null>(null);

const starters = [
  "今天桌面有点乱，帮我看看怎么收",
  "我想换成一只小狐狸",
  "帮我把明天三点的会记到手机备忘录里",
];

watch(
  () => [props.messages.length, props.liveReply],
  async () => {
    await nextTick();
    end.value?.scrollIntoView({ block: "end" });
  },
);

function submit() {
  emit("send", draft.value);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    submit();
  }
}
</script>

<template>
  <section class="panel" aria-label="聊天">
    <header class="panel-head">
      <div>
        <p class="kicker">01 / Link</p>
        <h2 class="text-2xl">聊天</h2>
        <p class="mt-1 text-ink/70">说话走 DeepSeek。提到整理、换样子或手机上的事，我会把对应的页面打开。</p>
      </div>
      <button type="button" class="btn btn-text" :disabled="!messages.length" @click="emit('clear')">清空</button>
    </header>
    <div class="flex max-h-[460px] flex-col gap-2.5 overflow-auto pr-1" aria-live="polite">
      <div v-if="!messages.length && !liveReply" class="flex flex-wrap gap-2">
        <button v-for="item in starters" :key="item" type="button" class="chip" @click="emit('send', item)">{{ item }}</button>
      </div>
      <article
        v-for="message in messages"
        :key="message.id"
        class="bubble"
        :class="message.role === 'user' ? 'bubble-user' : ''"
      >
        <span class="kicker">{{ message.role === "user" ? "You" : "Pet" }}</span>
        <p class="mt-1 whitespace-pre-wrap leading-relaxed">{{ message.content }}</p>
      </article>
      <article v-if="streaming" class="bubble">
        <span class="kicker">Pet</span>
        <p class="mt-1 whitespace-pre-wrap leading-relaxed">{{ visibleReply(liveReply) || "我想想…" }}</p>
      </article>
      <div ref="end" />
    </div>
    <form class="mt-3.5 flex flex-col gap-2" @submit.prevent="submit">
      <textarea v-model="draft" rows="3" class="control resize-y" aria-label="聊天内容" placeholder="跟我说一句" @keydown="onKeydown" />
      <button type="submit" class="btn btn-solid self-start" :disabled="busy || !draft.trim()">发送</button>
    </form>
  </section>
</template>
