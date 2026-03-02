<template>
  <div class="max-w-2xl mx-auto px-4 py-6 sm:py-10">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-lg font-semibold text-stone-800 tracking-tight">Todos</h1>
      <span class="text-xs text-stone-400 font-mono">{{ monthLabel }}</span>
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
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { api, type Todo } from "./api";
import WeekBar from "./components/WeekBar.vue";
import TodoInput from "./components/TodoInput.vue";
import TodoItem from "./components/TodoItem.vue";

interface WeekTodoCounts {
  [date: string]: number;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
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
      weekStart: getMonday(new Date()),
      todos: [] as Todo[],
      weekCounts: {} as WeekTodoCounts,
      isLoading: false,
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
      const labels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
      const today = todayStr();
      return labels.map((label, i) => {
        const d = new Date(this.weekStart);
        d.setDate(d.getDate() + i);
        const date = toDateStr(d);
        return {
          date,
          label,
          dayNum: d.getDate(),
          isToday: date === today,
          todoCount: this.weekCounts[date] || 0,
        };
      });
    },
    isThisWeek(): boolean {
      const today = new Date();
      const monday = getMonday(today);
      return toDateStr(monday) === toDateStr(this.weekStart);
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
  },
  created() {
    this.loadDay();
    this.loadWeek();
  },
  methods: {
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
      this.loadDay();
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
      this.weekStart = getMonday(new Date());
      this.loadDay();
      this.loadWeek();
    },
    async addTodo(text: string) {
      try {
        this.todos = await api.addTodo(this.selectedDate, text);
        this.weekCounts[this.selectedDate] = this.todos.length;
      } catch (e) {
        console.error("Failed to add todo:", e);
      }
    },
    async toggleTodo(index: number) {
      try {
        this.todos = await api.toggleTodo(this.selectedDate, index);
      } catch (e) {
        console.error("Failed to toggle todo:", e);
      }
    },
    async deleteTodo(index: number) {
      try {
        this.todos = await api.deleteTodo(this.selectedDate, index);
        this.weekCounts[this.selectedDate] = this.todos.length;
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
      } catch (e) {
        console.error("Failed to update todo:", e);
      }
    },
  },
});
</script>
