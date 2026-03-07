<template>
  <div class="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1.5">
    <button
      class="rounded-lg border border-transparent p-1.5 text-stone-500 transition-colors hover:border-stone-200 hover:bg-stone-50"
      @click="$emit('prev')"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <div class="flex gap-1">
      <button
        v-for="day in days"
        :key="day.date"
        class="min-w-[44px] rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-medium transition-all"
        :class="dayClass(day)"
        @click="$emit('select', day.date)"
      >
        <span
          class="uppercase tracking-wide"
          :style="day.isToday ? { color: 'var(--theme-pending)' } : undefined"
        >
          {{ day.label }}
        </span>
        <span class="text-lg leading-tight" :class="day.isToday ? 'font-bold' : ''">
          {{ day.dayNum }}
        </span>
        <div
          v-if="day.todoCount > 0"
          class="w-1.5 h-1.5 rounded-full mt-0.5"
          :style="{
            backgroundColor:
              day.date === selectedDate ? 'rgba(255, 255, 255, 0.6)' : 'var(--theme-pending)',
          }"
        />
      </button>
    </div>

    <button
      class="rounded-lg border border-transparent p-1.5 text-stone-500 transition-colors hover:border-stone-200 hover:bg-stone-50"
      @click="$emit('next')"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>

    <button
      class="ml-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
      :class="
        isThisWeek
          ? 'border-stone-200 bg-stone-100 text-stone-500'
          : 'border-[color-mix(in_srgb,var(--theme-primary)_35%,white)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,white)] text-[var(--theme-primary)] hover:bg-[color-mix(in_srgb,var(--theme-primary)_16%,white)]'
      "
      @click="$emit('today')"
    >
      Today
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

interface DayInfo {
  date: string;
  label: string;
  dayNum: number;
  isToday: boolean;
  todoCount: number;
}

export default defineComponent({
  name: "WeekBar",
  props: {
    days: {
      type: Array as PropType<DayInfo[]>,
      required: true,
    },
    selectedDate: {
      type: String,
      required: true,
    },
    isThisWeek: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["select", "prev", "next", "today"],
  methods: {
    dayClass(day: DayInfo): string {
      if (day.date === this.selectedDate) {
        return "text-white border-[var(--theme-primary)] bg-[var(--theme-primary)]";
      }
      if (day.isToday) {
        return "border-[color-mix(in_srgb,var(--theme-primary)_40%,white)] bg-[color-mix(in_srgb,var(--theme-primary)_12%,white)] text-[color-mix(in_srgb,var(--theme-primary)_70%,black)] hover:bg-[color-mix(in_srgb,var(--theme-primary)_18%,white)]";
      }
      return "text-stone-600 hover:border-stone-200 hover:bg-stone-50";
    },
  },
});
</script>
