export type TodoKeyValue = string | number | boolean;
export type TodoKeys = Record<string, TodoKeyValue>;

export interface ParsedTodoText {
  title: string;
  keys: TodoKeys;
}

const KEY_BLOCK_REGEX = /\s\[keys:\{([\s\S]*)\}\]\s*$/;
const KEY_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_-]*$/;

function skipWhitespace(input: string, index: number): number {
  while (index < input.length && /\s/.test(input[index]!)) {
    index += 1;
  }
  return index;
}

function parseQuotedString(
  input: string,
  startIndex: number,
): { value: string; nextIndex: number } | null {
  const quote = input[startIndex];
  if (quote !== '"' && quote !== "'") return null;

  let i = startIndex + 1;
  let value = "";

  while (i < input.length) {
    const char = input[i]!;

    if (char === "\\") {
      const nextChar = input[i + 1];
      if (nextChar === undefined) return null;
      value += nextChar;
      i += 2;
      continue;
    }

    if (char === quote) {
      return { value, nextIndex: i + 1 };
    }

    value += char;
    i += 1;
  }

  return null;
}

export function parseKeyValueLiteral(literal: string): TodoKeys | null {
  let index = 0;
  const keys: TodoKeys = {};

  while (true) {
    index = skipWhitespace(literal, index);
    if (index >= literal.length) break;

    const keyMatch = literal
      .slice(index)
      .match(/^([A-Za-z_][A-Za-z0-9_-]*)/);
    if (!keyMatch) return null;

    const key = keyMatch[1];
    if (!key) return null;

    index += key.length;
    index = skipWhitespace(literal, index);

    if (literal[index] !== ":") return null;
    index += 1;
    index = skipWhitespace(literal, index);

    let value: TodoKeyValue;
    const firstChar = literal[index];

    if (firstChar === '"' || firstChar === "'") {
      const parsed = parseQuotedString(literal, index);
      if (!parsed) return null;
      value = parsed.value;
      index = parsed.nextIndex;
    } else {
      const valueStart = index;
      while (index < literal.length && literal[index] !== ",") {
        index += 1;
      }
      const token = literal.slice(valueStart, index).trim();
      if (!token) return null;

      if (token === "true" || token === "false") {
        value = token === "true";
      } else if (/^-?\d+(?:\.\d+)?$/.test(token)) {
        const numeric = Number(token);
        value = Number.isFinite(numeric) ? numeric : token;
      } else {
        value = token;
      }
    }

    keys[key] = value;

    index = skipWhitespace(literal, index);
    if (index >= literal.length) break;

    if (literal[index] !== ",") return null;
    index += 1;
  }

  return keys;
}

export function parseTodoText(rawText: string): ParsedTodoText {
  const trimmed = rawText.trim();
  const keyBlockMatch = trimmed.match(KEY_BLOCK_REGEX);

  if (!keyBlockMatch || keyBlockMatch.index === undefined) {
    return { title: trimmed, keys: {} };
  }

  const keyLiteral = keyBlockMatch[1] ?? "";
  const parsedKeys = parseKeyValueLiteral(keyLiteral);
  if (!parsedKeys) {
    return { title: trimmed, keys: {} };
  }

  const title = trimmed.slice(0, keyBlockMatch.index).trimEnd();
  return {
    title: title || trimmed,
    keys: parsedKeys,
  };
}

function normalizeTimeStringToHHmm(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();

  if (/^\d{3,4}$/.test(trimmed)) {
    const padded = trimmed.padStart(4, "0");
    const hours = Number(padded.slice(0, 2));
    const minutes = Number(padded.slice(2, 4));
    if (hours <= 23 && minutes <= 59) {
      return hours * 100 + minutes;
    }
    return null;
  }

  const match = trimmed.match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  const hourToken = match[1];
  const minuteToken = match[2];
  const meridiem = match[3];

  if (!hourToken) return null;

  let hours = Number(hourToken);
  const minutes = minuteToken ? Number(minuteToken) : 0;

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) {
    return null;
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "pm" && hours !== 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
  }

  if (!meridiem && hours > 23) return null;

  return hours * 100 + minutes;
}

export function normalizeTodoKeys(input: unknown): TodoKeys {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const normalized: TodoKeys = {};

  for (const [key, rawValue] of Object.entries(input as Record<string, unknown>)) {
    if (!KEY_NAME_REGEX.test(key)) continue;

    if (key === "time") {
      if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        const rounded = Math.round(rawValue);
        const hours = Math.floor(rounded / 100);
        const minutes = rounded % 100;
        if (rounded >= 0 && rounded <= 2359 && minutes <= 59 && hours <= 23) {
          normalized[key] = rounded;
          continue;
        }
      }

      if (typeof rawValue === "string") {
        const converted = normalizeTimeStringToHHmm(rawValue);
        if (converted !== null) {
          normalized[key] = converted;
          continue;
        }

        const trimmed = rawValue.trim();
        if (trimmed) {
          normalized[key] = trimmed;
        }
      }
      continue;
    }

    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      if (trimmed) {
        normalized[key] = trimmed;
      }
      continue;
    }

    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      normalized[key] = rawValue;
      continue;
    }

    if (typeof rawValue === "boolean") {
      normalized[key] = rawValue;
    }
  }

  return normalized;
}

function escapeString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function serializeKeyValue(value: TodoKeyValue): string {
  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return Number.isInteger(value) ? String(value) : String(value);
    }
    return '""';
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return `"${escapeString(value)}"`;
}

export function formatTodoText(title: string, keys: TodoKeys): string {
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  if (!cleanTitle) return "";

  const entries = Object.entries(keys).filter(([key, value]) => {
    if (!KEY_NAME_REGEX.test(key)) return false;
    const valueType = typeof value;
    return valueType === "string" || valueType === "number" || valueType === "boolean";
  });

  if (entries.length === 0) return cleanTitle;

  const serialized = entries
    .map(([key, value]) => `${key}:${serializeKeyValue(value)}`)
    .join(",");

  return `${cleanTitle} [keys:{${serialized}}]`;
}
