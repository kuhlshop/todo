import Anthropic from "@anthropic-ai/sdk";
import type { TodoKeys } from "./todos";

const client = new Anthropic();

export interface ParsedTodo {
  text: string;
  date: string;
  keys: TodoKeys;
}

export async function parseTodoPrompt(
  prompt: string,
  today: string,
): Promise<ParsedTodo> {
  const todayDate = new Date(today + "T12:00:00");
  const dayOfWeek = todayDate.toLocaleDateString("en-US", { weekday: "long" });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are a todo parser. Today is ${dayOfWeek}, ${today}.

Parse this natural language input into a structured todo. Extract:
- text: a clean, concise todo description (not the raw input - rewrite it clearly)
- date: the YYYY-MM-DD date this todo belongs on. Use context:
  - "today" = ${today}
  - "tomorrow" = the next day
  - "Tuesday" = the NEXT upcoming Tuesday (if today IS Tuesday, it means NEXT Tuesday)
  - "next Wednesday" = the Wednesday of next week
  - A specific date like "March 5" = 2026-03-05
  - If no date mentioned, default to ${today}
- keys: extract metadata:
  - time: if a time is mentioned, format as 24hr HHMM (e.g. "5:30 PM" -> "1730", "9am" -> "0900")
  - location: if a place/address is mentioned, extract it as-is

Respond with ONLY valid JSON, no markdown fences:
{"text": "...", "date": "YYYY-MM-DD", "keys": {"time": "HHMM", "location": "..."}}

Only include keys that are present. If no time or location, use empty object for keys: {}

Input: ${prompt}`,
      },
    ],
  });

  const content = response.content[0];
  if (content?.type !== "text") {
    throw new Error("Unexpected AI response format");
  }

  const parsed = JSON.parse(content.text) as ParsedTodo;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    parsed.date = today;
  }

  return parsed;
}
