<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  CATEGORY_NAMES,
  categoryFor,
  moveIntoCategory,
  permissionGranted,
  pickDirectory,
  recallDirectory,
  rememberDirectory,
  scanDirectory,
  type LooseFile,
} from "@/lib/desktop";

const emit = defineEmits<{ speak: [line: string] }>();

const samples = ["合同.pdf", "照片.jpg", "会议.mp4", "安装包.exe", "笔记.txt", "数据.xlsx", "歌曲.mp3", "草稿.zip", "readme", "项目.js", "微信.lnk"];
const folder = ref<FileSystemDirectoryHandle | null>(null);
const files = ref<LooseFile[]>([]);
const checked = ref<Record<string, boolean>>(Object.fromEntries(CATEGORY_NAMES.map((name) => [name, true])));
const busy = ref("");
const error = ref("");
const report = ref<string[]>([]);

const sampleGroups = computed(() => {
  const groups = new Map<string, string[]>();
  for (const name of samples) {
    const category = categoryFor(name);
    groups.set(category, [...(groups.get(category) || []), name]);
  }
  return [...groups.entries()];
});

const chosen = computed(() => files.value.filter((file) => checked.value[file.category]));

onMounted(() => {
  recallDirectory()
    .then(async (dir) => {
      if (!dir) return;
      folder.value = dir;
      if (await permissionGranted(dir, false)) files.value = await scanDirectory(dir);
    })
    .catch(() => undefined);
});

async function connect(askExisting: boolean) {
  error.value = "";
  report.value = [];
  try {
    const dir = askExisting && folder.value ? folder.value : await pickDirectory();
    const allowed = await permissionGranted(dir, true);
    if (!allowed) {
      error.value = "还没有获得这个文件夹的写入许可。";
      return;
    }
    await rememberDirectory(dir);
    folder.value = dir;
    files.value = await scanDirectory(dir);
    emit("speak", `我看着「${dir.name}」最外面这一层。你点头之后我再移动。`);
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") return;
    error.value = caught instanceof Error ? caught.message : "文件夹没有打开。";
  }
}

async function tidy() {
  if (!folder.value) return;
  error.value = "";
  report.value = [];
  const moving = chosen.value;
  const notes: string[] = [];
  let done = 0;
  for (const file of moving) {
    busy.value = `正在移动 ${done + 1} / ${moving.length}：${file.name}`;
    try {
      const target = await moveIntoCategory(folder.value, file);
      notes.push(`${file.name} → ${file.category}/${target}`);
      done += 1;
    } catch {
      notes.push(`${file.name} 还留在原处`);
    }
  }
  busy.value = "";
  report.value = notes;
  files.value = await scanDirectory(folder.value);
  emit("speak", done ? `收拾好了，移动了 ${done} 个文件。` : "这次没有文件被移动。");
}

function countOf(name: string) {
  return files.value.filter((file) => file.category === name).length;
}
</script>

<template>
  <section class="panel" aria-label="整理桌面">
    <header class="panel-head">
      <div>
        <p class="kicker">03 / Sort</p>
        <h2 class="text-2xl">整理</h2>
        <p class="mt-1 text-ink/70">选择一个文件夹，例如桌面。我只移动最外面一层的散落文件，放进按类型命名的子文件夹。</p>
      </div>
    </header>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn btn-solid" @click="connect(false)">{{ folder ? "换一个文件夹" : "选择文件夹" }}</button>
      <button v-if="folder" type="button" class="btn btn-ghost" @click="connect(true)">重新读取「{{ folder.name }}」</button>
    </div>
    <p v-if="error" class="alert mt-3">{{ error }}</p>
    <p v-if="busy" class="alert-busy mt-3">{{ busy }}</p>

    <template v-if="folder">
      <div class="mt-3 flex flex-wrap gap-2">
        <label v-for="name in CATEGORY_NAMES" v-show="countOf(name)" :key="name" class="tag">
          <input v-model="checked[name]" type="checkbox" />
          {{ name }}
          <small class="text-ink/70">{{ countOf(name) }}</small>
        </label>
      </div>
      <ul class="mt-2 mb-3.5 flex max-h-72 flex-col gap-1.5 overflow-auto">
        <li v-for="file in files" :key="file.name" class="row">
          <b>{{ file.name }}</b>
          <span class="text-ink/70">{{ file.category }}</span>
        </li>
      </ul>
      <p v-if="!files.length" class="text-ink/70">这一层已经收进分类文件夹了。</p>
      <button type="button" class="btn btn-solid" :disabled="!chosen.length || Boolean(busy)" @click="tidy">移动 {{ chosen.length }} 个文件</button>
    </template>
    <div v-else class="stack mt-3">
      <p>还没选文件夹。下面是分类会怎么落位：</p>
      <p v-for="[name, items] in sampleGroups" :key="name" class="mt-1.5">
        <b>{{ name }}</b>
        {{ items.join("、") }}
      </p>
    </div>
    <ul v-if="report.length" class="mt-3 flex flex-col gap-1.5">
      <li v-for="line in report" :key="line" class="row">{{ line }}</li>
    </ul>
  </section>
</template>
