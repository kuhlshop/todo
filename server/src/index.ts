import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
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

const PORT = process.env.PORT || 3000;

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
  // Serve static frontend in production
  .use(
    staticPlugin({
      assets: "public",
      prefix: "/",
    }),
  )
  // SPA fallback: serve index.html for non-API routes
  .get("*", ({ set }) => {
    set.headers["content-type"] = "text/html";
    return Bun.file("public/index.html");
  })
  .listen(PORT);

console.log(`Todo app running at http://localhost:${PORT}`);
