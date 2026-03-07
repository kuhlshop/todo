<template>
  <div class="relative">
    <div
      class="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-colors"
      :class="isFocused ? 'border-[var(--theme-secondary)]' : 'border-stone-200'"
    >
      <div class="flex-1">
        <textarea
          ref="input"
          v-model="text"
          :placeholder="placeholder"
          rows="1"
          class="w-full resize-none bg-transparent text-sm leading-relaxed text-stone-800 placeholder-stone-400 outline-none"
          @focus="isFocused = true"
          @blur="isFocused = false"
          @keydown.enter.exact.prevent="submit"
          @input="autoResize"
        />
      </div>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <kbd
          v-if="!text"
          class="hidden rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-mono text-stone-400 sm:inline-block"
        >
          Enter
        </kbd>
        <button
          class="rounded-lg border p-1.5 transition-all"
          :class="
            text.trim()
              ? 'text-white border-[var(--theme-primary)] bg-[var(--theme-primary)]'
              : 'border-stone-200 bg-stone-100 text-stone-400'
          "
          :disabled="!text.trim()"
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
      default: "Describe it naturally (e.g. Tuesday at 5:30 PM in Carlsbad)",
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
      // Cmd+K or Ctrl+K to focus input
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        this.focus();
      }
    },
  },
});
</script>
