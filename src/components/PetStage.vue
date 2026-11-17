<script setup lang="ts">
import type { TabId } from "@/types/pet";

defineProps<{
  name: string;
  imageUrl: string;
  line: string;
  tab: TabId;
  canInstall: boolean;
}>();

const emit = defineEmits<{
  tab: [tab: TabId];
  float: [];
  install: [];
}>();

const jumps: { id: TabId; label: string; hint: string }[] = [
  { id: "chat", label: "聊天", hint: "跟我说话" },
  { id: "look", label: "形象", hint: "换一张脸" },
  { id: "desktop", label: "整理", hint: "收拾文件夹" },
  { id: "phone", label: "办事", hint: "拆开手机上的事" },
];
</script>

<template>
  <section class="sticky top-4 rounded-[28px] border border-line/90 bg-paper p-4 shadow-[0_24px_50px_rgba(42,33,24,0.12)] max-lg:static" aria-label="桌面宠物">
    <div class="flex min-h-[300px] flex-col items-center justify-center overflow-hidden rounded-[22px] bg-linear-to-b from-moss-lite to-moss px-4 py-5 lg:min-h-[430px]">
      <div class="animate-bob">
        <img v-if="imageUrl" :src="imageUrl" alt="" class="max-h-[220px] w-[min(220px,86%)] object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.25)]" />
        <svg v-else class="block h-auto w-[min(176px,70%)]" viewBox="0 0 200 180" aria-hidden="true">
          <ellipse cx="100" cy="158" rx="46" ry="10" fill="rgba(0,0,0,0.18)" />
          <ellipse cx="100" cy="104" rx="62" ry="50" fill="#e36a45" />
          <circle cx="58" cy="58" r="22" fill="#e36a45" />
          <circle cx="142" cy="58" r="22" fill="#e36a45" />
          <ellipse cx="62" cy="112" rx="10" ry="6" fill="#ffd0c2" />
          <ellipse cx="138" cy="112" rx="10" ry="6" fill="#ffd0c2" />
          <g class="origin-center animate-blink">
            <circle cx="78" cy="100" r="5.5" fill="#2a2118" />
            <circle cx="122" cy="100" r="5.5" fill="#2a2118" />
          </g>
          <path d="M86 118c8 10 20 10 28 0" fill="none" stroke="#2a2118" stroke-width="4" stroke-linecap="round" />
        </svg>
      </div>
      <p class="mt-3.5 line-clamp-4 max-w-full rounded-2xl bg-paper px-3 py-2.5 leading-snug text-ink">{{ line }}</p>
    </div>
    <div class="flex flex-col items-start px-2 pt-3.5">
      <span class="text-ink/70">桌面上的</span>
      <strong class="font-display text-[28px]">{{ name }}</strong>
    </div>
    <div class="flex gap-2 px-2 pb-3">
      <button type="button" class="btn-solid" @click="emit('float')">浮到桌面上</button>
      <button v-if="canInstall" type="button" class="btn-ghost" @click="emit('install')">安装到桌面</button>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="item in jumps"
        :key="item.id"
        type="button"
        class="flex flex-col rounded-2xl border px-3 py-2.5 text-left"
        :class="tab === item.id ? 'border-ink bg-ink text-cream' : 'border-line bg-white'"
        @click="emit('tab', item.id)"
      >
        <b>{{ item.label }}</b>
        <small :class="tab === item.id ? 'text-cream/70' : 'text-ink/70'">{{ item.hint }}</small>
      </button>
    </div>
  </section>
</template>
