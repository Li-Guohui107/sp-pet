<script setup lang="ts">
import type { GalleryItem, ImageModel } from "@/types/pet";

defineProps<{
  model: ImageModel;
  running: boolean;
  busy: boolean;
  error: string;
  gallery: GalleryItem[];
  currentUrl: string;
}>();

const prompt = defineModel<string>({ required: true });
const emit = defineEmits<{
  model: [model: ImageModel];
  generate: [];
  use: [url: string];
  delete: [item: GalleryItem];
}>();

const presets = [
  "圆滚滚的橘猫，围着一条短围巾",
  "墨绿色的小龙，金色眼睛，短翅膀",
  "白色的团子，短手短脚，脸上一点腮红",
  "耳尖带橙色的小白狐",
  "戴圆眼镜的企鹅管家",
];

const styles = ["软胶玩具", "水彩", "扁平贴纸", "毛绒玩偶", "瓷偶"];
const models: { id: ImageModel; label: string }[] = [
  { id: "qwen-image-2.0", label: "Qwen-Image 2.0" },
  { id: "qwen-image-2.0-pro", label: "Qwen-Image 2.0 Pro" },
  { id: "qwen-image-plus", label: "Qwen-Image Plus" },
  { id: "qwen-image", label: "Qwen-Image" },
];

function addStyle(item: string) {
  if (!prompt.value.includes(item)) prompt.value = `${prompt.value}，${item}`.replace(/^，/, "");
}
</script>

<template>
  <section class="panel" aria-label="形象">
    <header class="panel-head">
      <div>
        <p class="kicker">02 / Render</p>
        <h2 class="text-2xl">形象</h2>
        <p class="mt-1 text-ink/70">描述想要的样子。生成走通义千问 Qwen-Image 系列，图片会保存在这台电脑上。</p>
      </div>
    </header>
    <div class="flex flex-wrap gap-2">
      <button v-for="item in presets" :key="item" type="button" class="chip" :class="prompt === item ? 'chip-on' : ''" @click="prompt = item">
        {{ item }}
      </button>
    </div>
    <label class="mt-3 flex flex-col gap-1.5 text-sm text-ink/70">
      样子
      <textarea v-model="prompt" rows="3" class="control resize-y" aria-label="宠物形象描述" />
    </label>
    <div class="mt-3 flex flex-wrap gap-2">
      <button v-for="item in styles" :key="item" type="button" class="chip" @click="addStyle(item)">{{ item }}</button>
    </div>
    <div class="mt-3 flex flex-wrap items-end gap-3">
      <label class="flex min-w-48 flex-1 flex-col gap-1.5 text-sm text-ink/70">
        模型
        <select class="control" :value="model" aria-label="生图模型" @change="emit('model', ($event.target as HTMLSelectElement).value as ImageModel)">
          <option v-for="item in models" :key="item.id" :value="item.id">{{ item.label }}</option>
        </select>
      </label>
      <button type="button" class="btn btn-solid" :disabled="busy || prompt.trim().length < 2" @click="emit('generate')">
        {{ running ? "正在画…" : "生成形象" }}
      </button>
    </div>
    <p v-if="error" class="alert mt-3">{{ error }}</p>
    <div class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
      <figure v-for="item in gallery" :key="item.id" class="card overflow-hidden p-0" :class="item.url === currentUrl ? 'is-current' : ''">
        <img :src="item.url" :alt="item.prompt" class="h-40 w-full bg-[#041018] object-cover" />
        <figcaption class="flex flex-col gap-1.5 p-2.5">
          <p class="leading-snug">{{ item.prompt }}</p>
          <small class="text-ink/70">{{ item.model }}</small>
          <span class="flex gap-2">
            <button type="button" class="mini" @click="emit('use', item.url)">用这张</button>
            <button type="button" class="mini" @click="emit('delete', item)">移除</button>
          </span>
        </figcaption>
      </figure>
    </div>
  </section>
</template>
