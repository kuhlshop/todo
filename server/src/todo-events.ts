import { watch, type FSWatcher } from "fs";
import { mkdir, readdir } from "fs/promises";
import { join } from "path";

const TODOS_DIR = join(import.meta.dir, "../../todos");
const MONTH_DIR_RE = /^\d{4}-\d{2}$/;
const TODO_FILE_RE = /^TODO-(\d{4}-\d{2}-\d{2})\.md$/;

export interface TodoChangedEvent {
  type: "todo-changed";
  date: string;
  month: string;
}

type TodoChangeListener = (event: TodoChangedEvent) => void;

const listeners = new Set<TodoChangeListener>();
const monthWatchers = new Map<string, FSWatcher>();
const pendingDateEmits = new Map<string, ReturnType<typeof setTimeout>>();

let rootWatcher: FSWatcher | null = null;
let isWatcherStarted = false;

function publishTodoChange(event: TodoChangedEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("[todo-watcher] listener failed", error);
    }
  }
}

function queueTodoChange(date: string): void {
  const existing = pendingDateEmits.get(date);
  if (existing) clearTimeout(existing);

  const timeout = setTimeout(() => {
    pendingDateEmits.delete(date);
    publishTodoChange({
      type: "todo-changed",
      date,
      month: date.slice(0, 7),
    });
  }, 80);

  pendingDateEmits.set(date, timeout);
}

function watchMonthDirectory(month: string): void {
  if (monthWatchers.has(month)) return;

  const monthDir = join(TODOS_DIR, month);
  const watcher = watch(monthDir, (_eventType, fileName) => {
    if (typeof fileName !== "string") return;
    const match = fileName.match(TODO_FILE_RE);
    if (!match?.[1]) return;
    queueTodoChange(match[1]);
  });

  watcher.on("error", (error) => {
    console.error(`[todo-watcher] month watcher error (${month})`, error);
  });

  monthWatchers.set(month, watcher);
}

async function syncMonthWatchers(): Promise<void> {
  const entries = await readdir(TODOS_DIR, { withFileTypes: true });
  const nextMonths = new Set(
    entries
      .filter((entry) => entry.isDirectory() && MONTH_DIR_RE.test(entry.name))
      .map((entry) => entry.name),
  );

  for (const month of nextMonths) {
    watchMonthDirectory(month);
  }

  for (const [month, watcher] of monthWatchers.entries()) {
    if (nextMonths.has(month)) continue;
    watcher.close();
    monthWatchers.delete(month);
  }
}

export function subscribeTodoChanges(
  listener: TodoChangeListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function startTodoWatcher(): Promise<void> {
  if (isWatcherStarted) return;
  isWatcherStarted = true;

  await mkdir(TODOS_DIR, { recursive: true });
  await syncMonthWatchers();

  rootWatcher = watch(TODOS_DIR, async () => {
    try {
      await syncMonthWatchers();
    } catch (error) {
      console.error("[todo-watcher] failed to sync month watchers", error);
    }
  });

  rootWatcher.on("error", (error) => {
    console.error("[todo-watcher] root watcher error", error);
  });
}
