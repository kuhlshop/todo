<template>
  <div
    class="group flex items-start gap-3 py-2.5 px-3 -mx-3 rounded-lg transition-colors hover:bg-stone-100"
  >
    <button
      class="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
      :class="
        todo.done
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : 'border-stone-300 hover:border-emerald-400'
      "
      @click="$emit('toggle')"
    >
      <svg
        v-if="todo.done"
        class="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="3"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    </button>

    <span
      v-if="!isEditing"
      class="flex-1 text-sm leading-relaxed cursor-pointer select-none"
      :class="todo.done ? 'line-through text-stone-400' : 'text-stone-700'"
      @dblclick="startEditing"
    >
      {{ todo.text }}
    </span>

    <input
      v-else
      ref="editInput"
      v-model="editText"
      class="flex-1 text-sm leading-relaxed bg-white border border-stone-300 rounded px-2 py-0.5 outline-none focus:border-amber-400"
      @keydown.enter="saveEdit"
      @keydown.escape="cancelEdit"
      @blur="saveEdit"
    />

    <button
      class="flex-shrink-0 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all p-1"
      @click="$emit('delete')"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { Todo } from "../api";

export default defineComponent({
  name: "TodoItem",
  props: {
    todo: {
      type: Object as PropType<Todo>,
      required: true,
    },
  },
  emits: ["toggle", "delete", "update"],
  data() {
    return {
      isEditing: false,
      editText: "",
    };
  },
  methods: {
    startEditing() {
      if (this.todo.done) return;
      this.isEditing = true;
      this.editText = this.todo.text;
      this.$nextTick(() => {
        (this.$refs.editInput as HTMLInputElement)?.focus();
      });
    },
    saveEdit() {
      if (!this.isEditing) return;
      this.isEditing = false;
      const trimmed = this.editText.trim();
      if (trimmed && trimmed !== this.todo.text) {
        this.$emit("update", trimmed);
      }
    },
    cancelEdit() {
      this.isEditing = false;
    },
  },
});
</script>
