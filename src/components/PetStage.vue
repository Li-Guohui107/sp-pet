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
  <section class="stage" aria-label="桌面宠物">
    <div class="viewport">
      <div class="viewport-grid" aria-hidden="true"></div>
      <div class="ring" aria-hidden="true"></div>
      <div class="viewport-meta">
        <span>CAM-01</span>
        <span class="live"><i></i>LIVE</span>
      </div>
      <div class="relative z-10 animate-bob">
        <img v-if="imageUrl" :src="imageUrl" alt="" class="max-h-[220px] w-[min(220px,86%)] object-contain drop-shadow-[0_18px_24px_rgba(40,180,255,0.35)]" />
        <svg v-else class="block h-auto w-[min(176px,70%)] drop-shadow-[0_12px_24px_rgba(53,215,255,0.35)]" viewBox="0 0 200 180" aria-hidden="true">
          <ellipse cx="100" cy="158" rx="46" ry="10" fill="rgba(53,215,255,0.18)" />
          <ellipse cx="100" cy="104" rx="62" ry="50" fill="#35d7ff" />
          <circle cx="58" cy="58" r="22" fill="#35d7ff" />
          <circle cx="142" cy="58" r="22" fill="#35d7ff" />
          <ellipse cx="62" cy="112" rx="10" ry="6" fill="#b9f6ff" />
          <ellipse cx="138" cy="112" rx="10" ry="6" fill="#b9f6ff" />
          <g class="origin-center animate-blink">
            <circle cx="78" cy="100" r="5.5" fill="#041018" />
            <circle cx="122" cy="100" r="5.5" fill="#041018" />
          </g>
          <path d="M86 118c8 10 20 10 28 0" fill="none" stroke="#041018" stroke-width="4" stroke-linecap="round" />
        </svg>
      </div>
      <p class="speech line-clamp-4">{{ line }}</p>
    </div>
    <div class="flex items-end justify-between px-1 pt-3.5">
      <div>
        <p class="kicker">Unit</p>
        <strong class="stage-name text-[26px]">{{ name }}</strong>
      </div>
      <span class="kicker">Core</span>
    </div>
    <div class="flex gap-2 px-1 py-3">
      <button type="button" class="btn btn-solid" @click="emit('float')">浮到桌面上</button>
      <button v-if="canInstall" type="button" class="btn btn-ghost" @click="emit('install')">安装到桌面</button>
    </div>
    <div class="nav-grid">
      <button
        v-for="(item, index) in jumps"
        :key="item.id"
        type="button"
        class="nav-key"
        :class="tab === item.id ? 'nav-key-on' : ''"
        @click="emit('tab', item.id)"
      >
        <span class="kicker">0{{ index + 1 }}</span>
        <b>{{ item.label }}</b>
        <small>{{ item.hint }}</small>
      </button>
    </div>
  </section>
</template>
