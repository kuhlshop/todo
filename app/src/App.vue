<template>
  <div class="theme-root mx-auto max-w-[500px] px-4 pt-0 pb-8 sm:pt-0 sm:pb-12">
    <!-- Sky Visualizer -->
    <SkyVisualizer v-if="!isSettingsOpen" />

    <div
      class="relative -mt-16 rounded-2xl border border-stone-200/80 bg-white/95 p-5 shadow-xl shadow-stone-300/20 backdrop-blur-sm sm:p-6"
    >
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between border-b border-stone-100 pb-4">
        <h1 class="text-xl font-semibold tracking-tight text-stone-900">
          {{ isSettingsOpen ? "Settings" : "Todos" }}
        </h1>
        <button
          v-if="isSettingsOpen"
          class="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
          @click="closeSettings"
        >
          Back
        </button>
      </div>
      <div v-if="isSettingsOpen" class="space-y-5">
        <div class="overflow-x-auto pb-1">
          <div
            class="inline-flex min-w-full gap-1 rounded-xl bg-stone-50 p-1 ring-1 ring-stone-100"
          >
            <button
              v-for="file in configFiles"
              :key="file.fileName"
              class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              :class="
                activeConfigTab === file.fileName
                  ? 'text-white bg-[var(--theme-primary)]'
                  : 'text-stone-600 hover:bg-stone-100'
              "
              @click="selectConfigTab(file.fileName)"
            >
              {{ formatConfigTabLabel(file.fileName) }}
            </button>
          </div>
        </div>
        <div class="rounded-xl bg-white p-4 ring-1 ring-stone-100">
          <div v-if="!activeConfigFile" class="py-4 text-sm text-stone-500">
            No editable config files found.
          </div>
          <template v-else>
            <h2 class="text-sm font-semibold text-stone-700">
              {{
                activeConfigFile.kind === "json_schema"
                  ? activeConfigFile.jsonSchema?.title ||
                    formatConfigTabLabel(activeConfigFile.fileName)
                  : formatConfigTabLabel(activeConfigFile.fileName)
              }}
            </h2>
            <p
              v-if="
                activeConfigFile.kind === 'json_schema' &&
                activeConfigFile.jsonSchema?.description
              "
              class="mt-1 text-xs text-stone-400"
            >
              {{ activeConfigFile.jsonSchema.description }}
            </p>
            <div
              v-if="activeConfigFile.kind === 'markdown'"
              class="mt-3 space-y-2"
            >
              <textarea
                :value="getMarkdownDraft(activeConfigFile.fileName)"
                @input="
                  setMarkdownDraft(
                    activeConfigFile.fileName,
                    ($event.target as HTMLTextAreaElement).value
                  )
                "
                rows="14"
                class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition-colors focus:border-[var(--theme-secondary)]"
              />
              <p class="text-xs text-stone-400">
                Markdown content is saved directly to
                <span class="font-mono">{{ activeConfigFile.fileName }}</span>
                .
              </p>
            </div>
            <div
              v-else-if="activeConfigFile.kind === 'json_schema'"
              class="mt-3 space-y-3"
            >
              <div
                v-if="
                  !activeConfigFile.jsonSchema ||
                  activeConfigFile.jsonSchema.fields.length === 0
                "
                class="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500"
              >
                This JSON file has no schema fields to edit.
              </div>
              <div
                v-if="activeConfigFile.fileName === 'theme.json'"
                class="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
              >
                <div
                  class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500"
                >
                  Preset Themes
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="preset in themePresets"
                    :key="preset.key"
                    class="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
                    :class="
                      isThemePresetSelected(preset.key)
                        ? 'text-white border-[var(--theme-primary)] bg-[var(--theme-primary)]'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                    "
                    @click="applyThemePreset(preset.key)"
                  >
                    {{ preset.label }}
                  </button>
                </div>
              </div>
              <div
                v-for="field in activeConfigFile.jsonSchema?.fields || []"
                :key="field.key"
                class="space-y-1"
              >
                <label
                  class="block text-xs font-medium uppercase tracking-wide text-stone-500"
                >
                  {{ field.label }}
                </label>
                <input
                  v-if="field.type === 'text'"
                  type="text"
                  :value="
                    String(
                      getJsonDraftValue(activeConfigFile.fileName, field.key)
                    )
                  "
                  @input="
                    setJsonDraftValue(
                      activeConfigFile.fileName,
                      field.key,
                      ($event.target as HTMLInputElement).value
                    )
                  "
                  :placeholder="field.placeholder || ''"
                  class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition-colors focus:border-[var(--theme-secondary)]"
                />
                <div
                  v-else-if="field.type === 'color'"
                  class="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2"
                >
                  <input
                    type="color"
                    :value="
                      String(
                        getJsonDraftValue(activeConfigFile.fileName, field.key)
                      )
                    "
                    @input="
                      setJsonDraftValue(
                        activeConfigFile.fileName,
                        field.key,
                        ($event.target as HTMLInputElement).value
                      )
                    "
                    class="h-8 w-12 cursor-pointer rounded border border-stone-200 bg-transparent p-0"
                  />
                  <span class="font-mono text-xs text-stone-500">
                    {{
                      String(
                        getJsonDraftValue(activeConfigFile.fileName, field.key)
                      )
                    }}
                  </span>
                </div>
                <textarea
                  v-else-if="field.type === 'textarea'"
                  :value="
                    String(
                      getJsonDraftValue(activeConfigFile.fileName, field.key)
                    )
                  "
                  @input="
                    setJsonDraftValue(
                      activeConfigFile.fileName,
                      field.key,
                      ($event.target as HTMLTextAreaElement).value
                    )
                  "
                  rows="4"
                  :placeholder="field.placeholder || ''"
                  class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition-colors focus:border-[var(--theme-secondary)]"
                />
                <input
                  v-else-if="field.type === 'number'"
                  type="number"
                  :value="
                    getJsonNumberValue(activeConfigFile.fileName, field.key)
                  "
                  @input="
                    setJsonDraftValue(
                      activeConfigFile.fileName,
                      field.key,
                      Number(($event.target as HTMLInputElement).value)
                    )
                  "
                  :min="field.min"
                  :max="field.max"
                  :step="field.step || 1"
                  class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition-colors focus:border-[var(--theme-secondary)]"
                />
                <select
                  v-else-if="field.type === 'select'"
                  :value="
                    String(
                      getJsonDraftValue(activeConfigFile.fileName, field.key)
                    )
                  "
                  @change="
                    setJsonDraftValue(
                      activeConfigFile.fileName,
                      field.key,
                      ($event.target as HTMLSelectElement).value
                    )
                  "
                  class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition-colors focus:border-[var(--theme-secondary)]"
                >
                  <option
                    v-for="option in field.options || []"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <label
                  v-else-if="field.type === 'boolean'"
                  class="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700"
                >
                  <input
                    type="checkbox"
                    :checked="
                      Boolean(
                        getJsonDraftValue(activeConfigFile.fileName, field.key)
                      )
                    "
                    @change="
                      setJsonDraftValue(
                        activeConfigFile.fileName,
                        field.key,
                        ($event.target as HTMLInputElement).checked
                      )
                    "
                  />
                  Enabled
                </label>
                <p v-if="field.description" class="text-xs text-stone-400">
                  {{ field.description }}
                </p>
              </div>
            </div>
            <div class="mt-4 flex items-center justify-end">
              <button
                class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                :class="
                  isSavingConfig
                    ? 'border-stone-200 bg-stone-100 text-stone-400'
                    : 'text-white border-[var(--theme-primary)] bg-[var(--theme-primary)]'
                "
                :disabled="isSavingConfig"
                @click="saveActiveConfig"
              >
                {{ isSavingConfig ? "Saving..." : "Save changes" }}
              </button>
            </div>
          </template>
        </div>
      </div>
      <div v-else>
        <div class="mb-6 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button
              class="rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors"
              :class="
                isCalendarOpen
                  ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-white'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              "
              @click="toggleCalendar"
            >
              Calendar View
            </button>
          </div>
          <span class="font-mono text-sm tracking-[0.08em] text-stone-500">
            {{ monthLabel }}
          </span>
        </div>
        <div
          v-if="isCalendarOpen"
          class="mb-6 rounded-2xl bg-stone-50/80 p-4 ring-1 ring-stone-100"
        >
          <div class="mb-3 flex items-center justify-between">
            <button
              class="rounded-xl border border-stone-200 px-2.5 py-1 text-stone-600 transition-colors hover:bg-white"
              @click="changeCalendarMonth(-1)"
            >
              <span aria-hidden="true">&larr;</span>
            </button>
            <div class="text-sm font-semibold text-stone-800">
              {{ calendarMonthLabel }}
            </div>
            <button
              class="rounded-xl border border-stone-200 px-2.5 py-1 text-stone-600 transition-colors hover:bg-white"
              @click="changeCalendarMonth(1)"
            >
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
          <div
            class="grid grid-cols-7 gap-1.5 pb-1 text-center text-xs text-stone-500"
          >
            <div
              v-for="weekday in calendarWeekdayHeaders"
              :key="weekday"
              class="font-medium uppercase tracking-wide"
            >
              {{ weekday }}
            </div>
          </div>
          <div
            v-if="isCalendarLoading"
            class="py-6 text-center text-xs text-stone-400"
          >
            Loading calendar...
          </div>
          <div v-else class="grid grid-cols-7 gap-1.5">
            <button
              v-for="cell in calendarCells"
              :key="cell.key"
              :disabled="!cell.date"
              class="min-h-[58px] rounded-lg border border-transparent px-1.5 py-1 text-left transition-colors disabled:cursor-default"
              :class="calendarCellClass(cell)"
              @click="cell.date && selectCalendarDate(cell.date)"
            >
              <div class="text-xs font-medium">{{ cell.dayNum || "" }}</div>
              <div
                v-if="cell.stats.total > 0"
                class="mt-1 space-y-0.5 text-[10px] leading-3"
              >
                <div
                  v-if="cell.stats.upcoming > 0"
                  class="flex items-center gap-1"
                  :style="{ color: 'var(--theme-pending)' }"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :style="{ backgroundColor: 'var(--theme-pending)' }"
                  />
                  {{ cell.stats.upcoming }}
                </div>
                <div
                  v-if="cell.stats.done > 0"
                  class="flex items-center gap-1"
                  :style="{ color: 'var(--theme-completed)' }"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :style="{ backgroundColor: 'var(--theme-completed)' }"
                  />
                  {{ cell.stats.done }}
                </div>
              </div>
            </button>
          </div>
        </div>
        <!-- Input -->
        <div class="mb-6 space-y-3">
          <div class="rounded-2xl bg-stone-50/80 p-2 ring-1 ring-stone-100">
            <TodoInput ref="todoInput" @submit="addTodo" />
          </div>
          <div v-if="addQueue.length > 0" class="space-y-2">
            <div
              v-for="item in addQueue"
              :key="item.id"
              class="rounded-xl bg-white px-3 py-2 text-xs shadow-sm ring-1 ring-inset ring-stone-100"
              :class="
                item.status === 'failed' ? 'ring-red-200' : 'ring-stone-100'
              "
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium text-stone-700">
                    {{ item.text }}
                  </div>
                  <div
                    v-if="item.status === 'posting'"
                    class="mt-1 flex items-center gap-1.5 text-stone-400"
                  >
                    <span
                      class="h-1.5 w-1.5 animate-pulse rounded-full"
                      :style="{ backgroundColor: 'var(--theme-pending)' }"
                    />
                    Posting task...
                  </div>
                  <div v-else class="mt-1 text-red-600">
                    {{ item.error || "Failed to post task." }}
                  </div>
                </div>
                <div
                  v-if="item.status === 'failed'"
                  class="flex items-center gap-1"
                >
                  <button
                    class="rounded-md border border-stone-200 px-2 py-1 text-[11px] font-medium text-stone-600 transition-colors hover:bg-stone-50"
                    @click="retryAddQueueItem(item.id)"
                  >
                    Retry
                  </button>
                  <button
                    class="rounded-md border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50"
                    @click="dismissAddQueueItem(item.id)"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Date label -->
        <div class="mb-5">
          <div class="flex items-center gap-3">
            <h2
              class="text-sm font-semibold uppercase tracking-wider text-stone-600"
            >
              {{ dayLabel }}
            </h2>
            <div v-if="todos.length > 0" class="text-xs text-stone-500">
              {{ doneCount }}/{{ todos.length }} done
            </div>
          </div>
          <div v-if="todos.length > 0" class="mt-2">
            <div class="h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{
                  width: progressPercent + '%',
                  backgroundColor: 'var(--theme-completed)',
                }"
              />
            </div>
          </div>
        </div>
        <!-- Todo List -->
        <div v-if="isLoading" class="py-12 text-center text-sm text-stone-500">
          Loading...
        </div>
        <div v-else-if="todos.length === 0" class="py-12 text-center">
          <p class="text-sm text-stone-500">No todos for this day.</p>
          <p class="mt-1 text-xs text-stone-400">Type above to add one!</p>
        </div>
        <div v-else class="space-y-5">
          <section v-if="timedTodos.length > 0">
            <h3
              class="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500"
            >
              Timed Todos
            </h3>
            <div
              class="space-y-1 rounded-2xl bg-white p-2 ring-1 ring-stone-100"
            >
              <TodoItem
                v-for="todo in timedTodos"
                :key="todo.originalIndex"
                :todo="todo"
                :selected-date="selectedDate"
                :now-ts="nowTimestamp"
                @toggle="toggleTodo(todo.originalIndex)"
                @delete="deleteTodo(todo.originalIndex)"
                @update="(text: string) => updateTodo(todo.originalIndex, text)"
              />
            </div>
          </section>
          <section v-for="section in untimedTodoSections" :key="section.id">
            <h3
              class="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500"
            >
              {{ section.label }}
            </h3>
            <div
              class="space-y-1 rounded-2xl bg-white p-2 ring-1 ring-stone-100"
            >
              <TodoItem
                v-for="(todo, index) in section.todos"
                :key="todo.originalIndex"
                :todo="todo"
                :selected-date="selectedDate"
                :now-ts="nowTimestamp"
                :can-move-up="index > 0"
                :can-move-down="index < section.todos.length - 1"
                @toggle="toggleTodo(todo.originalIndex)"
                @delete="deleteTodo(todo.originalIndex)"
                @update="(text: string) => updateTodo(todo.originalIndex, text)"
                @move-up="moveTodoWithinSection(section.id, index, -1)"
                @move-down="moveTodoWithinSection(section.id, index, 1)"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>

  <button
    class="fixed bottom-4 left-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
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
import {
  api,
  type ConfigFilePayload,
  type DayTodoStats,
  type Todo,
  type TodoChangedEvent,
  type TodoKeyValue,
  type WeekStart,
} from "./api";
import TodoInput from "./components/TodoInput.vue";
import TodoItem from "./components/TodoItem.vue";
import SkyVisualizer from "./components/SkyVisualizer.vue";

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

interface JsonDraftByFile {
  [fileName: string]: Record<string, TodoKeyValue>;
}

interface MarkdownDraftByFile {
  [fileName: string]: string;
}

interface AddQueueItem {
  id: string;
  text: string;
  requestDate: string;
  status: "posting" | "failed";
  error: string | null;
}

interface DisplayTodo extends Todo {
  originalIndex: number;
  numericTime: number | null;
  isTimed: boolean;
}

interface TopicSection {
  id: string;
  label: string;
  todos: DisplayTodo[];
}

interface AppTheme {
  primary: string;
  secondary: string;
  bg: string;
  completed: string;
  pending: string;
  headingFont: string;
  textFont: string;
}

const DEFAULT_THEME: AppTheme = {
  primary: "#2563eb",
  secondary: "#7c3aed",
  bg: "#f7f7f5",
  completed: "#16a34a",
  pending: "#ea580c",
  headingFont: "Poppins",
  textFont: "Inter",
};

interface FontOption {
  value: string;
  label: string;
  googleFamily: string;
  cssStack: string;
}

const FONT_OPTIONS: FontOption[] = [
  {
    value: "Inter",
    label: "Inter",
    googleFamily: "Inter:wght@400;500;600;700",
    cssStack:
      '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  {
    value: "Poppins",
    label: "Poppins",
    googleFamily: "Poppins:wght@400;500;600;700",
    cssStack:
      '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  {
    value: "Roboto",
    label: "Roboto",
    googleFamily: "Roboto:wght@400;500;700",
    cssStack:
      '"Roboto", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  {
    value: "Montserrat",
    label: "Montserrat",
    googleFamily: "Montserrat:wght@400;500;600;700",
    cssStack:
      '"Montserrat", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  {
    value: "Lora",
    label: "Lora",
    googleFamily: "Lora:wght@400;500;600;700",
    cssStack: '"Lora", ui-serif, Georgia, Cambria, "Times New Roman", serif',
  },
  {
    value: "Merriweather",
    label: "Merriweather",
    googleFamily: "Merriweather:wght@400;700",
    cssStack:
      '"Merriweather", ui-serif, Georgia, Cambria, "Times New Roman", serif',
  },
  {
    value: "JetBrains Mono",
    label: "JetBrains Mono",
    googleFamily: "JetBrains+Mono:wght@400;500;700",
    cssStack:
      '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  {
    value: "Fira Code",
    label: "Fira Code",
    googleFamily: "Fira+Code:wght@400;500;700",
    cssStack: '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
];

interface ThemePreset {
  key: string;
  label: string;
  theme: AppTheme;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    key: "light",
    label: "Light",
    theme: {
      primary: "#2563eb",
      secondary: "#7c3aed",
      bg: "#f7f7f5",
      completed: "#16a34a",
      pending: "#ea580c",
      headingFont: "Poppins",
      textFont: "Inter",
    },
  },
  {
    key: "dark",
    label: "Dark",
    theme: {
      primary: "#93c5fd",
      secondary: "#c4b5fd",
      bg: "#111827",
      completed: "#34d399",
      pending: "#f59e0b",
      headingFont: "Montserrat",
      textFont: "Inter",
    },
  },
  {
    key: "hacker",
    label: "Hacker",
    theme: {
      primary: "#22c55e",
      secondary: "#16a34a",
      bg: "#050b05",
      completed: "#4ade80",
      pending: "#84cc16",
      headingFont: "JetBrains Mono",
      textFont: "Fira Code",
    },
  },
  {
    key: "sunset",
    label: "Sunset",
    theme: {
      primary: "#db2777",
      secondary: "#f97316",
      bg: "#fff7ed",
      completed: "#16a34a",
      pending: "#ea580c",
      headingFont: "Lora",
      textFont: "Merriweather",
    },
  },
  {
    key: "ocean",
    label: "Ocean",
    theme: {
      primary: "#0ea5e9",
      secondary: "#14b8a6",
      bg: "#ecfeff",
      completed: "#10b981",
      pending: "#0284c7",
      headingFont: "Montserrat",
      textFont: "Roboto",
    },
  },
];

function parseHexColor(value: string): RgbColor {
  const normalized = value.trim().replace(/^#/, "");
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : normalized;
  const safeHex = /^[0-9a-fA-F]{6}$/.test(hex) ? hex : "000000";
  return {
    r: Number.parseInt(safeHex.slice(0, 2), 16),
    g: Number.parseInt(safeHex.slice(2, 4), 16),
    b: Number.parseInt(safeHex.slice(4, 6), 16),
  };
}

function mixRgb(a: RgbColor, b: RgbColor, weight: number): RgbColor {
  const w = Math.max(0, Math.min(1, weight));
  const inv = 1 - w;
  return {
    r: Math.round(a.r * inv + b.r * w),
    g: Math.round(a.g * inv + b.g * w),
    b: Math.round(a.b * inv + b.b * w),
  };
}

function rgbToCss(rgb: RgbColor): string {
  return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
}

function relativeLuminance(rgb: RgbColor): number {
  const toLinear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function deriveNeutralPalette(bgHex: string) {
  const bg = parseHexColor(bgHex);
  const white: RgbColor = { r: 255, g: 255, b: 255 };
  const black: RgbColor = { r: 0, g: 0, b: 0 };
  const isDark = relativeLuminance(bg) < 0.22;

  if (isDark) {
    return {
      surface: rgbToCss(mixRgb(bg, white, 0.12)),
      surfaceMuted: rgbToCss(mixRgb(bg, white, 0.06)),
      border: rgbToCss(mixRgb(bg, white, 0.22)),
      textPrimary: rgbToCss(mixRgb(bg, white, 0.9)),
      textSecondary: rgbToCss(mixRgb(bg, white, 0.7)),
      textMuted: rgbToCss(mixRgb(bg, white, 0.52)),
    };
  }

  return {
    surface: rgbToCss(mixRgb(bg, white, 0.92)),
    surfaceMuted: rgbToCss(mixRgb(bg, white, 0.8)),
    border: rgbToCss(mixRgb(bg, black, 0.11)),
    textPrimary: rgbToCss(mixRgb(bg, black, 0.86)),
    textSecondary: rgbToCss(mixRgb(bg, black, 0.64)),
    textMuted: rgbToCss(mixRgb(bg, black, 0.45)),
  };
}

function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const WEEK_ORDER: WeekStart[] = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
];

const WEEK_SHORT_LABEL: Record<WeekStart, string> = {
  SUN: "Su",
  MON: "Mo",
  TUE: "Tu",
  WED: "We",
  THU: "Th",
  FRI: "Fr",
  SAT: "Sa",
};

const APP_TIMEZONE = "America/Los_Angeles";

function getWeekStartDate(d: Date, weekStartsOn: WeekStart): Date {
  const day = d.getDay();
  const startIdx = WEEK_ORDER.indexOf(weekStartsOn);
  const diff = (day - startIdx + 7) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
}

function todayStr(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    return toDateStr(new Date());
  }

  return `${year}-${month}-${day}`;
}

function parseTodoTimeValue(raw: unknown): number | null {
  const isValidHhmm = (value: number): boolean => {
    const hours = Math.floor(value / 100);
    const minutes = value % 100;
    return value >= 0 && value <= 2359 && hours <= 23 && minutes <= 59;
  };

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const rounded = Math.round(raw);
    if (isValidHhmm(rounded)) {
      return rounded;
    }
    return null;
  }

  if (typeof raw === "string" && /^\d{3,4}$/.test(raw)) {
    const rounded = Number(raw);
    if (isValidHhmm(rounded)) {
      return rounded;
    }
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    const compact = trimmed.replace(/\s+/g, "");
    const meridiemNormalized = compact
      .replace(/a\.?m?\.?$/, "am")
      .replace(/p\.?m?\.?$/, "pm");
    const match = meridiemNormalized.match(
      /^(\d{1,2})(?:(?::|\.)(\d{2}))?(am|pm)?$/
    );
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

    return hours * 100 + minutes;
  }

  return null;
}

export default defineComponent({
  name: "App",
  components: { TodoInput, TodoItem, SkyVisualizer },
  data() {
    const initialToday = todayStr();
    return {
      selectedDate: initialToday,
      weekStartsOn: "SUN" as WeekStart,
      moveDoneToBottom: true,
      weekStart: getWeekStartDate(new Date(initialToday + "T12:00:00"), "SUN"),
      isSettingsOpen: false,
      configFiles: [] as ConfigFilePayload[],
      activeConfigTab: "",
      markdownDraftByFile: {} as MarkdownDraftByFile,
      jsonDraftByFile: {} as JsonDraftByFile,
      isSavingConfig: false,
      todos: [] as Todo[],
      topics: [] as string[],
      weekCounts: {} as WeekTodoCounts,
      monthStats: {} as MonthTodoStatsMap,
      isLoading: false,
      isCalendarOpen: false,
      calendarMonth: monthKeyFromDate(new Date()),
      isCalendarLoading: false,
      stopTodoChangeSubscription: null as null | (() => void),
      addQueue: [] as AddQueueItem[],
      isProcessingAddQueue: false,
      addQueueCounter: 0,
      theme: { ...DEFAULT_THEME } as AppTheme,
      themePresets: THEME_PRESETS,
      nowTimestamp: Date.now(),
      timeTickerId: null as number | null,
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
      const tomorrow = new Date(todayStr() + "T12:00:00");
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (this.selectedDate === toDateStr(tomorrow)) return "Tomorrow";
      const yesterday = new Date(todayStr() + "T12:00:00");
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
        const weekday =
          WEEK_ORDER[(WEEK_ORDER.indexOf(this.weekStartsOn) + i) % 7]!;
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
      const today = new Date(todayStr() + "T12:00:00");
      const start = getWeekStartDate(today, this.weekStartsOn);
      return toDateStr(start) === toDateStr(this.weekStart);
    },
    todosWithMetadata(): DisplayTodo[] {
      return this.todos.map((todo, originalIndex) => {
        const numericTime = parseTodoTimeValue(todo.keys?.time);
        return {
          ...todo,
          originalIndex,
          numericTime,
          isTimed: numericTime !== null,
        };
      });
    },
    untimedTodoSections(): TopicSection[] {
      const untimed = this.todosWithMetadata.filter((todo) => !todo.isTimed);
      const sections = new Map<string, TopicSection>();
      const declaredTopics = this.topics.map((topic) =>
        this.normalizeTopicLabel(topic)
      );
      const canonicalTopics = new Map<string, string>();

      for (const topic of declaredTopics) {
        if (!topic) continue;
        canonicalTopics.set(topic.toLowerCase(), topic);
        sections.set(topic.toLowerCase(), {
          id: topic.toLowerCase(),
          label: topic,
          todos: [],
        });
      }

      const OTHER_ID = "__other__";
      const ensureOtherSection = (): TopicSection => {
        const existing = sections.get(OTHER_ID);
        if (existing) return existing;
        const created: TopicSection = {
          id: OTHER_ID,
          label: "Other",
          todos: [],
        };
        sections.set(OTHER_ID, created);
        return created;
      };

      for (const todo of untimed) {
        const topicKey = this.topicIdForTodo(todo);
        if (!topicKey) {
          ensureOtherSection().todos.push(todo);
          continue;
        }

        const canonical = canonicalTopics.get(topicKey);
        if (!canonical) {
          ensureOtherSection().todos.push(todo);
          continue;
        }

        const section = sections.get(topicKey);
        if (section) {
          section.todos.push(todo);
          continue;
        }

        sections.set(topicKey, {
          id: topicKey,
          label: canonical,
          todos: [todo],
        });
      }

      const sortedSections = Array.from(sections.values())
        .map((section) => ({
          ...section,
          todos: this.sortTodosForSection(section.todos),
        }))
        .filter((section) => section.todos.length > 0);

      return sortedSections;
    },
    timedTodos(): DisplayTodo[] {
      return this.todosWithMetadata
        .filter((todo) => todo.isTimed)
        .sort((a, b) => {
          const aTime = a.numericTime ?? Number.MAX_SAFE_INTEGER;
          const bTime = b.numericTime ?? Number.MAX_SAFE_INTEGER;
          if (aTime !== bTime) return aTime - bTime;
          if (this.moveDoneToBottom && a.done !== b.done)
            return a.done ? 1 : -1;
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
    activeConfigFile(): ConfigFilePayload | null {
      if (!this.activeConfigTab) return null;
      return (
        this.configFiles.find(
          (file) => file.fileName === this.activeConfigTab
        ) ?? null
      );
    },
  },
  created() {
    this.initialize();
  },
  mounted() {
    this.startTodoChangeSubscription();
    this.timeTickerId = window.setInterval(() => {
      this.nowTimestamp = Date.now();
    }, 30000);
  },
  beforeUnmount() {
    this.stopTodoChangeSubscription?.();
    this.stopTodoChangeSubscription = null;
    if (this.timeTickerId !== null) {
      window.clearInterval(this.timeTickerId);
      this.timeTickerId = null;
    }
  },
  methods: {
    normalizeTopicLabel(value: string): string {
      return value.trim().replace(/\s+/g, " ");
    },
    topicIdForTodo(todo: Todo): string | null {
      const raw = todo.keys?.topic;
      if (typeof raw !== "string") return null;
      const normalized = this.normalizeTopicLabel(raw);
      if (!normalized) return null;
      return normalized.toLowerCase();
    },
    sortTodosForSection(todos: DisplayTodo[]): DisplayTodo[] {
      if (!this.moveDoneToBottom) {
        return [...todos].sort((a, b) => a.originalIndex - b.originalIndex);
      }
      return [...todos].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return a.originalIndex - b.originalIndex;
      });
    },
    async initialize() {
      await this.loadConfigFiles();
      this.calendarMonth = this.selectedDate.slice(0, 7);
      await Promise.all([
        this.loadDay(),
        this.loadWeek(),
        this.loadCalendarMonthStats(),
      ]);
    },
    applyWeekStart(weekStartsOn: WeekStart) {
      this.weekStartsOn = weekStartsOn;
      const selected = new Date(this.selectedDate + "T12:00:00");
      this.weekStart = getWeekStartDate(selected, this.weekStartsOn);
    },
    parseWeekStart(value: unknown): WeekStart | null {
      return WEEK_ORDER.includes(value as WeekStart)
        ? (value as WeekStart)
        : null;
    },
    parseMoveDoneToBottom(value: unknown): boolean | null {
      return typeof value === "boolean" ? value : null;
    },
    parseThemeColor(value: unknown): string | null {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)
        ? trimmed
        : null;
    },
    parseThemeFont(value: unknown): string | null {
      if (typeof value !== "string") return null;
      return FONT_OPTIONS.some((font) => font.value === value) ? value : null;
    },
    getFontOption(value: string): FontOption {
      return (
        FONT_OPTIONS.find((font) => font.value === value) ?? FONT_OPTIONS[0]!
      );
    },
    ensureGoogleFontsLoaded(fonts: string[]) {
      const families = Array.from(new Set(fonts))
        .map((font) => this.getFontOption(font).googleFamily)
        .filter(Boolean);
      if (families.length === 0) return;

      const href = `https://fonts.googleapis.com/css2?family=${families.join(
        "&family="
      )}&display=swap`;
      const existing = document.getElementById(
        "todo-google-fonts"
      ) as HTMLLinkElement | null;

      if (existing) {
        if (existing.href !== href) {
          existing.href = href;
        }
        return;
      }

      const link = document.createElement("link");
      link.id = "todo-google-fonts";
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    },
    normalizeThemeFromValues(
      rawValues?: Record<string, TodoKeyValue>
    ): AppTheme {
      const nextTheme: AppTheme = { ...DEFAULT_THEME };
      const maybePrimary = this.parseThemeColor(rawValues?.primary);
      const maybeSecondary = this.parseThemeColor(rawValues?.secondary);
      const maybeBg = this.parseThemeColor(rawValues?.bg);
      const maybeCompleted = this.parseThemeColor(rawValues?.completed);
      const maybePending = this.parseThemeColor(rawValues?.pending);
      const maybeHeadingFont = this.parseThemeFont(rawValues?.headingFont);
      const maybeTextFont = this.parseThemeFont(rawValues?.textFont);

      if (maybePrimary) nextTheme.primary = maybePrimary;
      if (maybeSecondary) nextTheme.secondary = maybeSecondary;
      if (maybeBg) nextTheme.bg = maybeBg;
      if (maybeCompleted) nextTheme.completed = maybeCompleted;
      if (maybePending) nextTheme.pending = maybePending;
      if (maybeHeadingFont) nextTheme.headingFont = maybeHeadingFont;
      if (maybeTextFont) nextTheme.textFont = maybeTextFont;
      return nextTheme;
    },
    applyThemeVariables() {
      const root = document.documentElement;
      root.style.setProperty("--theme-primary", this.theme.primary);
      root.style.setProperty("--theme-secondary", this.theme.secondary);
      root.style.setProperty("--theme-bg", this.theme.bg);
      root.style.setProperty("--theme-completed", this.theme.completed);
      root.style.setProperty("--theme-pending", this.theme.pending);
      const neutrals = deriveNeutralPalette(this.theme.bg);
      root.style.setProperty("--surface", neutrals.surface);
      root.style.setProperty("--surface-muted", neutrals.surfaceMuted);
      root.style.setProperty("--border", neutrals.border);
      root.style.setProperty("--text-primary", neutrals.textPrimary);
      root.style.setProperty("--text-secondary", neutrals.textSecondary);
      root.style.setProperty("--text-muted", neutrals.textMuted);
      const headingFont = this.getFontOption(this.theme.headingFont);
      const textFont = this.getFontOption(this.theme.textFont);
      root.style.setProperty("--font-heading", headingFont.cssStack);
      root.style.setProperty("--font-text", textFont.cssStack);
      this.ensureGoogleFontsLoaded([headingFont.value, textFont.value]);
    },
    applyThemeFromConfigs() {
      const themeFile = this.configFiles.find(
        (file) => file.fileName === "theme.json"
      );
      this.theme = this.normalizeThemeFromValues(themeFile?.jsonValues);
      this.applyThemeVariables();
    },
    applyThemeFromDraft() {
      this.theme = this.normalizeThemeFromValues(
        this.jsonDraftByFile["theme.json"]
      );
      this.applyThemeVariables();
    },
    applyThemePreset(presetKey: string) {
      const preset = this.themePresets.find((entry) => entry.key === presetKey);
      if (!preset) return;
      this.jsonDraftByFile["theme.json"] = { ...preset.theme };
      this.applyThemeFromDraft();
    },
    isThemePresetSelected(presetKey: string): boolean {
      const preset = this.themePresets.find((entry) => entry.key === presetKey);
      if (!preset) return false;
      const draft = this.normalizeThemeFromValues(
        this.jsonDraftByFile["theme.json"]
      );
      return (
        draft.primary === preset.theme.primary &&
        draft.secondary === preset.theme.secondary &&
        draft.bg === preset.theme.bg &&
        draft.completed === preset.theme.completed &&
        draft.pending === preset.theme.pending &&
        draft.headingFont === preset.theme.headingFont &&
        draft.textFont === preset.theme.textFont
      );
    },
    applySettingsFromConfigs() {
      const settingsFile = this.configFiles.find(
        (file) => file.fileName === "settings.json"
      );
      const parsedWeekStart = this.parseWeekStart(
        settingsFile?.jsonValues?.weekStartsOn
      );
      if (parsedWeekStart) {
        this.applyWeekStart(parsedWeekStart);
      }
      const parsedMoveDoneToBottom = this.parseMoveDoneToBottom(
        settingsFile?.jsonValues?.moveDoneToBottom
      );
      if (parsedMoveDoneToBottom !== null) {
        this.moveDoneToBottom = parsedMoveDoneToBottom;
      }
    },
    seedConfigDraft(file: ConfigFilePayload) {
      if (file.kind === "markdown") {
        this.markdownDraftByFile[file.fileName] = file.markdown ?? "";
        return;
      }

      this.jsonDraftByFile[file.fileName] = { ...(file.jsonValues ?? {}) };
    },
    getMarkdownDraft(fileName: string): string {
      return this.markdownDraftByFile[fileName] ?? "";
    },
    setMarkdownDraft(fileName: string, value: string) {
      this.markdownDraftByFile[fileName] = value;
    },
    getJsonDraftValue(fileName: string, key: string): TodoKeyValue {
      const fileDraft = this.jsonDraftByFile[fileName] ?? {};
      const value = fileDraft[key];
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return value;
      }
      return "";
    },
    getJsonNumberValue(fileName: string, key: string): number {
      const value = this.getJsonDraftValue(fileName, key);
      return typeof value === "number" ? value : Number(value) || 0;
    },
    setJsonDraftValue(fileName: string, key: string, value: TodoKeyValue) {
      if (!this.jsonDraftByFile[fileName]) {
        this.jsonDraftByFile[fileName] = {};
      }
      this.jsonDraftByFile[fileName][key] = value;
      if (fileName === "theme.json") {
        this.applyThemeFromDraft();
      }
    },
    async loadConfigFiles() {
      try {
        const files = await api.getConfigFiles();
        this.configFiles = files;
        for (const file of files) {
          this.seedConfigDraft(file);
        }
        if (
          !this.activeConfigTab ||
          !files.some((file) => file.fileName === this.activeConfigTab)
        ) {
          this.activeConfigTab = files[0]?.fileName ?? "";
        }
        this.applySettingsFromConfigs();
        this.applyThemeFromConfigs();
      } catch (e) {
        console.error("Failed to load config files:", e);
      }
    },
    formatConfigTabLabel(fileName: string): string {
      return fileName
        .replace(/\.(md|json)$/i, "")
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join(" ");
    },
    selectConfigTab(fileName: string) {
      this.activeConfigTab = fileName;
      const target = this.configFiles.find(
        (file) => file.fileName === fileName
      );
      if (target) {
        this.seedConfigDraft(target);
      }
    },
    async saveActiveConfig() {
      const active = this.activeConfigFile;
      if (!active) return;

      this.isSavingConfig = true;
      try {
        const saved = await api.saveConfigFile(active.fileName, {
          markdown:
            active.kind === "markdown"
              ? this.markdownDraftByFile[active.fileName] ?? ""
              : undefined,
          jsonValues:
            active.kind === "json_schema"
              ? this.jsonDraftByFile[active.fileName] ?? {}
              : undefined,
        });

        const idx = this.configFiles.findIndex(
          (file) => file.fileName === saved.fileName
        );
        if (idx >= 0) {
          this.configFiles.splice(idx, 1, saved);
        } else {
          this.configFiles.push(saved);
        }
        this.seedConfigDraft(saved);

        if (saved.fileName === "settings.json") {
          const maybeWeekStart = this.parseWeekStart(
            saved.jsonValues?.weekStartsOn
          );
          const maybeMoveDoneToBottom = this.parseMoveDoneToBottom(
            saved.jsonValues?.moveDoneToBottom
          );

          if (maybeWeekStart) {
            this.applyWeekStart(maybeWeekStart);
            await this.loadWeek();
          }
          if (maybeMoveDoneToBottom !== null) {
            this.moveDoneToBottom = maybeMoveDoneToBottom;
          }
        }
        if (saved.fileName === "theme.json") {
          this.applyThemeFromConfigs();
        }
      } catch (e) {
        console.error("Failed to save config file:", e);
      }
      this.isSavingConfig = false;
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
    async openSettings() {
      this.isSettingsOpen = true;
      await this.loadConfigFiles();
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
      if (cell.isSelected) {
        return "text-white border-[var(--theme-primary)] bg-[var(--theme-primary)]";
      }
      if (cell.isToday) {
        return "border-[color-mix(in_srgb,var(--theme-primary)_40%,white)] bg-[color-mix(in_srgb,var(--theme-primary)_12%,white)] text-[color-mix(in_srgb,var(--theme-primary)_70%,black)] hover:bg-[color-mix(in_srgb,var(--theme-primary)_18%,white)]";
      }
      return "text-stone-700 hover:border-stone-200 hover:bg-stone-50";
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
        this.topics = Array.isArray(data.topics) ? data.topics : [];
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
    startTodoChangeSubscription() {
      this.stopTodoChangeSubscription?.();
      this.stopTodoChangeSubscription = api.subscribeToTodoChanges((event) => {
        this.handleTodoChangeEvent(event);
      });
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
      this.weekStart = getWeekStartDate(
        new Date(this.selectedDate + "T12:00:00"),
        this.weekStartsOn
      );
      this.loadDay();
      this.loadWeek();
    },
    async postQueuedTodo(item: AddQueueItem) {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const result = await api.addTodo(item.requestDate, item.text, timezone);
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
          this.monthStats[resolvedDate] = this.toDayStats(
            resolvedDate,
            result.todos
          );
        }
        return true;
      } catch (e) {
        console.error("Failed to add todo:", e);
        const message = e instanceof Error ? e.message : "Failed to post task.";
        const index = this.addQueue.findIndex(
          (queueItem) => queueItem.id === item.id
        );
        if (index !== -1) {
          this.addQueue[index] = {
            ...this.addQueue[index]!,
            status: "failed",
            error: message,
          };
        }
        return false;
      }
    },
    async processAddQueue() {
      if (this.isProcessingAddQueue) return;
      this.isProcessingAddQueue = true;
      try {
        // Process oldest queued posting task first.
        while (true) {
          const nextItem = this.addQueue.find(
            (item) => item.status === "posting"
          );
          if (!nextItem) break;
          const succeeded = await this.postQueuedTodo(nextItem);
          if (succeeded) {
            this.addQueue = this.addQueue.filter(
              (item) => item.id !== nextItem.id
            );
          }
        }
      } finally {
        this.isProcessingAddQueue = false;
      }
    },
    addTodo(text: string) {
      this.addQueueCounter += 1;
      const id = `${Date.now()}-${this.addQueueCounter}`;
      this.addQueue.push({
        id,
        text,
        requestDate: this.selectedDate,
        status: "posting",
        error: null,
      });
      this.processAddQueue();
    },
    retryAddQueueItem(id: string) {
      const index = this.addQueue.findIndex((item) => item.id === id);
      if (index === -1) return;
      this.addQueue[index] = {
        ...this.addQueue[index]!,
        status: "posting",
        error: null,
      };
      this.processAddQueue();
    },
    dismissAddQueueItem(id: string) {
      this.addQueue = this.addQueue.filter((item) => item.id !== id);
    },
    async handleTodoChangeEvent(event: TodoChangedEvent) {
      if (this.addQueue.some((item) => item.status === "posting")) {
        return;
      }
      const shouldReloadSelectedDay = event.date === this.selectedDate;
      const weekDates = this.weekDays.map((day) => day.date);
      const shouldReloadWeek = weekDates.includes(event.date);
      const shouldReloadCalendar = event.month === this.calendarMonth;

      if (
        !shouldReloadSelectedDay &&
        !shouldReloadWeek &&
        !shouldReloadCalendar
      ) {
        return;
      }

      const requests: Array<Promise<void>> = [];
      if (shouldReloadSelectedDay) requests.push(this.loadDay());
      if (shouldReloadWeek) requests.push(this.loadWeek());
      if (shouldReloadCalendar) requests.push(this.loadCalendarMonthStats());
      await Promise.all(requests);
    },
    async toggleTodo(index: number) {
      try {
        this.todos = await api.toggleTodo(this.selectedDate, index);
        if (this.selectedDate.startsWith(this.calendarMonth)) {
          this.monthStats[this.selectedDate] = this.toDayStats(
            this.selectedDate,
            this.todos
          );
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
          this.monthStats[this.selectedDate] = this.toDayStats(
            this.selectedDate,
            this.todos
          );
        }
      } catch (e) {
        console.error("Failed to delete todo:", e);
      }
    },
    async updateTodo(index: number, text: string) {
      try {
        this.todos = await api.updateTodoText(this.selectedDate, index, text);
        if (this.selectedDate.startsWith(this.calendarMonth)) {
          this.monthStats[this.selectedDate] = this.toDayStats(
            this.selectedDate,
            this.todos
          );
        }
      } catch (e) {
        console.error("Failed to update todo:", e);
      }
    },
    async moveTodoWithinSection(
      sectionId: string,
      index: number,
      direction: -1 | 1
    ) {
      const section = this.untimedTodoSections.find(
        (entry) => entry.id === sectionId
      );
      if (!section) {
        return;
      }

      const sectionIndices = section.todos.map((todo) => todo.originalIndex);
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= sectionIndices.length) {
        return;
      }

      const fromIndex = sectionIndices[index];
      const toIndex = sectionIndices[targetIndex];
      if (fromIndex === undefined || toIndex === undefined) return;

      try {
        this.todos = await api.reorderTodo(
          this.selectedDate,
          fromIndex,
          toIndex
        );
      } catch (e) {
        console.error("Failed to reorder todo:", e);
      }
    },
  },
});
</script>
