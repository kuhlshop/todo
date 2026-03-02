import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const TODOS_DIR = join(import.meta.dir, "../../todos");

export interface TodoKeys {
  time?: string;
  location?: string;
  [key: string]: string | undefined;
}

export interface Todo {
  text: string;
  done: boolean;
  keys?: TodoKeys;
}

export interface DayTodos {
  date: string;
  todos: Todo[];
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

// Parse [keys:{...}] from the end of a todo line
function parseKeys(raw: string): { text: string; keys?: TodoKeys } {
  const keysMatch = raw.match(/^(.+?)\s*\[keys:\{(.+?)\}\]\s*$/);
  if (!keysMatch) return { text: raw };
  const text = keysMatch[1]!.trim();
  const keyStr = keysMatch[2]!;
  const keys: TodoKeys = {};
  // Match key:value or key:"value with spaces"
  const pairRegex = /(\w+):\s*(?:"([^"]*?)"|(\S+?))\s*(?:,|$)/g;
  let m;
  while ((m = pairRegex.exec(keyStr)) !== null) {
    keys[m[1]!] = m[2] ?? m[3]!;
  }
  return { text, keys: Object.keys(keys).length > 0 ? keys : undefined };
}

// Serialize keys back to [keys:{...}] format
function serializeKeys(keys?: TodoKeys): string {
  if (!keys || Object.keys(keys).length === 0) return "";
  const pairs = Object.entries(keys)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (/\s/.test(v!)) return `${k}:"${v}"`;
      return `${k}:${v}`;
    })
    .join(",");
  return ` [keys:{${pairs}}]`;
}

// Parse a markdown todo file into Todo objects
function parseTodoFile(content: string): Todo[] {
  const todos: Todo[] = [];
  for (const line of content.split("\n")) {
    const match = line.match(/^- \[([ x])\] (.+)$/);
    if (match) {
      const { text, keys } = parseKeys(match[2]!);
      const todo: Todo = { done: match[1] === "x", text };
      if (keys) todo.keys = keys;
      todos.push(todo);
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
    md += `- [${todo.done ? "x" : " "}] ${todo.text}${serializeKeys(todo.keys)}\n`;
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

// Add a new todo to a specific date
export async function addTodo(date: string, text: string, keys?: TodoKeys): Promise<Todo[]> {
  const { todos } = await getTodos(date);
  const todo: Todo = { text, done: false };
  if (keys && Object.keys(keys).length > 0) todo.keys = keys;
  todos.push(todo);
  await saveTodos(date, todos);
  return todos;
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
  todos[index]!.text = text;
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
