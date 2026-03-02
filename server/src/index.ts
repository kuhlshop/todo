import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { join } from "path";
import { existsSync } from "fs";
import {
  getTodos,
  addTodo,
  toggleTodo,
  deleteTodo,
  updateTodoText,
  getWeekTodos,
  getMonths,
  getSummary,
} from "./todos";
import { parseTodoPrompt } from "./ai";

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = join(import.meta.dir, "../public");

const app = new Elysia()
  .use(cors())
  // API routes
  .group("/api", (app) =>
    app
      // Get todos for a date
      .get(
        "/todos/:date",
        ({ params }) => getTodos(params.date),
        {
          params: t.Object({ date: t.String() }),
        },
      )
      // Get week of todos starting from a date
      .get(
        "/todos/week/:date",
        ({ params }) => getWeekTodos(params.date),
        {
          params: t.Object({ date: t.String() }),
        },
      )
      // Smart add: AI-powered natural language todo creation
      .post(
        "/todos/smart",
        async ({ body, set }) => {
          try {
            const parsed = await parseTodoPrompt(body.prompt, body.today);
            const todos = await addTodo(parsed.date, parsed.text, parsed.keys);
            return { date: parsed.date, todos, parsed };
          } catch (e) {
            set.status = 500;
            return { error: e instanceof Error ? e.message : "AI parsing failed" };
          }
        },
        {
          body: t.Object({ prompt: t.String(), today: t.String() }),
        },
      )
      // Add a todo
      .post(
        "/todos/:date",
        ({ params, body }) => addTodo(params.date, body.text),
        {
          params: t.Object({ date: t.String() }),
          body: t.Object({ text: t.String() }),
        },
      )
      // Toggle a todo
      .patch(
        "/todos/:date/:index",
        ({ params }) => toggleTodo(params.date, parseInt(params.index)),
        {
          params: t.Object({ date: t.String(), index: t.String() }),
        },
      )
      // Update todo text
      .put(
        "/todos/:date/:index",
        ({ params, body }) =>
          updateTodoText(params.date, parseInt(params.index), body.text),
        {
          params: t.Object({ date: t.String(), index: t.String() }),
          body: t.Object({ text: t.String() }),
        },
      )
      // Delete a todo
      .delete(
        "/todos/:date/:index",
        ({ params }) => deleteTodo(params.date, parseInt(params.index)),
        {
          params: t.Object({ date: t.String(), index: t.String() }),
        },
      )
      // Get available months
      .get("/months", () => getMonths())
      // Get summary for a month
      .get(
        "/summary/:month",
        ({ params }) => getSummary(params.month),
        {
          params: t.Object({ month: t.String() }),
        },
      ),
  )
  // Serve static files and SPA fallback
  .get("*", ({ path }) => {
    // Try to serve the exact file from public/
    const filePath = join(PUBLIC_DIR, path);
    if (path !== "/" && existsSync(filePath)) {
      return Bun.file(filePath);
    }
    // SPA fallback: serve index.html
    return Bun.file(join(PUBLIC_DIR, "index.html"));
  })
  .listen(PORT);

console.log(`Todo app running at http://localhost:${PORT}`);
