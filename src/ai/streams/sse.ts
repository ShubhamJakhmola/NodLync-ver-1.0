export interface SseMessage {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

/**
 * Minimal SSE parser for `text/event-stream`.
 * Consumes Uint8Array chunks and yields parsed SSE messages.
 */
export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
  opts?: { signal?: AbortSignal },
): AsyncGenerator<SseMessage> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (opts?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      while (true) {
        const idx = buffer.indexOf("\n\n");
        if (idx === -1) break;
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        const msg: SseMessage = { data: "" };
        const dataLines: string[] = [];
        for (const rawLine of frame.split("\n")) {
          const line = rawLine.replace(/\r$/, "");
          if (!line || line.startsWith(":")) continue;
          const sep = line.indexOf(":");
          const field = (sep === -1 ? line : line.slice(0, sep)).trim();
          const valuePart = sep === -1 ? "" : line.slice(sep + 1).replace(/^ /, "");

          if (field === "event") msg.event = valuePart;
          else if (field === "data") dataLines.push(valuePart);
          else if (field === "id") msg.id = valuePart;
          else if (field === "retry") {
            const n = Number(valuePart);
            if (!Number.isNaN(n)) msg.retry = n;
          }
        }

        msg.data = dataLines.join("\n");
        yield msg;
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

