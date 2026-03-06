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

    <div
      v-if="!isEditing"
      class="flex-1 min-w-0 cursor-pointer select-none"
      @dblclick="startEditing"
    >
      <div
        class="text-sm leading-relaxed"
        :class="todo.done ? 'line-through text-stone-400' : 'text-stone-700'"
      >
        {{ displayText }}
      </div>

      <div v-if="keyEntries.length > 0" class="mt-1.5 flex flex-wrap gap-1.5">
        <template v-for="entry in keyEntries" :key="entry.key">
          <a
            v-if="entry.key === 'location'"
            :href="locationHref(String(entry.value))"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-sky-100 text-sky-800 hover:bg-sky-200 transition-colors"
            @click.stop
          >
            {{ keyLabel(entry.key) }}: {{ String(entry.value) }}
          </a>

          <span
            v-else
            class="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-stone-200 text-stone-700"
          >
            {{ keyLabel(entry.key) }}: {{ formatKeyValue(entry.key, entry.value) }}
          </span>
        </template>
      </div>
    </div>

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
import type { Todo, TodoKeyValue } from "../api";

interface TodoKeyEntry {
  key: string;
  value: TodoKeyValue;
}

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
  computed: {
    displayText(): string {
      return this.todo.title?.trim() || this.todo.text;
    },
    keyEntries(): TodoKeyEntry[] {
      const entries = Object.entries(this.todo.keys || {});
      return entries.map(([key, value]) => ({ key, value }));
    },
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
    keyLabel(key: string): string {
      return key.replace(/_/g, " ");
    },
    locationHref(location: string): string {
      return `https://maps.apple.com/?q=${encodeURIComponent(location)}`;
    },
    formatKeyValue(key: string, value: TodoKeyValue): string {
      if (key !== "time") return String(value);

      const numericTime =
        typeof value === "number"
          ? value
          : /^\d+$/.test(String(value))
            ? Number(value)
            : Number.NaN;

      if (!Number.isFinite(numericTime)) {
        return String(value);
      }

      const rounded = Math.round(numericTime);
      const padded = String(rounded).padStart(4, "0");
      const hours = Number(padded.slice(0, 2));
      const minutes = Number(padded.slice(2, 4));

      if (hours > 23 || minutes > 59) {
        return String(value);
      }

      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    },
  },
});
</script>
