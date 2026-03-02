<template>
  <div class="relative">
    <div
      class="flex items-center gap-3 bg-white rounded-xl border-2 transition-colors px-4 py-3 shadow-sm"
      :class="isFocused ? 'border-violet-400' : 'border-stone-200'"
    >
      <!-- AI sparkle icon -->
      <div class="flex-shrink-0">
        <svg
          class="w-4 h-4"
          :class="isThinking ? 'text-violet-500 animate-pulse' : 'text-violet-300'"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z" />
        </svg>
      </div>
      <div class="flex-1">
        <textarea
          ref="input"
          v-model="text"
          :placeholder="placeholder"
          :disabled="isThinking"
          rows="1"
          class="w-full resize-none text-sm text-stone-800 placeholder-stone-400 outline-none bg-transparent leading-relaxed disabled:opacity-50"
          @focus="isFocused = true"
          @blur="isFocused = false"
          @keydown.enter.exact.prevent="submit"
          @input="autoResize"
        />
      </div>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <span
          v-if="isThinking"
          class="text-xs text-violet-500 font-medium animate-pulse"
        >
          Thinking...
        </span>
        <kbd
          v-else-if="!text"
          class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-stone-400 bg-stone-100 rounded"
        >
          Enter
        </kbd>
        <button
          class="p-1.5 rounded-lg transition-all"
          :class="
            text.trim() && !isThinking
              ? 'bg-violet-500 text-white hover:bg-violet-600 shadow-sm'
              : 'bg-stone-100 text-stone-400'
          "
          :disabled="!text.trim() || isThinking"
          @click="submit"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "TodoInput",
  props: {
    placeholder: {
      type: String,
      default: "Describe what you need to do...",
    },
    isThinking: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["submit"],
  data() {
    return {
      text: "",
      isFocused: false,
    };
  },
  mounted() {
    document.addEventListener("keydown", this.onGlobalKey);
  },
  beforeUnmount() {
    document.removeEventListener("keydown", this.onGlobalKey);
  },
  methods: {
    submit() {
      if (this.isThinking) return;
      const trimmed = this.text.trim();
      if (!trimmed) return;
      this.$emit("submit", trimmed);
      this.text = "";
      this.$nextTick(() => this.autoResize());
    },
    autoResize() {
      const el = this.$refs.input as HTMLTextAreaElement;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    },
    focus() {
      (this.$refs.input as HTMLTextAreaElement)?.focus();
    },
    onGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        this.focus();
      }
    },
  },
});
</script>
