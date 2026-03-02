const BASE = "/api";

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

export interface SmartAddResult {
  date: string;
  todos: Todo[];
  parsed: { text: string; date: string; keys: TodoKeys };
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

  addTodo: (date: string, text: string) =>
    request<Todo[]>(`/todos/${date}`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  smartAdd: (prompt: string, today: string) =>
    request<SmartAddResult>("/todos/smart", {
      method: "POST",
      body: JSON.stringify({ prompt, today }),
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
};
