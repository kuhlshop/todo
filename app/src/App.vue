<template>
  <div class="max-w-2xl mx-auto px-4 py-6 sm:py-10">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-lg font-semibold text-stone-800 tracking-tight">
        {{ isSettingsOpen ? "Settings" : "Todos" }}
      </h1>
      <button
        v-if="isSettingsOpen"
        class="text-xs font-medium rounded-lg border border-stone-200 px-2.5 py-1 text-stone-600 hover:bg-stone-50"
        @click="closeSettings"
      >
        Back
      </button>
    </div>

    <div v-if="isSettingsOpen" class="space-y-6">
      <div class="rounded-xl border border-stone-200 bg-white p-4">
        <h2 class="text-sm font-semibold text-stone-700 mb-3">Week View</h2>
        <label class="text-sm text-stone-600 block">
          Start of week
          <select
            class="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
            :value="weekStartsOn"
            @change="onWeekStartChange"
          >
            <option value="SUN">Sunday</option>
            <option value="MON">Monday</option>
            <option value="TUE">Tuesday</option>
            <option value="WED">Wednesday</option>
            <option value="THU">Thursday</option>
            <option value="FRI">Friday</option>
            <option value="SAT">Saturday</option>
          </select>
        </label>
        <p class="text-xs text-stone-400 mt-2">
          This controls the week layout in the main todo view.
        </p>
      </div>
    </div>

    <div v-else>
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            class="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
            @click="toggleCalendar"
          >
            Calendar View
          </button>
        </div>
        <span class="text-xs text-stone-400 font-mono">
          {{ monthLabel }}
        </span>
      </div>

      <div
        v-if="isCalendarOpen"
        class="mb-6 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
      >
        <div class="mb-3 flex items-center justify-between">
          <button
            class="rounded px-2 py-1 text-stone-500 hover:bg-stone-100"
            @click="changeCalendarMonth(-1)"
          >
            <span aria-hidden="true">&larr;</span>
          </button>
          <div class="text-sm font-medium text-stone-700">
            {{ calendarMonthLabel }}
          </div>
          <button
            class="rounded px-2 py-1 text-stone-500 hover:bg-stone-100"
            @click="changeCalendarMonth(1)"
          >
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>

        <div class="grid grid-cols-7 gap-1.5 pb-1 text-center text-xs text-stone-400">
          <div
            v-for="weekday in calendarWeekdayHeaders"
            :key="weekday"
            class="font-medium uppercase tracking-wide"
          >
            {{ weekday }}
          </div>
        </div>

        <div v-if="isCalendarLoading" class="py-6 text-center text-xs text-stone-400">
          Loading calendar...
        </div>
        <div v-else class="grid grid-cols-7 gap-1.5">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            :disabled="!cell.date"
            class="min-h-[58px] rounded-lg px-1.5 py-1 text-left transition-colors disabled:cursor-default"
            :class="calendarCellClass(cell)"
            @click="cell.date && selectCalendarDate(cell.date)"
          >
            <div class="text-xs font-medium">{{ cell.dayNum || "" }}</div>
            <div v-if="cell.stats.total > 0" class="mt-1 space-y-0.5 text-[10px] leading-3">
              <div v-if="cell.stats.upcoming > 0" class="flex items-center gap-1 text-sky-600">
                <span class="h-1.5 w-1.5 rounded-full bg-sky-500" />
                {{ cell.stats.upcoming }}
              </div>
              <div v-if="cell.stats.done > 0" class="flex items-center gap-1 text-amber-700">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {{ cell.stats.done }}
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Week Navigation -->
      <div class="flex justify-center mb-8">
        <WeekBar
          :days="weekDays"
          :selected-date="selectedDate"
          :is-this-week="isThisWeek"
          @select="selectDate"
          @prev="prevWeek"
          @next="nextWeek"
          @today="goToday"
        />
      </div>

      <!-- Input -->
      <div class="mb-8">
        <TodoInput ref="todoInput" @submit="addTodo" />
      </div>

      <!-- Date label -->
      <div class="flex items-center gap-3 mb-4">
        <h2 class="text-sm font-semibold text-stone-500 uppercase tracking-wider">
          {{ dayLabel }}
        </h2>
        <div v-if="todos.length > 0" class="text-xs text-stone-400">
          {{ doneCount }}/{{ todos.length }} done
        </div>
      </div>

      <!-- Todo List -->
      <div v-if="isLoading" class="py-12 text-center text-stone-400 text-sm">
        Loading...
      </div>
      <div v-else-if="todos.length === 0" class="py-12 text-center">
        <p class="text-stone-400 text-sm">No todos for this day.</p>
        <p class="text-stone-300 text-xs mt-1">Type above to add one!</p>
      </div>
      <div v-else class="space-y-0.5">
        <!-- Pending todos first, then completed -->
        <TodoItem
          v-for="todo in sortedTodos"
          :key="todo.originalIndex"
          :todo="todo"
          @toggle="toggleTodo(todo.originalIndex)"
          @delete="deleteTodo(todo.originalIndex)"
          @update="(text: string) => updateTodo(todo.originalIndex, text)"
        />
      </div>

      <!-- Progress bar -->
      <div v-if="todos.length > 0" class="mt-6">
        <div class="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-emerald-400 rounded-full transition-all duration-500"
            :style="{ width: progressPercent + '%' }"
          />
        </div>
      </div>
    </div>
  </div>

  <button
    class="fixed left-4 bottom-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-white/80 text-stone-500 transition-colors hover:border-stone-200 hover:bg-stone-100 hover:text-stone-700"
    aria-label="Open settings"
    title="Settings"
    @click="openSettings"
  >
    <svg
      class="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="9" cy="7" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  </button>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { api, type DayTodoStats, type Todo, type WeekStart } from "./api";
import WeekBar from "./components/WeekBar.vue";
import TodoInput from "./components/TodoInput.vue";
import TodoItem from "./components/TodoItem.vue";

interface WeekTodoCounts {
  [date: string]: number;
}

interface MonthTodoStatsMap {
  [date: string]: DayTodoStats;
}

interface CalendarCell {
  key: string;
  date: string | null;
  dayNum: number | null;
  isToday: boolean;
  isSelected: boolean;
  stats: {
    total: number;
    done: number;
    upcoming: number;
  };
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthKey: string, delta: number): string {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw) - 1;
  const d = new Date(year, month, 1);
  d.setMonth(d.getMonth() + delta);
  return monthKeyFromDate(d);
}

const WEEK_ORDER: WeekStart[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const WEEK_SHORT_LABEL: Record<WeekStart, string> = {
  SUN: "Su",
  MON: "Mo",
  TUE: "Tu",
  WED: "We",
  THU: "Th",
  FRI: "Fr",
  SAT: "Sa",
};

function getWeekStartDate(d: Date, weekStartsOn: WeekStart): Date {
  const day = d.getDay();
  const startIdx = WEEK_ORDER.indexOf(weekStartsOn);
  const diff = (day - startIdx + 7) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
}

function todayStr(): string {
  const now = new Date();
  return toDateStr(now);
}

export default defineComponent({
  name: "App",
  components: { WeekBar, TodoInput, TodoItem },
  data() {
    return {
      selectedDate: todayStr(),
      weekStartsOn: "SUN" as WeekStart,
      weekStart: getWeekStartDate(new Date(), "SUN"),
      isSettingsOpen: false,
      todos: [] as Todo[],
      weekCounts: {} as WeekTodoCounts,
      monthStats: {} as MonthTodoStatsMap,
      isLoading: false,
      isCalendarOpen: false,
      calendarMonth: monthKeyFromDate(new Date()),
      isCalendarLoading: false,
    };
  },
  computed: {
    monthLabel(): string {
      const d = new Date(this.selectedDate + "T12:00:00");
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    },
    dayLabel(): string {
      const d = new Date(this.selectedDate + "T12:00:00");
      if (this.selectedDate === todayStr()) return "Today";
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (this.selectedDate === toDateStr(tomorrow)) return "Tomorrow";
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (this.selectedDate === toDateStr(yesterday)) return "Yesterday";
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    },
    weekDays(): Array<{
      date: string;
      label: string;
      dayNum: number;
      isToday: boolean;
      todoCount: number;
    }> {
      const today = todayStr();
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(this.weekStart);
        d.setDate(d.getDate() + i);
        const date = toDateStr(d);
        const weekday = WEEK_ORDER[(WEEK_ORDER.indexOf(this.weekStartsOn) + i) % 7]!;
        return {
          date,
          label: WEEK_SHORT_LABEL[weekday],
          dayNum: d.getDate(),
          isToday: date === today,
          todoCount: this.weekCounts[date] || 0,
        };
      });
    },
    isThisWeek(): boolean {
      const today = new Date();
      const start = getWeekStartDate(today, this.weekStartsOn);
      return toDateStr(start) === toDateStr(this.weekStart);
    },
    sortedTodos(): Array<Todo & { originalIndex: number }> {
      return this.todos
        .map((t, i) => ({ ...t, originalIndex: i }))
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          return a.originalIndex - b.originalIndex;
        });
    },
    doneCount(): number {
      return this.todos.filter((t) => t.done).length;
    },
    progressPercent(): number {
      if (this.todos.length === 0) return 0;
      return Math.round((this.doneCount / this.todos.length) * 100);
    },
    calendarMonthLabel(): string {
      const d = new Date(`${this.calendarMonth}-01T12:00:00`);
      return d.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    },
    calendarWeekdayHeaders(): string[] {
      const startIdx = WEEK_ORDER.indexOf(this.weekStartsOn);
      return Array.from({ length: 7 }).map((_, i) => {
        const day = WEEK_ORDER[(startIdx + i) % 7]!;
        return WEEK_SHORT_LABEL[day];
      });
    },
    calendarCells(): CalendarCell[] {
      const [yearRaw, monthRaw] = this.calendarMonth.split("-");
      const year = Number(yearRaw);
      const month = Number(monthRaw) - 1;
      const first = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startIdx = WEEK_ORDER.indexOf(this.weekStartsOn);
      const leading = (first.getDay() - startIdx + 7) % 7;
      const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
      const today = todayStr();

      return Array.from({ length: totalCells }).map((_, index) => {
        const dayNum = index - leading + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
          return {
            key: `blank-${index}`,
            date: null,
            dayNum: null,
            isToday: false,
            isSelected: false,
            stats: { total: 0, done: 0, upcoming: 0 },
          };
        }

        const date = `${this.calendarMonth}-${String(dayNum).padStart(2, "0")}`;
        const stats = this.monthStats[date] || {
          date,
          total: 0,
          done: 0,
          upcoming: 0,
        };

        return {
          key: date,
          date,
          dayNum,
          isToday: date === today,
          isSelected: date === this.selectedDate,
          stats: {
            total: stats.total,
            done: stats.done,
            upcoming: stats.upcoming,
          },
        };
      });
    },
  },
  created() {
    this.initialize();
  },
  methods: {
    async initialize() {
      await this.loadSettings();
      this.calendarMonth = this.selectedDate.slice(0, 7);
      await Promise.all([this.loadDay(), this.loadWeek(), this.loadCalendarMonthStats()]);
    },
    applyWeekStart(weekStartsOn: WeekStart) {
      this.weekStartsOn = weekStartsOn;
      const selected = new Date(this.selectedDate + "T12:00:00");
      this.weekStart = getWeekStartDate(selected, this.weekStartsOn);
    },
    async loadSettings() {
      try {
        const settings = await api.getSettings();
        this.applyWeekStart(settings.weekStartsOn);
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    },
    async onWeekStartChange(event: Event) {
      const value = (event.target as HTMLSelectElement).value as WeekStart;
      if (value === this.weekStartsOn) return;

      try {
        const settings = await api.updateSettings({ weekStartsOn: value });
        this.applyWeekStart(settings.weekStartsOn);
        await this.loadWeek();
      } catch (e) {
        console.error("Failed to update settings:", e);
      }
    },
    toDayStats(date: string, todos: Todo[]): DayTodoStats {
      const done = todos.filter((todo) => todo.done).length;
      const total = todos.length;
      return {
        date,
        total,
        done,
        upcoming: total - done,
      };
    },
    openSettings() {
      this.isSettingsOpen = true;
    },
    closeSettings() {
      this.isSettingsOpen = false;
    },
    toggleCalendar() {
      this.isCalendarOpen = !this.isCalendarOpen;
      if (!this.isCalendarOpen) return;
      this.calendarMonth = this.selectedDate.slice(0, 7);
      this.loadCalendarMonthStats();
    },
    async loadCalendarMonthStats() {
      this.isCalendarLoading = true;
      try {
        const stats = await api.getMonthStats(this.calendarMonth);
        const next: MonthTodoStatsMap = {};
        for (const item of stats) {
          next[item.date] = item;
        }
        this.monthStats = next;
      } catch (e) {
        console.error("Failed to load calendar month stats:", e);
      }
      this.isCalendarLoading = false;
    },
    async changeCalendarMonth(delta: number) {
      this.calendarMonth = shiftMonth(this.calendarMonth, delta);
      await this.loadCalendarMonthStats();
    },
    calendarCellClass(cell: CalendarCell): string {
      if (!cell.date) return "bg-transparent";
      if (cell.isSelected) return "bg-stone-800 text-white";
      if (cell.isToday) return "bg-amber-50 text-amber-800 hover:bg-amber-100";
      return "text-stone-700 hover:bg-stone-100";
    },
    selectCalendarDate(date: string) {
      this.selectDate(date);
      this.isCalendarOpen = false;
    },
    async loadDay() {
      this.isLoading = true;
      try {
        const data = await api.getTodos(this.selectedDate);
        this.todos = data.todos;
      } catch (e) {
        console.error("Failed to load todos:", e);
      }
      this.isLoading = false;
    },
    async loadWeek() {
      try {
        const weekData = await api.getWeek(toDateStr(this.weekStart));
        const counts: WeekTodoCounts = {};
        for (const day of weekData) {
          counts[day.date] = day.todos.length;
        }
        this.weekCounts = counts;
      } catch (e) {
        console.error("Failed to load week:", e);
      }
    },
    selectDate(date: string) {
      this.selectedDate = date;
      const selected = new Date(date + "T12:00:00");
      this.weekStart = getWeekStartDate(selected, this.weekStartsOn);
      this.loadDay();
      this.loadWeek();
    },
    prevWeek() {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() - 7);
      this.weekStart = d;
      this.loadWeek();
    },
    nextWeek() {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + 7);
      this.weekStart = d;
      this.loadWeek();
    },
    goToday() {
      this.selectedDate = todayStr();
      this.weekStart = getWeekStartDate(new Date(), this.weekStartsOn);
      this.loadDay();
      this.loadWeek();
    },
    async addTodo(text: string) {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const result = await api.addTodo(this.selectedDate, text, timezone);
        const resolvedDate = result.date;
        const wasViewingDate = this.selectedDate;

        if (resolvedDate !== wasViewingDate) {
          const resolvedDateObj = new Date(resolvedDate + "T12:00:00");
          this.selectedDate = resolvedDate;
          this.weekStart = getWeekStartDate(resolvedDateObj, this.weekStartsOn);
          await this.loadWeek();
        } else {
          this.weekCounts[resolvedDate] = result.todos.length;
        }

        this.todos = result.todos;
        this.weekCounts[resolvedDate] = result.todos.length;
        if (resolvedDate.startsWith(this.calendarMonth)) {
          this.monthStats[resolvedDate] = this.toDayStats(resolvedDate, result.todos);
        }
      } catch (e) {
        console.error("Failed to add todo:", e);
      }
    },
    async toggleTodo(index: number) {
      try {
        this.todos = await api.toggleTodo(this.selectedDate, index);
        if (this.selectedDate.startsWith(this.calendarMonth)) {
          this.monthStats[this.selectedDate] = this.toDayStats(this.selectedDate, this.todos);
        }
      } catch (e) {
        console.error("Failed to toggle todo:", e);
      }
    },
    async deleteTodo(index: number) {
      try {
        this.todos = await api.deleteTodo(this.selectedDate, index);
        this.weekCounts[this.selectedDate] = this.todos.length;
        if (this.selectedDate.startsWith(this.calendarMonth)) {
          this.monthStats[this.selectedDate] = this.toDayStats(this.selectedDate, this.todos);
        }
      } catch (e) {
        console.error("Failed to delete todo:", e);
      }
    },
    async updateTodo(index: number, text: string) {
      try {
        this.todos = await api.updateTodoText(
          this.selectedDate,
          index,
          text,
        );
        if (this.selectedDate.startsWith(this.calendarMonth)) {
          this.monthStats[this.selectedDate] = this.toDayStats(this.selectedDate, this.todos);
        }
      } catch (e) {
        console.error("Failed to update todo:", e);
      }
    },
  },
});
</script>
