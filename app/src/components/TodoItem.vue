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

    <div class="flex-1 min-w-0">
      <span
        v-if="!isEditing"
        class="text-sm leading-relaxed cursor-pointer select-none"
        :class="todo.done ? 'line-through text-stone-400' : 'text-stone-700'"
        @dblclick="startEditing"
      >
        {{ todo.text }}
      </span>

      <input
        v-else
        ref="editInput"
        v-model="editText"
        class="w-full text-sm leading-relaxed bg-white border border-stone-300 rounded px-2 py-0.5 outline-none focus:border-amber-400"
        @keydown.enter="saveEdit"
        @keydown.escape="cancelEdit"
        @blur="saveEdit"
      />

      <!-- Key badges -->
      <div v-if="todo.keys && hasKeys" class="flex flex-wrap gap-1.5 mt-1">
        <!-- Time badge -->
        <span
          v-if="todo.keys.time"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
          {{ formatTime(todo.keys.time) }}
        </span>

        <!-- Location badge (clickable) -->
        <a
          v-if="todo.keys.location"
          :href="mapsUrl(todo.keys.location)"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
          @click.stop
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {{ todo.keys.location }}
        </a>

        <!-- Generic keys -->
        <span
          v-for="(value, key) in otherKeys"
          :key="key"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500"
        >
          {{ key }}: {{ value }}
        </span>
      </div>
    </div>

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
  computed: {
    hasKeys(): boolean {
      return !!this.todo.keys && Object.keys(this.todo.keys).length > 0;
    },
    otherKeys(): Record<string, string> {
      if (!this.todo.keys) return {};
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(this.todo.keys)) {
        if (k !== "time" && k !== "location" && v) {
          result[k] = v;
        }
      }
      return result;
    },
  },
  methods: {
    formatTime(time: string): string {
      if (!time || time.length !== 4) return time;
      const h = parseInt(time.slice(0, 2));
      const m = time.slice(2);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return m === "00" ? `${h12} ${ampm}` : `${h12}:${m} ${ampm}`;
    },
    mapsUrl(location: string): string {
      return `https://maps.apple.com/?q=${encodeURIComponent(location)}`;
    },
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
