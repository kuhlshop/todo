<template>
  <div class="flex items-center gap-1">
    <button
      class="p-1.5 rounded-lg hover:bg-stone-200 transition-colors text-stone-500"
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
        class="flex flex-col items-center px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all min-w-[44px]"
        :class="dayClass(day)"
        @click="$emit('select', day.date)"
      >
        <span class="uppercase tracking-wide" :class="day.isToday ? 'text-amber-700' : ''">
          {{ day.label }}
        </span>
        <span class="text-lg leading-tight" :class="day.isToday ? 'font-bold' : ''">
          {{ day.dayNum }}
        </span>
        <div
          v-if="day.todoCount > 0"
          class="w-1.5 h-1.5 rounded-full mt-0.5"
          :class="day.date === selectedDate ? 'bg-white/60' : 'bg-amber-400'"
        />
      </button>
    </div>

    <button
      class="p-1.5 rounded-lg hover:bg-stone-200 transition-colors text-stone-500"
      @click="$emit('next')"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>

    <button
      class="ml-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
      :class="isThisWeek ? 'bg-stone-200 text-stone-500' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'"
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
        return "bg-stone-800 text-white shadow-sm";
      }
      if (day.isToday) {
        return "bg-amber-50 text-amber-800 hover:bg-amber-100";
      }
      return "text-stone-600 hover:bg-stone-100";
    },
  },
});
</script>
