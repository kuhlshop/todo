import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { parseTodoWithClaude } from "./ai";
import {
  formatTodoText,
  parseTodoText,
  type TodoKeys,
} from "./todo-format";

const TODOS_DIR = join(import.meta.dir, "../../todos");

export interface Todo {
  text: string;
  done: boolean;
  title?: string;
  keys?: TodoKeys;
}

export interface DayTodos {
  date: string;
  todos: Todo[];
}

export interface AddTodoResult {
  date: string;
  todos: Todo[];
  createdTodo: Todo;
}

export interface DayTodoStats {
  date: string;
  total: number;
  done: number;
  upcoming: number;
}

// Get the folder name for a date: "2026-03"
function monthFolder(date: string): string {
  return date.slice(0, 7);
}

// Get the file name for a date: "TODO-2026-03-02.md"
function todoFileName(date: string): string {
  return `TODO-${date}.md`;
}

// Full path to a todo file
function todoFilePath(date: string): string {
  return join(TODOS_DIR, monthFolder(date), todoFileName(date));
}

function hydrateTodo(todo: Pick<Todo, "text" | "done">): Todo {
  const parsed = parseTodoText(todo.text);
  const keys = Object.keys(parsed.keys).length > 0 ? parsed.keys : undefined;

  return {
    done: todo.done,
    text: todo.text,
    title: parsed.title,
    keys,
  };
}

// Parse a markdown todo file into Todo objects
function parseTodoFile(content: string): Todo[] {
  const todos: Todo[] = [];
  for (const line of content.split("\n")) {
    const match = line.match(/^- \[([ x])\] (.+)$/);
    if (match) {
      const text = match[2];
      if (!text) continue;
      todos.push(
        hydrateTodo({
          done: match[1] === "x",
          text,
        }),
      );
    }
  }
  return todos;
}

// Serialize Todo objects into markdown
function serializeTodos(date: string, todos: Todo[]): string {
  const d = new Date(date + "T12:00:00");
  const formatted = d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  let md = `# TODO - ${formatted}\n\n`;
  for (const todo of todos) {
    md += `- [${todo.done ? "x" : " "}] ${todo.text}\n`;
  }
  return md;
}

// Ensure the month directory exists
async function ensureMonthDir(date: string): Promise<void> {
  const dir = join(TODOS_DIR, monthFolder(date));
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// Read todos for a specific date
export async function getTodos(date: string): Promise<DayTodos> {
  const path = todoFilePath(date);
  if (!existsSync(path)) {
    return { date, todos: [] };
  }
  const content = await readFile(path, "utf-8");
  return { date, todos: parseTodoFile(content) };
}

// Save todos for a specific date
export async function saveTodos(date: string, todos: Todo[]): Promise<void> {
  await ensureMonthDir(date);
  const path = todoFilePath(date);
  await writeFile(path, serializeTodos(date, todos), "utf-8");
}

// Add a new todo from natural language using Claude
export async function addTodo(
  contextDate: string,
  prompt: string,
  timezone?: string,
): Promise<AddTodoResult> {
  const parsed = await parseTodoWithClaude({
    prompt,
    contextDate,
    timezone,
  });

  const targetDate = parsed.date;
  const formattedText = formatTodoText(parsed.text, parsed.keys);

  if (!formattedText) {
    throw new Error("Parsed todo text was empty");
  }

  const { todos } = await getTodos(targetDate);
  const createdTodo = hydrateTodo({
    text: formattedText,
    done: false,
  });

  if (process.env.DEV === "true") {
    console.log("[todo-ai] Saving parsed todo", {
      targetDate,
      formattedText,
    });
  }

  todos.push(createdTodo);
  await saveTodos(targetDate, todos);

  return {
    date: targetDate,
    todos,
    createdTodo,
  };
}

// Toggle a todo's completion status
export async function toggleTodo(
  date: string,
  index: number,
): Promise<Todo[]> {
  const { todos } = await getTodos(date);
  if (index < 0 || index >= todos.length) {
    throw new Error(`Todo index ${index} out of range`);
  }
  todos[index]!.done = !todos[index]!.done;
  await saveTodos(date, todos);
  return todos;
}

// Delete a todo
export async function deleteTodo(
  date: string,
  index: number,
): Promise<Todo[]> {
  const { todos } = await getTodos(date);
  if (index < 0 || index >= todos.length) {
    throw new Error(`Todo index ${index} out of range`);
  }
  todos.splice(index, 1);
  await saveTodos(date, todos);
  return todos;
}

// Update a todo's text
export async function updateTodoText(
  date: string,
  index: number,
  text: string,
): Promise<Todo[]> {
  const { todos } = await getTodos(date);
  if (index < 0 || index >= todos.length) {
    throw new Error(`Todo index ${index} out of range`);
  }

  const current = todos[index];
  if (!current) {
    throw new Error(`Todo index ${index} out of range`);
  }

  todos[index] = hydrateTodo({
    ...current,
    text,
  });

  await saveTodos(date, todos);
  return todos;
}

// Get todos for a range of dates (for week view)
export async function getWeekTodos(startDate: string): Promise<DayTodos[]> {
  const start = new Date(startDate + "T12:00:00");
  const results: DayTodos[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0]!;
    results.push(await getTodos(dateStr));
  }
  return results;
}

export async function getMonthTodoStats(month: string): Promise<DayTodoStats[]> {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error(`Invalid month format: ${month}`);
  }

  const monthDir = join(TODOS_DIR, month);
  if (!existsSync(monthDir)) {
    return [];
  }

  const entries = await readdir(monthDir, { withFileTypes: true });
  const todoFiles = entries
    .filter((entry) => entry.isFile() && /^TODO-\d{4}-\d{2}-\d{2}\.md$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  const stats: DayTodoStats[] = [];

  for (const fileName of todoFiles) {
    const match = fileName.match(/^TODO-(\d{4}-\d{2}-\d{2})\.md$/);
    if (!match) continue;

    const date = match[1];
    if (!date) continue;
    const { todos } = await getTodos(date);
    const done = todos.filter((todo) => todo.done).length;
    const total = todos.length;

    stats.push({
      date,
      total,
      done,
      upcoming: total - done,
    });
  }

  return stats;
}

// Get all available months (for navigation)
export async function getMonths(): Promise<string[]> {
  if (!existsSync(TODOS_DIR)) {
    await mkdir(TODOS_DIR, { recursive: true });
    return [];
  }
  const entries = await readdir(TODOS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}$/.test(e.name))
    .map((e) => e.name)
    .sort();
}

// Read summary for a month
export async function getSummary(month: string): Promise<string> {
  const path = join(TODOS_DIR, month, "SUMMARY.md");
  if (!existsSync(path)) return "";
  return readFile(path, "utf-8");
}
