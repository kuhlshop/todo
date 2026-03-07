import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { ConfigJsonSchema } from "./settings";

export interface AppTheme {
  primary: string;
  secondary: string;
  bg: string;
  completed: string;
  pending: string;
  headingFont: string;
  textFont: string;
}

const FONT_VALUES = [
  "Inter",
  "Poppins",
  "Roboto",
  "Montserrat",
  "Lora",
  "Merriweather",
  "JetBrains Mono",
  "Fira Code",
] as const;

const FONT_OPTIONS = FONT_VALUES.map((value) => ({ label: value, value }));

const DEFAULT_THEME: AppTheme = {
  primary: "#2563eb",
  secondary: "#7c3aed",
  bg: "#f7f7f5",
  completed: "#16a34a",
  pending: "#ea580c",
  headingFont: "Poppins",
  textFont: "Inter",
};

export const THEME_JSON_SCHEMA: ConfigJsonSchema = {
  title: "Theme",
  description:
    "Controls the app color palette. Use valid 3-digit or 6-digit HEX colors.",
  fields: [
    {
      key: "primary",
      label: "Primary color",
      type: "color",
      placeholder: "#2563eb",
      default: DEFAULT_THEME.primary,
    },
    {
      key: "secondary",
      label: "Secondary color",
      type: "color",
      placeholder: "#7c3aed",
      default: DEFAULT_THEME.secondary,
    },
    {
      key: "bg",
      label: "Background color",
      type: "color",
      placeholder: "#f7f7f5",
      default: DEFAULT_THEME.bg,
    },
    {
      key: "completed",
      label: "Completed color",
      type: "color",
      placeholder: "#16a34a",
      default: DEFAULT_THEME.completed,
    },
    {
      key: "pending",
      label: "Pending color",
      type: "color",
      placeholder: "#ea580c",
      default: DEFAULT_THEME.pending,
    },
    {
      key: "headingFont",
      label: "Headings font",
      type: "select",
      options: FONT_OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
      })),
      default: DEFAULT_THEME.headingFont,
    },
    {
      key: "textFont",
      label: "Text font",
      type: "select",
      options: FONT_OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
      })),
      default: DEFAULT_THEME.textFont,
    },
  ],
};

const CONFIG_DIR = join(import.meta.dir, "../../config");
const THEME_PATH = join(CONFIG_DIR, "theme.json");

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function isFontValue(value: unknown): value is (typeof FONT_VALUES)[number] {
  return typeof value === "string" && FONT_VALUES.includes(value as (typeof FONT_VALUES)[number]);
}

function sanitizeTheme(value: unknown): AppTheme {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    primary: isHexColor(source.primary) ? source.primary.trim() : DEFAULT_THEME.primary,
    secondary: isHexColor(source.secondary)
      ? source.secondary.trim()
      : DEFAULT_THEME.secondary,
    bg: isHexColor(source.bg) ? source.bg.trim() : DEFAULT_THEME.bg,
    completed: isHexColor(source.completed)
      ? source.completed.trim()
      : DEFAULT_THEME.completed,
    pending: isHexColor(source.pending) ? source.pending.trim() : DEFAULT_THEME.pending,
    headingFont: isFontValue(source.headingFont)
      ? source.headingFont
      : DEFAULT_THEME.headingFont,
    textFont: isFontValue(source.textFont) ? source.textFont : DEFAULT_THEME.textFont,
  };
}

async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
}

async function writeThemeFile(theme: AppTheme): Promise<void> {
  await writeFile(THEME_PATH, JSON.stringify(theme, null, 2) + "\n", "utf-8");
}

export async function getTheme(): Promise<AppTheme> {
  await ensureConfigDir();

  if (!existsSync(THEME_PATH)) {
    await writeThemeFile(DEFAULT_THEME);
    return DEFAULT_THEME;
  }

  try {
    const raw = await readFile(THEME_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const sanitized = sanitizeTheme(parsed);

    if (
      (parsed as Partial<AppTheme>).primary !== sanitized.primary ||
      (parsed as Partial<AppTheme>).secondary !== sanitized.secondary ||
      (parsed as Partial<AppTheme>).bg !== sanitized.bg ||
      (parsed as Partial<AppTheme>).completed !== sanitized.completed ||
      (parsed as Partial<AppTheme>).pending !== sanitized.pending ||
      (parsed as Partial<AppTheme>).headingFont !== sanitized.headingFont ||
      (parsed as Partial<AppTheme>).textFont !== sanitized.textFont
    ) {
      await writeThemeFile(sanitized);
    }

    return sanitized;
  } catch {
    await writeThemeFile(DEFAULT_THEME);
    return DEFAULT_THEME;
  }
}

export async function saveTheme(partial: Partial<AppTheme>): Promise<AppTheme> {
  const current = await getTheme();
  const merged = sanitizeTheme({ ...current, ...partial });
  await writeThemeFile(merged);
  return merged;
}
