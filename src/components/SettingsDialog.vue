<script setup lang="ts">
import { reactive, ref } from "vue";
import type { PetState, SettingsDraft } from "@/types/pet";

const props = defineProps<{
  state: PetState;
  envChat: boolean;
  envImage: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [value: SettingsDraft];
}>();

const draft = reactive<SettingsDraft>({
  name: props.state.name,
  owner: props.state.owner,
  notes: props.state.notes,
  deepseekKey: props.state.deepseekKey,
  dashscopeKey: props.state.dashscopeKey,
  region: props.state.region,
  customBase: props.state.customBase,
});
const showKeys = ref(false);

function save() {
  emit("save", {
    name: draft.name.trim() || "团子",
    owner: draft.owner.trim() || "主人",
    notes: draft.notes.trim(),
    deepseekKey: draft.deepseekKey.trim(),
    dashscopeKey: draft.dashscopeKey.trim(),
    region: draft.region,
    customBase: draft.customBase.trim(),
  });
}
</script>

<template>
  <div class="dialog-back" @mousedown.self="emit('close')">
    <form class="panel dialog" role="dialog" aria-labelledby="settings-title" @submit.prevent="save">
      <header class="panel-head">
        <div>
          <p class="kicker">Config</p>
          <h2 id="settings-title" class="text-2xl">宠物和密钥</h2>
        </div>
        <button type="button" class="btn btn-text" @click="emit('close')">关闭</button>
      </header>
      <label class="mb-3 flex flex-col gap-1.5 text-sm text-ink/70">
        宠物名字
        <input v-model="draft.name" maxlength="20" class="control" />
      </label>
      <label class="mb-3 flex flex-col gap-1.5 text-sm text-ink/70">
        怎么称呼你
        <input v-model="draft.owner" maxlength="20" class="control" />
      </label>
      <label class="mb-3 flex flex-col gap-1.5 text-sm text-ink/70">
        性格
        <input v-model="draft.notes" maxlength="200" class="control" placeholder="例如：话少一点，记得提醒我喝水" />
      </label>
      <label class="mb-3 flex flex-col gap-1.5 text-sm text-ink/70">
        DeepSeek 密钥 {{ envChat ? "（服务器里已经有一份）" : "" }}
        <input v-model="draft.deepseekKey" :type="showKeys ? 'text' : 'password'" autocomplete="off" spellcheck="false" class="control" />
      </label>
      <label class="mb-3 flex flex-col gap-1.5 text-sm text-ink/70">
        百炼 DashScope 密钥 {{ envImage ? "（服务器里已经有一份）" : "" }}
        <input v-model="draft.dashscopeKey" :type="showKeys ? 'text' : 'password'" autocomplete="off" spellcheck="false" class="control" />
      </label>
      <label class="mb-3 flex flex-col gap-1.5 text-sm text-ink/70">
        生图区域
        <select v-model="draft.region" class="control">
          <option value="cn">北京</option>
          <option value="intl">国际站</option>
        </select>
      </label>
      <label class="mb-3 flex flex-col gap-1.5 text-sm text-ink/70">
        自定义生图地址
        <input v-model="draft.customBase" class="control" placeholder="一般留空" />
      </label>
      <p class="mb-3 text-sm text-ink/70">密钥保存在这台浏览器里，只发给本机上的超级宠物服务，再由它去调用 DeepSeek 和百炼。</p>
      <div class="flex gap-2">
        <button type="button" class="btn btn-ghost" @click="showKeys = !showKeys">{{ showKeys ? "隐藏密钥" : "显示密钥" }}</button>
        <button type="submit" class="btn btn-solid">保存</button>
      </div>
    </form>
  </div>
</template>
