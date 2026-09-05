import { validateSources, type PortfolioSource } from "@shared/portfolio";
import { readSSE } from "@shared/stream";

export type InterfaceMode = "visual" | "cli";
export interface ChatHistoryItem { role: "user" | "assistant"; content: string }
export interface StreamHandlers {
  onMeta?: (payload: { requestId?: string; model?: string }) => void;
  onTool?: (payload: { status: string; label: string }) => void;
  onDelta: (text: string) => void;
  onSources?: (sources: PortfolioSource[]) => void;
  onDone?: (payload: { fallback?: boolean }) => void;
}
export class ChatError extends Error {
  constructor(message: string, public retryAfter = 0) { super(message); }
}
export function boundedHistory(history: ChatHistoryItem[]): ChatHistoryItem[] {
  let remaining = 6000;
  return history.slice(-8).reverse().flatMap((item) => {
    const content = item.content.trim().slice(0, Math.min(1500, remaining));
    remaining -= content.length;
    return content ? [{ role: item.role, content }] : [];
  }).reverse();
}

export async function streamPortfolioAnswer(options: {
  apiUrl: string; message: string; mode: InterfaceMode; history: ChatHistoryItem[];
  signal: AbortSignal; handlers: StreamHandlers;
}): Promise<void> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal.addEventListener("abort", cancel, { once: true });
  if (options.signal.aborted) cancel();
  const timeout = setTimeout(cancel, 60_000);
  let body: ReadableStream<Uint8Array> | null = null;
  try {
    const response = await fetch(`${options.apiUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: options.message, mode: options.mode, history: boundedHistory(options.history) }),
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 429) {
        const seconds = Math.min(120, Math.max(1, Number(response.headers.get("Retry-After")) || 60));
        throw new ChatError(`Too many questions. Wait ${seconds} seconds; local commands still work.`, seconds);
      }
      throw new ChatError(`The assistant is unavailable (${response.status}). Try again or use a local command.`);
    }
    body = response.body;
    if (!body || !response.headers.get("Content-Type")?.includes("text/event-stream")) throw new ChatError("The assistant returned an invalid response.");
    let completed = false;
    for await (const event of readSSE(body)) {
      if (options.signal.aborted) throw new DOMException("Cancelled", "AbortError");
      let data: Record<string, unknown>;
      try { data = JSON.parse(event.data); } catch { throw new ChatError("The response was interrupted. Please retry."); }
      if (!data || typeof data !== "object") throw new ChatError("Invalid response event.");
      switch (event.event) {
        case "meta": options.handlers.onMeta?.({ requestId: typeof data.requestId === "string" ? data.requestId : undefined, model: typeof data.model === "string" ? data.model : undefined }); break;
        case "tool": if (typeof data.label === "string" && typeof data.status === "string") options.handlers.onTool?.({ label: data.label, status: data.status }); break;
        case "delta": if (typeof data.text === "string") options.handlers.onDelta(data.text); break;
        case "sources": options.handlers.onSources?.(validateSources(data.sources)); break;
        case "done": completed = true; options.handlers.onDone?.({ fallback: data.fallback === true }); break;
        case "error": throw new ChatError("The response was interrupted. Partial text is preserved; please retry.");
      }
      if (completed) break;
    }
    if (!completed) throw new ChatError("The connection ended before the answer completed. Please retry.");
  } finally {
    clearTimeout(timeout);
    options.signal.removeEventListener("abort", cancel);
    controller.abort();
    if (body && !body.locked) await body.cancel().catch(() => undefined);
  }
}
