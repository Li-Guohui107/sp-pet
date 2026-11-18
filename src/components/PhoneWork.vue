<script setup lang="ts">
import { ref } from "vue";
import type { PhoneStep, PhoneTask } from "@/types/pet";

defineProps<{
  tasks: PhoneTask[];
  running: boolean;
  busy: boolean;
  error: string;
}>();

const draft = defineModel<string>({ required: true });
const emit = defineEmits<{
  plan: [];
  toggle: [taskId: string, index: number];
  copy: [task: PhoneTask];
}>();

const copied = ref<string[]>([]);
const kindLabel: Record<PhoneStep["kind"], string> = {
  open: "打开",
  tap: "点按",
  type: "输入",
  scroll: "滑动",
  check: "核对",
  stop: "停下",
};

function copy(task: PhoneTask) {
  emit("copy", task);
  copied.value = [...copied.value, task.id];
}
</script>

<template>
  <section class="panel" aria-label="手机办事">
    <header class="panel-head">
      <div>
        <p class="kicker">04 / Task</p>
        <h2 class="text-2xl">办事</h2>
        <p class="mt-1 text-ink/70">把要在自己手机上完成的事交给我。我会拆成步骤，发送、付款和删除会停下来等你点头。密码和验证码留给你自己输入。</p>
      </div>
    </header>
    <form @submit.prevent="emit('plan')">
      <label class="flex flex-col gap-1.5 text-sm text-ink/70">
        这件事
        <textarea v-model="draft" rows="3" class="control resize-y" aria-label="要在手机上完成的事" placeholder="例如：打开备忘录，记下明天下午三点开会" />
      </label>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="submit" class="btn btn-solid" :disabled="busy || draft.trim().length < 2">
          {{ running ? "正在拆步骤…" : "拆成步骤" }}
        </button>
        <button type="button" class="btn btn-ghost" @click="draft = '打开备忘录，记下明天下午三点开会'">填一个例子</button>
      </div>
    </form>
    <p v-if="error" class="alert mt-3">{{ error }}</p>
    <div class="mt-4 flex flex-col gap-3">
      <article v-for="task in tasks" :key="task.id" class="card">
        <template v-if="task.plan.refused">
          <h3 class="font-display text-xl">这件我先停一下</h3>
          <p class="mt-1">{{ task.plan.reason }}</p>
        </template>
        <template v-else>
          <header class="flex items-start justify-between gap-3">
            <h3 class="flex flex-col font-display text-xl">
              {{ task.plan.app }}
              <small class="font-sans text-sm font-normal text-ink/70">{{ task.plan.goal }}</small>
            </h3>
            <button type="button" class="btn btn-text" @click="copy(task)">{{ copied.includes(task.id) ? "已复制" : "复制步骤" }}</button>
          </header>
          <p v-if="task.plan.summary" class="mt-2">{{ task.plan.summary }}</p>
          <ol class="mt-2 flex list-none flex-col gap-2 p-0">
            <li v-for="(step, index) in task.plan.steps" :key="`${step.title}-${index}`" class="step" :class="step.needsConfirm ? 'step-hold' : ''">
              <label class="flex items-start gap-2.5">
                <input :checked="task.done.includes(index)" type="checkbox" @change="emit('toggle', task.id, index)" />
                <span>
                  <b class="block">{{ kindLabel[step.kind] }} · {{ step.title }}</b>
                  <small class="mt-0.5 block text-ink/70">{{ step.detail }}</small>
                  <code v-if="step.text" class="mt-1 block whitespace-pre-wrap">{{ step.text }}</code>
                  <em v-if="step.needsConfirm" class="mt-1 block text-coral-deep not-italic">等你点头</em>
                </span>
              </label>
            </li>
          </ol>
        </template>
      </article>
    </div>
  </section>
</template>
