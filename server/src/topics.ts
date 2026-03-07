import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join } from "path";

const MEMORY_FILE = join(import.meta.dir, "../../config/memory.md");

const DEFAULT_MEMORY_FILE = [
  "# Memory",
  "",
  "Store durable user facts as markdown list items for future prompts.",
  "Use `##` headings for todo topics. Example:",
  "## Work",
  "## Personal",
  "",
  "Example memory entry format: - Home address is 2570 Vista Way, Oceanside, CA 92054",
  "",
].join("\n");

async function ensureMemoryFile(): Promise<void> {
  await mkdir(dirname(MEMORY_FILE), { recursive: true });
  if (!existsSync(MEMORY_FILE)) {
    await writeFile(MEMORY_FILE, DEFAULT_MEMORY_FILE, "utf-8");
  }
}

function normalizeTopic(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function extractTopics(markdown: string): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(/^##\s+(.+)$/);
    if (!match) continue;

    const topic = normalizeTopic(match[1] ?? "");
    if (!topic) continue;

    const key = topic.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push(topic);
  }

  return topics;
}

export async function getTopics(): Promise<string[]> {
  await ensureMemoryFile();
  const markdown = await readFile(MEMORY_FILE, "utf-8");
  return extractTopics(markdown);
}

