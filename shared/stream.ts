// Bounded incremental SSE framing, including CR, LF and split CRLF delimiters.
export interface SSEEvent { event: string; data: string }
export async function* readSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let line = "", event = "message", data: string[] = [], bytes = 0, skipLF = false;
  function finishLine(): SSEEvent | undefined {
    const current = line;
    line = "";
    if (!current) {
      const result = data.length ? { event, data: data.join("\n") } : undefined;
      event = "message"; data = []; bytes = 0;
      return result;
    }
    if (current.startsWith("event:")) event = current.slice(6).replace(/^ /, "");
    else if (current.startsWith("data:")) data.push(current.slice(5).replace(/^ /, ""));
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      const text = done ? decoder.decode() : decoder.decode(value, { stream: true });
      for (const character of text) {
        if (skipLF && character === "\n") { skipLF = false; continue; }
        skipLF = false;
        const point = character.codePointAt(0)!;
        bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
        if (bytes > 64_000) throw new Error("Stream frame too large.");
        if (character === "\r" || character === "\n") {
          skipLF = character === "\r";
          const result = finishLine();
          if (result) yield result;
        } else line += character;
      }
      if (done) {
        if (line) finishLine();
        if (data.length) yield { event, data: data.join("\n") };
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
