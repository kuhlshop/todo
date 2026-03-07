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
  topics?: string[];
}

export interface AddTodoResult {
  date: string;
  todos: Todo[];
  createdTodo: Todo;
}

export type WeekStart = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

export interface AppSettings {
  weekStartsOn: WeekStart;
  moveDoneToBottom: boolean;
}

export type ConfigSchemaFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "color";

export interface ConfigSchemaOption {
  label: string;
  value: string;
}

export interface ConfigSchemaField {
  key: string;
  label: string;
  type: ConfigSchemaFieldType;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: ConfigSchemaOption[];
  default?: TodoKeyValue;
}

export interface ConfigJsonSchema {
  title: string;
  description?: string;
  fields: ConfigSchemaField[];
}

export interface ConfigFilePayload {
  fileName: string;
  baseName: string;
  extension: "md" | "json";
  kind: "markdown" | "json_schema";
  markdown?: string;
  jsonSchema?: ConfigJsonSchema;
  jsonValues?: Record<string, TodoKeyValue>;
}

export interface DayTodoStats {
  date: string;
  total: number;
  done: number;
  upcoming: number;
}

export interface TodoChangedEvent {
  type: "todo-changed";
  date: string;
  month: string;
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

  reorderTodo: (date: string, fromIndex: number, toIndex: number) =>
    request<Todo[]>(`/todos/${date}/reorder`, {
      method: "PUT",
      body: JSON.stringify({ fromIndex, toIndex }),
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

  getConfigFiles: () => request<ConfigFilePayload[]>("/config/files"),

  saveConfigFile: (
    fileName: string,
    payload: { markdown?: string; jsonValues?: Record<string, TodoKeyValue> },
  ) =>
    request<ConfigFilePayload>(`/config/files/${encodeURIComponent(fileName)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  subscribeToTodoChanges: (onChange: (event: TodoChangedEvent) => void) => {
    const source = new EventSource(`${BASE}/todos/events`);

    const onTodoChanged = (message: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(message.data) as TodoChangedEvent;
        onChange(parsed);
      } catch (error) {
        console.error("Failed to parse todo change event:", error);
      }
    };

    source.addEventListener("todo-changed", onTodoChanged as EventListener);

    source.onerror = () => {
      // EventSource reconnects automatically; keep this non-fatal.
    };

    return () => {
      source.removeEventListener(
        "todo-changed",
        onTodoChanged as EventListener,
      );
      source.close();
    };
  },
};
