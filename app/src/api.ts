const BASE = "/api";

export type TodoKeyValue = string | number | boolean;
export type TodoKeys = Record<string, TodoKeyValue>;

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

export type WeekStart = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

export interface AppSettings {
  weekStartsOn: WeekStart;
}

export interface DayTodoStats {
  date: string;
  total: number;
  done: number;
  upcoming: number;
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  getTodos: (date: string) =>
    request<DayTodos>(`/todos/${date}`),

  getWeek: (startDate: string) =>
    request<DayTodos[]>(`/todos/week/${startDate}`),

  getMonthStats: (month: string) =>
    request<DayTodoStats[]>(`/todos/month/${month}`),

  addTodo: (date: string, text: string, timezone?: string) =>
    request<AddTodoResult>(`/todos/${date}`, {
      method: "POST",
      body: JSON.stringify({ text, timezone }),
    }),

  toggleTodo: (date: string, index: number) =>
    request<Todo[]>(`/todos/${date}/${index}`, {
      method: "PATCH",
    }),

  updateTodoText: (date: string, index: number, text: string) =>
    request<Todo[]>(`/todos/${date}/${index}`, {
      method: "PUT",
      body: JSON.stringify({ text }),
    }),

  deleteTodo: (date: string, index: number) =>
    request<Todo[]>(`/todos/${date}/${index}`, {
      method: "DELETE",
    }),

  getMonths: () => request<string[]>("/months"),

  getSummary: (month: string) => request<string>(`/summary/${month}`),

  getSettings: () => request<AppSettings>("/settings"),

  updateSettings: (settings: Partial<AppSettings>) =>
    request<AppSettings>("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
};
