# Todo App - Codebase Conventions

## Project Overview
A simple file-based todo app with a Vue 3 frontend and Elysia.js backend. Todos are stored as markdown files in the `todos/` directory, organized by month. Designed to run on a raw Linux VM with Bun.

## Architecture

```
/
├── app/          # Vue 3 frontend (Vite + Tailwind)
├── server/       # Elysia.js API server (serves built app in prod)
├── todos/        # Git-tracked todo markdown files
│   └── 2026-03/
│       ├── TODO-2026-03-01.md
│       ├── TODO-2026-03-02.md
│       └── SUMMARY.md
├── scripts/      # Cron/automation scripts
├── setup.sh      # Build & run (no Docker)
└── CLAUDE.md     # This file
```

## Tech Stack
| Layer     | Technology          |
|-----------|---------------------|
| Runtime   | Bun                 |
| Frontend  | Vue 3 (Options API) |
| Styling   | Tailwind CSS        |
| Backend   | Elysia.js           |
| Build     | Vite                |
| Storage   | Markdown files      |

## File Storage Format

### Todo files: `todos/YYYY-MM/TODO-YYYY-MM-DD.md`
```markdown
# TODO - Monday, March 2, 2026

- [ ] Incomplete task
- [x] Completed task
- [ ] Another task
```

### Summary files: `todos/YYYY-MM/SUMMARY.md`
Generated daily at midnight PST by the rollover script. Contains monthly overview, stats, and key items.

## Commands
```bash
./setup.sh dev    # Dev mode with hot reload
./setup.sh build  # Build frontend only
./setup.sh start  # Production: build + serve
./setup.sh cron   # Install daily rollover cron job
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/todos/:date` | Get todos for a date |
| GET | `/api/todos/week/:date` | Get week of todos |
| POST | `/api/todos/:date` | Add a todo (`{ text }`) |
| PATCH | `/api/todos/:date/:index` | Toggle todo completion |
| PUT | `/api/todos/:date/:index` | Update todo text (`{ text }`) |
| DELETE | `/api/todos/:date/:index` | Delete a todo |
| GET | `/api/months` | List available months |
| GET | `/api/summary/:month` | Get month summary |

## Vue Conventions
- Options API with `defineComponent` (not `<script setup>`)
- Component option order: name, components, props, emits, data, computed, created, mounted, methods, watch
- Props: object syntax with type + required/default
- Tailwind for all styling, no scoped CSS needed

## Daily Rollover (midnight PST)
The `scripts/daily-rollover.sh` cron job:
1. Commits current `todos/` state
2. Uses Claude Code to create new day's file with incomplete todos carried over
3. Uses Claude Code to update `SUMMARY.md` with monthly overview
4. Commits the new files
