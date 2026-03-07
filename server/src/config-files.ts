import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import {
  getSettings,
  saveSettings,
  SETTINGS_JSON_SCHEMA,
  type ConfigJsonSchema,
  type ConfigSchemaField,
} from "./settings";
import { getTheme, saveTheme, THEME_JSON_SCHEMA } from "./theme";

type ConfigExtension = "md" | "json";
type ConfigKind = "markdown" | "json_schema";
type JsonPrimitive = string | number | boolean;
type JsonRecord = Record<string, JsonPrimitive>;

export interface ConfigFilePayload {
  fileName: string;
  baseName: string;
  extension: ConfigExtension;
  kind: ConfigKind;
  markdown?: string;
  jsonSchema?: ConfigJsonSchema;
  jsonValues?: JsonRecord;
}

const CONFIG_DIR = join(import.meta.dir, "../../config");
const MEMORY_PATH = join(CONFIG_DIR, "memory.md");
const DEFAULT_MEMORY_FILE = [
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

function isSafeFileName(fileName: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(fileName) && !fileName.includes("..");
}

function fileExtension(fileName: string): ConfigExtension | null {
  if (fileName.endsWith(".md")) return "md";
  if (fileName.endsWith(".json")) return "json";
  return null;
}

function baseName(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx > 0 ? fileName.slice(0, idx) : fileName;
}

function sortFileNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function inferFieldType(value: unknown): ConfigSchemaField["type"] {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "text";
}

function titleFromBaseName(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferSchemaFromJson(
  fileName: string,
  parsed: Record<string, unknown>,
): ConfigJsonSchema {
  const fields: ConfigSchemaField[] = Object.entries(parsed)
    .filter(([, value]) =>
      ["string", "number", "boolean"].includes(typeof value),
    )
    .map(([key, value]) => ({
      key,
      label: titleFromBaseName(key),
      type: inferFieldType(value),
      default:
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
          ? value
          : undefined,
    }));

  return {
    title: titleFromBaseName(baseName(fileName)) || fileName,
    description:
      fields.length > 0
        ? "Inferred schema for this JSON file."
        : "No primitive fields were found to render.",
    fields,
  };
}

function coerceFieldValue(field: ConfigSchemaField, raw: unknown): JsonPrimitive {
  if (field.type === "color") {
    const source =
      typeof raw === "string"
        ? raw.trim()
        : typeof field.default === "string"
          ? field.default.trim()
          : "#000000";
    return /^#(?:[0-9a-fA-F]{6})$/.test(source) ? source : "#000000";
  }

  if (field.type === "boolean") {
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "string") {
      if (raw.toLowerCase() === "true") return true;
      if (raw.toLowerCase() === "false") return false;
    }
    return typeof field.default === "boolean" ? field.default : false;
  }

  if (field.type === "number") {
    let next =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : typeof field.default === "number"
            ? field.default
            : 0;
    if (!Number.isFinite(next)) {
      next = typeof field.default === "number" ? field.default : 0;
    }
    if (typeof field.min === "number") next = Math.max(next, field.min);
    if (typeof field.max === "number") next = Math.min(next, field.max);
    return next;
  }

  if (field.type === "select") {
    const options = field.options ?? [];
    const allowed = new Set(options.map((option) => option.value));
    const first = options[0]?.value ?? "";
    const fallback =
      typeof field.default === "string" && allowed.has(field.default)
        ? field.default
        : first;
    const candidate = typeof raw === "string" ? raw : fallback;
    return allowed.has(candidate) ? candidate : fallback;
  }

  const asString =
    typeof raw === "string"
      ? raw
      : raw === null || raw === undefined
        ? ""
        : String(raw);
  if (asString) return asString;
  return typeof field.default === "string" ? field.default : "";
}

function sanitizeBySchema(schema: ConfigJsonSchema, raw: unknown): JsonRecord {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const next: JsonRecord = {};
  for (const field of schema.fields) {
    next[field.key] = coerceFieldValue(field, source[field.key]);
  }
  return next;
}

async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
}

async function ensureMemoryFile(): Promise<void> {
  if (!existsSync(MEMORY_PATH)) {
    await writeFile(MEMORY_PATH, DEFAULT_MEMORY_FILE, "utf-8");
  }
}

async function ensureDefaults(): Promise<void> {
  await ensureConfigDir();
  await ensureMemoryFile();
  await getSettings();
  await getTheme();
}

function getKnownJsonSchema(fileName: string): ConfigJsonSchema | null {
  if (fileName === "settings.json") {
    return SETTINGS_JSON_SCHEMA;
  }
  if (fileName === "theme.json") {
    return THEME_JSON_SCHEMA;
  }
  return null;
}

async function readJsonWithSchema(fileName: string): Promise<ConfigFilePayload> {
  const filePath = join(CONFIG_DIR, fileName);

  if (fileName === "settings.json") {
    const jsonValues = (await getSettings()) as JsonRecord;
    return {
      fileName,
      baseName: baseName(fileName),
      extension: "json",
      kind: "json_schema",
      jsonSchema: SETTINGS_JSON_SCHEMA,
      jsonValues,
    };
  }
  if (fileName === "theme.json") {
    const jsonValues = (await getTheme()) as JsonRecord;
    return {
      fileName,
      baseName: baseName(fileName),
      extension: "json",
      kind: "json_schema",
      jsonSchema: THEME_JSON_SCHEMA,
      jsonValues,
    };
  }

  let parsed: Record<string, unknown> = {};
  if (existsSync(filePath)) {
    try {
      parsed = JSON.parse(await readFile(filePath, "utf-8")) as Record<
        string,
        unknown
      >;
    } catch {
      parsed = {};
    }
  }

  const knownSchema = getKnownJsonSchema(fileName);
  const schema = knownSchema ?? inferSchemaFromJson(fileName, parsed);
  const jsonValues = sanitizeBySchema(schema, parsed);

  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(jsonValues, null, 2) + "\n", "utf-8");
  }

  return {
    fileName,
    baseName: baseName(fileName),
    extension: "json",
    kind: "json_schema",
    jsonSchema: schema,
    jsonValues,
  };
}

async function readMarkdown(fileName: string): Promise<ConfigFilePayload> {
  const filePath = join(CONFIG_DIR, fileName);
  let markdown = "";
  if (existsSync(filePath)) {
    markdown = await readFile(filePath, "utf-8");
  } else {
    await writeFile(filePath, "", "utf-8");
  }

  return {
    fileName,
    baseName: baseName(fileName),
    extension: "md",
    kind: "markdown",
    markdown,
  };
}

export async function listConfigFiles(): Promise<ConfigFilePayload[]> {
  await ensureDefaults();

  const entries = await readdir(CONFIG_DIR, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => fileExtension(name) !== null)
    .sort(sortFileNames);

  const results: ConfigFilePayload[] = [];
  for (const fileName of fileNames) {
    const ext = fileExtension(fileName);
    if (!ext) continue;
    if (ext === "md") {
      results.push(await readMarkdown(fileName));
      continue;
    }
    results.push(await readJsonWithSchema(fileName));
  }
  return results;
}

export async function saveConfigFile(
  fileName: string,
  payload: {
    markdown?: string;
    jsonValues?: Record<string, unknown>;
  },
): Promise<ConfigFilePayload> {
  if (!isSafeFileName(fileName)) {
    throw new Error(`Invalid file name: ${fileName}`);
  }

  await ensureDefaults();

  const ext = fileExtension(fileName);
  if (!ext) {
    throw new Error(`Unsupported config file type: ${fileName}`);
  }

  const filePath = join(CONFIG_DIR, fileName);
  if (ext === "md") {
    const markdown = typeof payload.markdown === "string" ? payload.markdown : "";
    await writeFile(filePath, markdown, "utf-8");
    return readMarkdown(fileName);
  }

  if (fileName === "settings.json") {
    const saved = await saveSettings((payload.jsonValues ?? {}) as Record<
      string,
      unknown
    >);
    return {
      fileName,
      baseName: baseName(fileName),
      extension: "json",
      kind: "json_schema",
      jsonSchema: SETTINGS_JSON_SCHEMA,
      jsonValues: saved as JsonRecord,
    };
  }
  if (fileName === "theme.json") {
    const saved = await saveTheme((payload.jsonValues ?? {}) as Record<string, unknown>);
    return {
      fileName,
      baseName: baseName(fileName),
      extension: "json",
      kind: "json_schema",
      jsonSchema: THEME_JSON_SCHEMA,
      jsonValues: saved as JsonRecord,
    };
  }

  const existingRaw = existsSync(filePath) ? await readFile(filePath, "utf-8") : "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(existingRaw) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const schema = inferSchemaFromJson(fileName, parsed);
  const sanitized = sanitizeBySchema(schema, payload.jsonValues ?? parsed);
  await writeFile(filePath, JSON.stringify(sanitized, null, 2) + "\n", "utf-8");

  return {
    fileName,
    baseName: baseName(fileName),
    extension: "json",
    kind: "json_schema",
    jsonSchema: schema,
    jsonValues: sanitized,
  };
}
