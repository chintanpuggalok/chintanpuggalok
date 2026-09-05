import { describe, expect, it } from "vitest";
import { readSSE } from "../../shared/stream";

async function parse(text: string) {
  const events=[];
  for await (const event of readSSE(new Response(text).body!)) events.push(event);
  return events;
}

describe("bounded SSE parser",()=>{
  it("parses LF, CRLF, CR and multiline data",async()=>{
    expect(await parse("event: one\r\ndata: a\r\ndata: b\r\n\r\nevent: two\rdata: c\r\r")).toEqual([
      {event:"one",data:"a\nb"},{event:"two",data:"c"},
    ]);
  });
  it("rejects one oversized data line",async()=>{
    await expect(parse(`data: ${"x".repeat(64_001)}\n\n`)).rejects.toThrow("Stream frame too large");
  });
  it("rejects an oversized event split across short data lines",async()=>{
    const frame=Array(100).fill(`data: ${"x".repeat(1000)}\n`).join("")+"\n";
    await expect(parse(frame)).rejects.toThrow("Stream frame too large");
  });
});
