import { selectPortfolioSources } from "../../shared/portfolio";
import { isPortfolioFollowUp, isPortfolioQuestion, scopeReply } from "../../shared/scope";
import { providerEvents, type HistoryItem, type ProviderEnv } from "./provider";

interface Env extends ProviderEnv {
  ALLOWED_ORIGINS: string;
  CHAT_RATE_LIMITER: {limit(options: {key:string}): Promise<{success:boolean}>};
}
interface ChatRequest { message: string; mode: "visual" | "cli"; history: HistoryItem[] }

export function validateChatRequest(value: unknown): {data?:ChatRequest;error?:string} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {error:"Request body must be a JSON object."};
  const body=value as Record<string,unknown>;
  if(typeof body.message !== "string" || !body.message.trim()) return {error:"A non-empty message is required."};
  const message=body.message.trim();
  if(message.length>1000) return {error:"Message must be 1000 characters or fewer."};
  if(body.mode!=="visual" && body.mode!=="cli") return {error:"Mode must be visual or cli."};
  const history: HistoryItem[]=[];
  if(body.history!==undefined && !Array.isArray(body.history)) return {error:"History must be an array."};
  const items=(body.history??[]) as unknown[];
  if(items.length>8) return {error:"History may contain at most 8 messages."};
  let length=0;
  for(const item of items) {
    if(!item || typeof item!=="object" || Array.isArray(item)) return {error:"History items must be objects."};
    const entry=item as Record<string,unknown>;
    if((entry.role!=="user" && entry.role!=="assistant") || typeof entry.content!=="string") return {error:"History requires a valid role and content."};
    if(entry.content.length>1500) return {error:"History item exceeds 1500 characters."};
    length+=entry.content.length;
    history.push({role:entry.role,content:entry.content});
  }
  if(length>6000) return {error:"History exceeds 6000 characters."};
  return {data:{message,mode:body.mode,history}};
}

function cors(request:Request,env:Env): Headers {
  const headers = new Headers({"Vary":"Origin","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"});
  const origin=request.headers.get("Origin");
  if(origin && env.ALLOWED_ORIGINS.split(",").map(s=>s.trim()).includes(origin)) headers.set("Access-Control-Allow-Origin",origin);
  headers.set("Access-Control-Allow-Headers","Content-Type");
  headers.set("Access-Control-Allow-Methods","GET, POST, OPTIONS");
  headers.set("Access-Control-Max-Age","86400");
  return headers;
}
function json(request:Request,env:Env,value:unknown,status=200):Response {
  const headers=cors(request,env);headers.set("Content-Type","application/json; charset=utf-8");
  if(status===429) headers.set("Retry-After","60");
  return new Response(JSON.stringify(value),{status,headers});
}

// Count actual streamed bytes rather than trusting Content-Length or allocating an unbounded string.
async function readBody(request:Request):Promise<string> {
  if(!request.body) return "";
  const reader=request.body.getReader(), decoder=new TextDecoder();
  let size=0, text="";
  try {
    while(true) {
      const chunk=await reader.read();if(chunk.done) break;
      size+=chunk.value.byteLength;
      if(size>32_000) throw new RangeError("Request too large");
      text+=decoder.decode(chunk.value,{stream:true});
    }
    return text+decoder.decode();
  } finally {await reader.cancel().catch(()=>undefined);reader.releaseLock();}
}

export default {
  async fetch(request:Request,env:Env):Promise<Response> {
    const path=new URL(request.url).pathname;
    const headers=cors(request,env);
    if(request.headers.has("Origin") && !headers.has("Access-Control-Allow-Origin")) return json(request,env,{error:"Origin is not allowed."},403);
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers});
    if(path==="/health" && request.method==="GET") return json(request,env,{status:"ok",service:"chintan-portfolio-api",modelConfigured:Boolean(env.OPENROUTER_MODEL),providerKeyConfigured:Boolean(env.OPENROUTER_API_KEY)});
    if(path!=="/api/chat" || request.method!=="POST") return json(request,env,{error:"Not found"},404);
    if(request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase()!=="application/json") return json(request,env,{error:"Content-Type must be application/json."},415);
    if(Number(request.headers.get("Content-Length"))>32_000) return json(request,env,{error:"Request body is too large."},413);
    try {
      const result=await env.CHAT_RATE_LIMITER.limit({key:request.headers.get("CF-Connecting-IP")??"unknown"});
      if(!result.success) return json(request,env,{error:"Too many questions. Please wait a minute; local commands still work."},429);
    } catch {return json(request,env,{error:"Assistant temporarily unavailable."},503);}
    let value:unknown;
    try {value=JSON.parse(await readBody(request));} catch(error) {return json(request,env,{error:error instanceof RangeError?"Request body is too large.":"Request body must be valid JSON."},error instanceof RangeError?413:400);}
    const validated=validateChatRequest(value);
    if(!validated.data) return json(request,env,{error:validated.error},400);
    const chat=validated.data, requestId=crypto.randomUUID();
    const previousQuestions=chat.history.filter(m=>m.role==="user").map(m=>m.content);
    const inScope=isPortfolioQuestion(chat.message,previousQuestions);
    const followUp=isPortfolioFollowUp(chat.message);
    const contextQuery=followUp ? `${previousQuestions.at(-1)??""} ${chat.message}` : chat.message;
    const sources=selectPortfolioSources(contextQuery,5);
    const abort=new AbortController();
    const cancel=()=>abort.abort();
    request.signal.addEventListener("abort",cancel,{once:true});
    const encoder=new TextEncoder();
    const events=inScope ? providerEvents(env,chat.message,chat.history,sources,abort.signal) : (async function*(){
      yield {event:"meta",data:{model:"Portfolio scope router"}};
      yield {event:"delta",data:{text:scopeReply}};
      yield {event:"done",data:{fallback:false}};
    })();
    const body=new ReadableStream<Uint8Array>({
      async start(controller) {
        const send=(event:string,data:unknown)=>{if(!abort.signal.aborted) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));};
        try {
          send("meta",{requestId});
          send("tool",{status:"running",label:"Reading approved portfolio data"});
          for await(const item of events) {if(abort.signal.aborted) break;send(item.event,item.data);}
        } catch {send("error",{message:"Assistant temporarily unavailable."});}
        finally {request.signal.removeEventListener("abort",cancel);if(!abort.signal.aborted) controller.close();}
      },
      cancel() {cancel();request.signal.removeEventListener("abort",cancel);},
    });
    headers.set("Content-Type","text/event-stream; charset=utf-8");
    return new Response(body,{headers});
  },
};
