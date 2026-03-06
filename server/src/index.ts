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
  getMonthTodoStats,
  getMonths,
  getSummary,
} from "./todos";
import { getSettings, saveSettings, WEEK_START_VALUES } from "./settings";

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
      // Get month todo stats
      .get(
        "/todos/month/:month",
        ({ params }) => getMonthTodoStats(params.month),
        {
          params: t.Object({ month: t.String() }),
        },
      )
      // Add a todo
      .post(
        "/todos/:date",
        ({ params, body }) => addTodo(params.date, body.text, body.timezone),
        {
          params: t.Object({ date: t.String() }),
          body: t.Object({
            text: t.String(),
            timezone: t.Optional(t.String()),
          }),
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
      )
      // Get app settings
      .get("/settings", () => getSettings())
      // Update app settings
      .put(
        "/settings",
        ({ body }) => saveSettings(body),
        {
          body: t.Object({
            weekStartsOn: t.Optional(
              t.Union(WEEK_START_VALUES.map((value) => t.Literal(value))),
            ),
          }),
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
