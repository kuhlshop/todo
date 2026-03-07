import { spawn } from "child_process";
import { appendFile, mkdir, readFile } from "fs/promises";
import { dirname, join } from "path";
import { normalizeTodoKeys, type TodoKeys } from "./todo-format";
import { getTopics } from "./topics";

export interface ParseTodoArgs {
  prompt: string;
  contextDate: string;
  timezone?: string;
}

export interface ParsedTodoIntent {
  date: string;
  text: string;
  keys: TodoKeys;
}

interface ClaudeTextBlock {
  type?: string;
  text?: string;
}

interface ClaudeResponse {
  content?: ClaudeTextBlock[];
}

interface ClaudeRunConfig {
  binary: string;
  args: string[];
  promptMode: "arg" | "stdin";
  timeoutMs: number;
}

const MEMORY_FILE = join(import.meta.dir, "../../config/memory.md");
const MEMORY_PROMPT_LIMIT = Number(process.env.MEMORY_PROMPT_LIMIT || 4000);
const MEMORY_CANDIDATE_LIMIT = 5;

function isDevLoggingEnabled(): boolean {
  return process.env.DEV === "true";
}

function devLog(message: string, details?: Record<string, unknown>): void {
  if (!isDevLoggingEnabled()) return;
  if (details) {
    console.log(`[todo-ai] ${message}`, details);
    return;
  }
  console.log(`[todo-ai] ${message}`);
}

function parseArgList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.every((entry) => typeof entry === "string")
    ) {
      return parsed;
    }
  } catch {
    // If it's not JSON, treat it as whitespace-delimited.
  }

  return raw
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeMemoryLine(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function cleanMemoryCandidate(value: string): string {
  return value
    .trim()
    .replace(/^-+\s*/, "")
    .replace(/\s+/g, " ");
}

async function ensureMemoryFile(): Promise<void> {
  await mkdir(dirname(MEMORY_FILE), { recursive: true });
  try {
    await readFile(MEMORY_FILE, "utf-8");
  } catch {
    const initial = [
      "# Memory",
      "",
      "Store durable user facts as markdown list items for future prompts.",
      "Use `##` headings for todo topics. Example:",
      "## Work",
      "## Personal",
      "",
      "Example entry format: - Home address is 2570 Vista Way, Oceanside, CA 92054",
      "",
    ].join("\n");
    await appendFile(MEMORY_FILE, initial, "utf-8");
  }
}

function extractMemoryItems(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

async function readMemoryFile(): Promise<string> {
  await ensureMemoryFile();
  return readFile(MEMORY_FILE, "utf-8");
}

async function readMemoryContextForPrompt(): Promise<string> {
  const memoryMarkdown = await readMemoryFile();
  const items = extractMemoryItems(memoryMarkdown);

  if (items.length === 0) {
    return "(none)";
  }

  const serialized = items.map((item) => `- ${item}`).join("\n");
  if (serialized.length <= MEMORY_PROMPT_LIMIT) return serialized;
  return serialized.slice(-MEMORY_PROMPT_LIMIT);
}

async function readTopicsContextForPrompt(): Promise<string> {
  const topics = await getTopics();
  if (topics.length === 0) return "(none)";
  return topics.map((topic) => `- ${topic}`).join("\n");
}

async function runLocalClaude(prompt: string): Promise<string> {
  const configs = buildClaudeRunConfigs();
  const errors: string[] = [];

  for (let i = 0; i < configs.length; i += 1) {
    const config = configs[i]!;
    try {
      devLog("Running local Claude attempt", {
        attempt: i + 1,
        totalAttempts: configs.length,
        binary: config.binary,
        promptMode: config.promptMode,
        timeoutMs: config.timeoutMs,
        args:
          config.promptMode === "stdin"
            ? config.args
            : [...config.args, "<prompt>"],
      });

      return await runLocalClaudeOnce(prompt, config);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`attempt ${i + 1}: ${message}`);
      devLog("Local Claude attempt failed", {
        attempt: i + 1,
        message,
      });
    }
  }

  throw new Error(
    `All local Claude command attempts failed. ${errors.join(" | ")}`,
  );
}

function buildClaudeRunConfigs(): ClaudeRunConfig[] {
  const binary = process.env.CLAUDE_BIN?.trim() || "claude";
  const timeoutMs = Number(process.env.CLAUDE_TIMEOUT_MS || 45000);
  const envArgs = process.env.CLAUDE_ARGS;
  const envPromptMode = process.env.CLAUDE_PROMPT_MODE?.trim();
  const tryFallbackModes = process.env.CLAUDE_TRY_FALLBACK_MODES === "true";

  if (envArgs || envPromptMode) {
    const args = parseArgList(envArgs, ["--print"]);
    const promptMode = envPromptMode === "stdin" ? "stdin" : "arg";
    return [{ binary, args, promptMode, timeoutMs }];
  }

  if (!tryFallbackModes) {
    return [{ binary, args: [], promptMode: "stdin", timeoutMs }];
  }

  return [
    { binary, args: [], promptMode: "stdin", timeoutMs },
    { binary, args: ["--print"], promptMode: "arg", timeoutMs },
    { binary, args: ["-p"], promptMode: "arg", timeoutMs },
  ];
}

async function runLocalClaudeOnce(
  prompt: string,
  config: ClaudeRunConfig,
): Promise<string> {
  const { binary, args, promptMode, timeoutMs } = config;
  const finalArgs = promptMode === "stdin" ? args : [...args, prompt];
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    let finished = false;

    const finishWithError = (message: string): void => {
      if (finished) return;
      finished = true;
      reject(new Error(message));
    };

    const finishSuccess = (result: string): void => {
      if (finished) return;
      finished = true;
      resolve(result);
    };

    const child = spawn(binary, finalArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      if (finished) return;
      child.kill("SIGTERM");
      devLog("Local Claude timed out", {
        binary,
        elapsedMs: Date.now() - startedAt,
      });
      finishWithError(
        `Local Claude command timed out after ${timeoutMs}ms (${binary})`,
      );
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      if (finished) return;
      clearTimeout(timeout);
      devLog("Failed to start local Claude", {
        binary,
        error: error.message,
      });
      finishWithError(
        `Failed to start local Claude command (${binary}): ${error.message}`,
      );
    });

    child.on("close", (code) => {
      if (finished) return;
      clearTimeout(timeout);
      if (code !== 0) {
        devLog("Local Claude exited with error", {
          binary,
          code,
          elapsedMs: Date.now() - startedAt,
          stderr: stderr.trim(),
        });
        finishWithError(
          `Local Claude command failed (${binary}, exit ${code}): ${stderr.trim() || "no stderr output"}`,
        );
        return;
      }
      devLog("Local Claude completed", {
        binary,
        elapsedMs: Date.now() - startedAt,
        outputLength: stdout.trim().length,
      });
      finishSuccess(stdout.trim());
    });

    if (promptMode === "stdin") {
      child.stdin.write(prompt);
      child.stdin.end();
    }
  });
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function dateInTimezone(timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().split("T")[0] ?? "";
  }

  return `${year}-${month}-${day}`;
}

function weekdayForDate(date: string, timezone: string): string {
  const instant = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(instant);
}

function extractAssistantText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const content = (payload as ClaudeResponse).content;
  if (!Array.isArray(content)) return "";

  const pieces = content
    .filter((part) => part?.type === "text" && typeof part?.text === "string")
    .map((part) => part.text?.trim() ?? "")
    .filter(Boolean);

  return pieces.join("\n").trim();
}

function extractModelText(rawOutput: string): string {
  let modelText = rawOutput;
  try {
    const payload = JSON.parse(rawOutput) as unknown;
    const extracted = extractAssistantText(payload);
    if (extracted) {
      modelText = extracted;
    }
  } catch {
    // If stdout is plain text, use it directly.
  }
  return modelText;
}

function parseJsonFromModelText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Claude returned an empty response");

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to other extraction attempts.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]);
    } catch {
      // Continue to object slicing.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    return JSON.parse(candidate);
  }

  throw new Error("Claude response did not contain valid JSON");
}

async function extractMemoryCandidates(
  prompt: string,
  existingMemory: string,
): Promise<string[]> {
  const systemPrompt = [
    "You extract durable personal memory facts from a task request.",
    "Return JSON only with this schema:",
    '{"memories":["fact one","fact two"]}',
    "Rules:",
    "- Only include explicit, durable facts that may help future tasks.",
    "- Skip task-specific, temporary, or speculative details.",
    "- Keep each fact short and standalone.",
    "- If there is nothing useful, return an empty memories array.",
    "- Never return more than 5 items.",
  ].join("\n");

  const userPrompt = [
    "existing_memory:",
    existingMemory || "(none)",
    "",
    "task_request:",
    prompt,
  ].join("\n");

  const rawOutput = await runLocalClaude(`${systemPrompt}\n\n${userPrompt}`);
  const modelText = extractModelText(rawOutput);
  const parsed = parseJsonFromModelText(modelText);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [];
  }

  const raw = parsed as Record<string, unknown>;
  if (!Array.isArray(raw.memories)) {
    return [];
  }

  return raw.memories
    .filter((entry) => typeof entry === "string")
    .map((entry) => cleanMemoryCandidate(entry))
    .filter((entry) => entry.length > 0)
    .slice(0, MEMORY_CANDIDATE_LIMIT);
}

async function saveMemoryCandidates(candidates: string[]): Promise<string[]> {
  if (candidates.length === 0) return [];

  const existingMarkdown = await readMemoryFile();
  const existingItems = extractMemoryItems(existingMarkdown);
  const existingSet = new Set(existingItems.map((item) => normalizeMemoryLine(item)));

  const uniqueToAdd: string[] = [];
  for (const candidate of candidates) {
    const normalized = normalizeMemoryLine(candidate);
    if (existingSet.has(normalized)) continue;
    existingSet.add(normalized);
    uniqueToAdd.push(candidate);
  }

  if (uniqueToAdd.length === 0) return [];

  const suffix = `${uniqueToAdd.map((item) => `- ${item}`).join("\n")}\n`;
  await appendFile(MEMORY_FILE, suffix, "utf-8");
  return uniqueToAdd;
}

export async function captureUsefulMemoryFromPrompt(prompt: string): Promise<void> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) return;

  try {
    const existingMemory = await readMemoryFile();
    const candidates = await extractMemoryCandidates(trimmedPrompt, existingMemory);
    const added = await saveMemoryCandidates(candidates);
    if (added.length > 0) {
      devLog("Added memory entries", {
        count: added.length,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    devLog("Skipping memory update after extraction error", { message });
  }
}

export async function parseTodoWithClaude(
  args: ParseTodoArgs,
): Promise<ParsedTodoIntent> {
  const prompt = args.prompt.trim();
  if (!prompt) {
    throw new Error("Todo text cannot be empty");
  }

  if (!isValidDateString(args.contextDate)) {
    throw new Error(`Invalid context date: ${args.contextDate}`);
  }

  const timezone = args.timezone?.trim() || "America/Los_Angeles";
  const todayInTimezone = dateInTimezone(timezone);
  const memoryContext = await readMemoryContextForPrompt();
  const topicsContext = await readTopicsContextForPrompt();
  devLog("Parsing todo with Claude", {
    contextDate: args.contextDate,
    timezone,
    prompt,
  });

  const systemPrompt = [
    "You turn natural language todo requests into structured task data.",
    "Return JSON only with this schema:",
    '{"date":"YYYY-MM-DD","text":"task text","keys":{"key":"value"}}',
    "Rules:",
    "- Resolve relative dates using context_date and timezone-aware current_date.",
    "- If user says a weekday like 'Tuesday', pick the next matching day on or after context_date.",
    "- If user says 'next Wednesday', choose the Wednesday in the following week.",
    "- If a specific date is provided, use it exactly.",
    "- If no date is provided, use context_date.",
    "- Keep text concise and action-oriented.",
    "- Extract attributes into keys when possible (time, location, etc.).",
    "- If request clearly matches one of topics_context values, set keys.topic to that exact topic label.",
    "- Convert time to 24-hour HHmm integer in keys.time when possible.",
    "- Do not include [keys:{...}] in text.",
    "- Keep keys flat with primitive values only.",
    "- Use memory_context when it improves date or detail resolution.",
    "- Return valid JSON only.",
  ].join("\n");

  const userPrompt = [
    `request: ${prompt}`,
    `context_date: ${args.contextDate}`,
    `context_weekday: ${weekdayForDate(args.contextDate, timezone)}`,
    `current_date: ${todayInTimezone}`,
    `current_weekday: ${weekdayForDate(todayInTimezone, timezone)}`,
    `timezone: ${timezone}`,
    `memory_context:\n${memoryContext}`,
    `topics_context:\n${topicsContext}`,
  ].join("\n");

  const cliPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const rawOutput = await runLocalClaude(cliPrompt);
  const modelText = extractModelText(rawOutput);

  const parsed = parseJsonFromModelText(modelText);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Claude response JSON was not an object");
  }

  const raw = parsed as Record<string, unknown>;

  const resolvedDate =
    typeof raw.date === "string" && isValidDateString(raw.date)
      ? raw.date
      : args.contextDate;

  const resolvedTextRaw = typeof raw.text === "string" ? raw.text : prompt;
  const resolvedText = resolvedTextRaw.replace(/\s+/g, " ").trim();

  if (!resolvedText) {
    throw new Error("Claude returned empty todo text");
  }

  const keys = normalizeTodoKeys(raw.keys);
  devLog("Claude parse result", {
    resolvedDate,
    resolvedText,
    keys,
  });

  return {
    date: resolvedDate,
    text: resolvedText,
    keys,
  };
}
