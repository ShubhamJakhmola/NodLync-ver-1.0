import type { SseMessage } from "./sse";

export type UniversalStreamEvent =
  | { type: "meta"; raw: unknown }
  | { type: "delta"; textDelta: string; raw: unknown }
  | { type: "done"; raw: unknown }
  | { type: "error"; message: string; raw: unknown };

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

export function normalizeOpenAiCompatSse(msg: SseMessage): UniversalStreamEvent | null {
  const data = msg.data?.trim?.() ?? "";
  if (!data) return null;
  if (data === "[DONE]") return { type: "done", raw: msg };

  const parsed = safeJsonParse(data) as any;
  if (parsed?.error) {
    const message =
      parsed?.error?.message ||
      parsed?.error?.error ||
      (typeof parsed?.error === "string" ? parsed.error : "Provider error");
    return { type: "error", message, raw: parsed };
  }

  const delta = parsed?.choices?.[0]?.delta?.content;
  if (typeof delta === "string" && delta.length) {
    return { type: "delta", textDelta: delta, raw: parsed };
  }

  // Some providers stream `choices[0].delta.reasoning` / `thinking`.
  const reasoning = parsed?.choices?.[0]?.delta?.reasoning ?? parsed?.choices?.[0]?.delta?.thinking;
  if (typeof reasoning === "string" && reasoning.length) {
    return { type: "delta", textDelta: reasoning, raw: parsed };
  }

  // Emit meta for anything else so we never silently discard.
  return { type: "meta", raw: parsed };
}

