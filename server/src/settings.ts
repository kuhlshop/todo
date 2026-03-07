import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export const WEEK_START_VALUES = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const;

export type WeekStart = (typeof WEEK_START_VALUES)[number];

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
  default?: string | number | boolean;
}

export interface ConfigJsonSchema {
  title: string;
  description?: string;
  fields: ConfigSchemaField[];
}

const DEFAULT_SETTINGS: AppSettings = {
  weekStartsOn: "SUN",
  moveDoneToBottom: true,
};

export const SETTINGS_JSON_SCHEMA: ConfigJsonSchema = {
  title: "App Settings",
  description: "Controls app behavior and week layout defaults.",
  fields: [
    {
      key: "weekStartsOn",
      label: "Start of week",
      type: "select",
      description: "This controls the week layout in the main todo view.",
      options: WEEK_START_VALUES.map((value) => ({
        value,
        label:
          value === "SUN"
            ? "Sunday"
            : value === "MON"
              ? "Monday"
              : value === "TUE"
                ? "Tuesday"
                : value === "WED"
                  ? "Wednesday"
                  : value === "THU"
                    ? "Thursday"
                    : value === "FRI"
                      ? "Friday"
                      : "Saturday",
      })),
      default: "SUN",
    },
    {
      key: "moveDoneToBottom",
      label: "Move completed todos to bottom",
      type: "boolean",
      description:
        "When enabled, completed todos are grouped after pending ones in the daily list.",
      default: true,
    },
  ],
};

const CONFIG_DIR = join(import.meta.dir, "../../config");
const SETTINGS_PATH = join(CONFIG_DIR, "settings.json");

function isValidWeekStart(value: unknown): value is WeekStart {
  return (
    typeof value === "string" &&
    WEEK_START_VALUES.includes(value as WeekStart)
  );
}

function sanitizeSettings(value: unknown): AppSettings {
  const weekStartsOn =
    typeof value === "object" &&
    value !== null &&
    "weekStartsOn" in value &&
    isValidWeekStart((value as { weekStartsOn?: unknown }).weekStartsOn)
      ? (value as { weekStartsOn: WeekStart }).weekStartsOn
      : DEFAULT_SETTINGS.weekStartsOn;

  const moveDoneToBottom =
    typeof value === "object" &&
    value !== null &&
    "moveDoneToBottom" in value &&
    typeof (value as { moveDoneToBottom?: unknown }).moveDoneToBottom ===
      "boolean"
      ? (value as { moveDoneToBottom: boolean }).moveDoneToBottom
      : DEFAULT_SETTINGS.moveDoneToBottom;

  return { weekStartsOn, moveDoneToBottom };
}

async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
}

async function writeSettingsFile(settings: AppSettings): Promise<void> {
  await writeFile(
    SETTINGS_PATH,
    JSON.stringify(settings, null, 2) + "\n",
    "utf-8",
  );
}

export async function getSettings(): Promise<AppSettings> {
  await ensureConfigDir();

  if (!existsSync(SETTINGS_PATH)) {
    await writeSettingsFile(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const settings = sanitizeSettings(parsed);

    // Self-heal invalid settings files back to known-safe schema.
    if (
      settings.weekStartsOn !==
        (parsed as { weekStartsOn?: unknown }).weekStartsOn ||
      settings.moveDoneToBottom !==
        (parsed as { moveDoneToBottom?: unknown }).moveDoneToBottom
    ) {
      await writeSettingsFile(settings);
    }

    return settings;
  } catch {
    await writeSettingsFile(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(
  partial: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getSettings();
  const merged = sanitizeSettings({ ...current, ...partial });

  await writeSettingsFile(merged);

  return merged;
}
