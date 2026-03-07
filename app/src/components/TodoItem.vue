<template>
  <div
    class="group -mx-2 flex items-start gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-stone-200 hover:bg-stone-50"
  >
    <button
      class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-all"
      :class="
        todo.done
          ? 'text-white border-[var(--theme-completed)] bg-[var(--theme-completed)]'
          : 'border-stone-300 hover:border-[var(--theme-secondary)]'
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
        :style="todo.done ? { color: 'var(--theme-completed)' } : undefined"
        :class="todo.done ? 'line-through' : 'text-stone-700'"
      >
        {{ displayText }}
      </div>

      <div v-if="keyEntries.length > 0" class="mt-1.5 flex flex-wrap gap-1.5">
        <template v-for="entry in keyEntries" :key="entry.key">
          <span
            v-if="entry.key === 'time'"
            class="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium"
            :class="
              timeBadgeMeta(entry.value).tone === 'overdue'
                ? 'border-red-200 bg-red-50 text-red-700'
                : timeBadgeMeta(entry.value).tone === 'urgent'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-stone-200 bg-stone-100 text-stone-700'
            "
          >
            <svg class="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="8" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v5l3 2" />
            </svg>
            {{ timeBadgeMeta(entry.value).label }}
          </span>

          <a
            v-else-if="entry.key === 'location'"
            :href="locationHref(String(entry.value))"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
            :style="{
              borderColor: 'color-mix(in srgb, var(--theme-secondary) 45%, white)',
              backgroundColor: 'color-mix(in srgb, var(--theme-secondary) 12%, white)',
              color: 'var(--theme-secondary)',
            }"
            @click.stop
          >
            {{ keyLabel(entry.key) }}: {{ String(entry.value) }}
          </a>

          <span
            v-else
            class="inline-flex items-center rounded-md border border-stone-200 bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700"
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
      class="flex-1 rounded border border-stone-300 bg-white px-2 py-0.5 text-sm leading-relaxed outline-none focus:border-[var(--theme-secondary)]"
      @keydown.enter="saveEdit"
      @keydown.escape="cancelEdit"
      @blur="saveEdit"
    />

    <div class="flex flex-shrink-0 items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
      <button
        class="rounded p-1 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600 disabled:cursor-not-allowed disabled:opacity-30"
        :disabled="!canMoveUp"
        @click="$emit('move-up')"
        aria-label="Move todo up"
        title="Move up"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        class="rounded p-1 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600 disabled:cursor-not-allowed disabled:opacity-30"
        :disabled="!canMoveDown"
        @click="$emit('move-down')"
        aria-label="Move todo down"
        title="Move down"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <button
        class="p-1 text-stone-400 transition-colors hover:text-red-500"
        @click="$emit('delete')"
        aria-label="Delete todo"
        title="Delete"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
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
    canMoveUp: {
      type: Boolean,
      default: false,
    },
    canMoveDown: {
      type: Boolean,
      default: false,
    },
    selectedDate: {
      type: String,
      default: "",
    },
    nowTs: {
      type: Number,
      default: 0,
    },
  },
  emits: ["toggle", "delete", "update", "move-up", "move-down"],
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
    parseTimeValue(value: TodoKeyValue): number | null {
      const isValidHhmm = (hhmm: number): boolean => {
        if (!Number.isFinite(hhmm)) return false;
        const rounded = Math.round(hhmm);
        const hours = Math.floor(rounded / 100);
        const minutes = rounded % 100;
        return rounded >= 0 && rounded <= 2359 && hours <= 23 && minutes <= 59;
      };

      if (typeof value === "number") {
        const rounded = Math.round(value);
        return isValidHhmm(rounded) ? rounded : null;
      }

      if (typeof value !== "string") {
        return null;
      }

      const trimmed = value.trim().toLowerCase();
      if (!trimmed) return null;

      if (/^\d{3,4}$/.test(trimmed)) {
        const direct = Number(trimmed);
        return isValidHhmm(direct) ? direct : null;
      }

      const compact = trimmed.replace(/\s+/g, "");
      const meridiemNormalized = compact
        .replace(/a\.?m?\.?$/, "am")
        .replace(/p\.?m?\.?$/, "pm");
      const match = meridiemNormalized.match(/^(\d{1,2})(?:(?::|\.)(\d{2}))?(am|pm)?$/);
      if (!match) return null;

      const hourToken = match[1];
      const minuteToken = match[2];
      const meridiem = match[3];
      if (!hourToken) return null;

      let hours = Number(hourToken);
      const minutes = minuteToken ? Number(minuteToken) : 0;
      if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) {
        return null;
      }

      if (meridiem) {
        if (hours < 1 || hours > 12) return null;
        if (meridiem === "pm" && hours !== 12) hours += 12;
        if (meridiem === "am" && hours === 12) hours = 0;
      } else if (hours > 23) {
        return null;
      }

      const hhmm = hours * 100 + minutes;
      return isValidHhmm(hhmm) ? hhmm : null;
    },
    formatClockTime(value: TodoKeyValue): string {
      const hhmm = this.parseTimeValue(value);
      if (hhmm === null) return String(value);
      const hours = Math.floor(hhmm / 100);
      const minutes = hhmm % 100;
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    },
    formatRelativeTime(minutesUntil: number): string {
      if (minutesUntil >= 60) {
        const hours = Math.round((minutesUntil / 60) * 10) / 10;
        if (Number.isInteger(hours)) {
          return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
        }
        return `in ${hours} hours`;
      }
      return `in ${minutesUntil} ${minutesUntil === 1 ? "minute" : "minutes"}`;
    },
    localDateString(date: Date): string {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    timeBadgeMeta(
      value: TodoKeyValue,
    ): { label: string; tone: "default" | "urgent" | "overdue" } {
      const absolute = this.formatClockTime(value);
      const hhmm = this.parseTimeValue(value);
      if (hhmm === null) {
        return { label: `${this.keyLabel("time")}: ${absolute}`, tone: "default" };
      }

      const selectedDate = this.selectedDate;
      if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
        return { label: `${absolute}`, tone: "default" };
      }

      const today = new Date();
      const todayDate = this.localDateString(today);
      if (selectedDate !== todayDate) {
        return { label: `${absolute}`, tone: "default" };
      }

      const scheduled = new Date(`${selectedDate}T00:00:00`);
      scheduled.setHours(Math.floor(hhmm / 100), hhmm % 100, 0, 0);
      const referenceTs = this.nowTs > 0 ? this.nowTs : Date.now();
      const diffMinutes = Math.floor((scheduled.getTime() - referenceTs) / 60000);

      if (diffMinutes > 120) {
        return { label: `${absolute}`, tone: "default" };
      }

      if (diffMinutes > 0) {
        return {
          label: `${absolute} — ${this.formatRelativeTime(diffMinutes)}`,
          tone: "urgent",
        };
      }

      if (diffMinutes >= -59) {
        return {
          label: `${absolute} — Now`,
          tone: "urgent",
        };
      }

      const overdueHours = Math.max(1, Math.floor(Math.abs(diffMinutes) / 60));
      return {
        label: `${absolute} — ${overdueHours} ${overdueHours === 1 ? "hour" : "hours"} overdue`,
        tone: "overdue",
      };
    },
    formatKeyValue(_key: string, value: TodoKeyValue): string {
      return String(value);
    },
  },
});
</script>
