import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MarkdownContent, SourceLinks } from "./ChatContent";
import { readPreference, writePreference } from "@/lib/preferences";
import { identity, suggestedPrompts, type PortfolioSource } from "@shared/portfolio";
import { createLocalFallback, commandSuggestions, executeLocalCommand } from "@/lib/commands";
import { streamPortfolioAnswer, ChatError, type ChatHistoryItem, type InterfaceMode } from "@/lib/chat";
import {
  ArrowIcon,
  ChevronIcon,
  CommandIcon,
  ExternalIcon,
  MoonIcon,
  SendIcon,
  SparkIcon,
  StopIcon,
  SunIcon,
  TerminalIcon,
} from "./Icons";

interface TranscriptMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  title?: string;
  sources?: PortfolioSource[];
  pending?: boolean;
  error?: boolean;
  status?: string;
  retryQuestion?: string;
  retryAt?: number;
}

interface PortfolioAppProps {
  apiUrl?: string;
  initialMode?: InterfaceMode;
}

const welcomeMessage: TranscriptMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi—I'm Chintan's portfolio assistant. He's a backend engineer and SDE II at Amazon, previously at Intuit. Ask about his distributed systems, engineering impact, or AI projects. Answers use the public résumé; please verify important details using the source links.",
};

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeApiUrl(override?: string): string {
  if (override) return override;
  if (typeof __PORTFOLIO_API_URL__ !== "undefined") return __PORTFOLIO_API_URL__;
  return "https://chintan-portfolio-api.chintanpuggalok.workers.dev";
}

function ModeSelector({ onChoose }: { onChoose: (mode: InterfaceMode) => void }) {
  return (
    <main className="mode-gateway" data-testid="mode-selector">
      <div className="gateway-ambient gateway-ambient-one" />
      <div className="gateway-ambient gateway-ambient-two" />
      <div className="gateway-shell">
        <header className="gateway-header">
          <a className="brand-lockup" href="/" aria-label="CP Chintan Puggalok home">
            <span className="brand-mark">CP</span>
            <span>
              <strong>Chintan Puggalok</strong>
              <small>Backend systems engineer</small>
            </span>
          </a>
          <a className="text-link" href="/profile">
            Full profile <ArrowIcon size={15} />
          </a>
        </header>

        <section className="gateway-intro" aria-labelledby="gateway-title">
          <p className="eyebrow"><span className="status-dot" /> Portfolio interface online</p>
          <h1 id="gateway-title">Choose your interface.</h1>
          <p>
            Explore the same engineering story through a visual conversation or a keyboard-first agent console.
          </p>
        </section>

        <section className="mode-grid" aria-label="Portfolio interface options">
          <button className="mode-card mode-card-visual" type="button" onClick={() => onChoose("visual")}>
            <span className="mode-card-topline">
              <span className="mode-icon"><SparkIcon size={22} /></span>
              <span className="mode-number">01</span>
            </span>
            <span className="mode-card-copy">
              <strong>Visual interface</strong>
              <span>Guided prompts, clear cards, citations, and conversational answers.</span>
            </span>
            <span className="mode-card-preview visual-preview" aria-hidden="true">
              <i className="preview-avatar">CP</i>
              <i className="preview-lines"><b /><b /><b /></i>
            </span>
            <span className="mode-action">Launch visual UI <ArrowIcon size={17} /></span>
          </button>

          <button className="mode-card mode-card-cli" type="button" onClick={() => onChoose("cli")}>
            <span className="mode-card-topline">
              <span className="mode-icon"><TerminalIcon size={22} /></span>
              <span className="mode-number">02</span>
            </span>
            <span className="mode-card-copy">
              <strong>Agent CLI</strong>
              <span>A Pi/Codex-inspired console with commands, tools, and natural language.</span>
            </span>
            <span className="mode-card-preview cli-preview" aria-hidden="true">
              <i><em>guest@chintan</em>:~$ whoami</i>
              <i>backend engineer · amazon</i>
              <i className="cursor-line">_</i>
            </span>
            <span className="mode-action">Launch agent CLI <ArrowIcon size={17} /></span>
          </button>
        </section>

        <footer className="gateway-footer">
          <span>Prefer the straightforward version?</span>
          <a href="/profile">Continue to full profile <ArrowIcon size={14} /></a>
        </footer>
      </div>
    </main>
  );
}

function ToolMessage({ message, cli }: { message: TranscriptMessage; cli: boolean }) {
  const [open, setOpen] = useState(cli);
  return (
    <details className={`tool-message ${cli ? "tool-message-cli" : ""}`} open={open} onToggle={event=>setOpen(event.currentTarget.open)}>
      <summary>
        <span className="tool-state">{message.pending ? "◌" : message.error ? "!" : "✓"}</span>
        <span>{message.title ?? "Portfolio lookup"}</span>
        <ChevronIcon className="tool-chevron" size={14} />
      </summary>
      <div>{message.content}</div>
    </details>
  );
}

function Transcript({ messages, mode, busy, onRetry }: { messages: TranscriptMessage[]; mode: InterfaceMode; busy: boolean; onRetry: (question: string) => void }) {
  const logRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const lastUser = useRef("");
  useEffect(() => {
    const newestUser = messages.filter(m=>m.role === "user").at(-1)?.id ?? "";
    if (lastUser.current !== newestUser) following.current = true;
    lastUser.current = newestUser;
    const log = logRef.current;
    if (log && following.current) log.scrollTop = log.scrollHeight;
  }, [messages, busy, mode]);
  const onScroll = () => {
    const log = logRef.current;
    if (log) following.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  };
  const [now, setNow] = useState(Date.now());
  const coolingDown = messages.some(message => (message.retryAt ?? 0) > now);
  useEffect(() => {
    if (!coolingDown) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [coolingDown]);
  const retry = (message: TranscriptMessage) => {
    if (message.pending || !message.retryQuestion) return null;
    const remaining = Math.max(0, Math.ceil(((message.retryAt ?? 0) - now) / 1000));
    return <button className="retry-button" type="button" disabled={busy || remaining > 0} onClick={()=>onRetry(message.retryQuestion!)}>{remaining ? `Retry in ${remaining}s` : "Retry question"}</button>;
  };

  if (mode === "cli") {
    return (
      <div className="cli-transcript" ref={logRef} onScroll={onScroll} role="log" aria-live="off" tabIndex={0} aria-label="Portfolio agent transcript">
        <div className="cli-banner">
          <h1>CHINTAN / AGENT</h1>
          <small>portfolio intelligence interface · v1.0</small>
        </div>
        <div className="cli-system-line"><span>●</span> session initialized · public knowledge scope</div>
        {messages.map((message) => {
          if (message.role === "tool") return <ToolMessage key={message.id} message={message} cli />;
          if (message.role === "user") {
            return <div className="cli-user" key={message.id}><span className="cli-prompt">❯</span><span>{message.content}</span></div>;
          }
          return (
            <article className={`cli-assistant ${message.error ? "message-error" : ""}`} key={message.id}>
              <div className="cli-agent-label"><span>◆</span> chintan-agent</div>
              <div className="markdown-body"><MarkdownContent content={message.content || (message.pending ? "Thinking…" : "")} /></div>
              {message.pending && !message.content && <span className="stream-loader" aria-label="Generating response"><i /><i /><i /></span>}
              <SourceLinks sources={message.sources} />
              {message.status && <p className="answer-status">{message.status}</p>}
              {retry(message)}
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="visual-transcript" ref={logRef} onScroll={onScroll} role="log" aria-live="off" tabIndex={0} aria-label="Portfolio conversation">
      {messages.map((message) => {
        if (message.role === "tool") return <ToolMessage key={message.id} message={message} cli={false} />;
        if (message.role === "user") return <div className="visual-user" key={message.id}>{message.content}</div>;
        return (
          <article className={`visual-assistant ${message.error ? "message-error" : ""}`} key={message.id}>
            <div className="assistant-avatar">CP</div>
            <div className="assistant-content">
              <span className="assistant-name">Chintan portfolio agent</span>
              <div className="markdown-body"><MarkdownContent content={message.content || (message.pending ? "Thinking…" : "")} /></div>
              {message.pending && !message.content && <span className="stream-loader" aria-label="Generating response"><i /><i /><i /></span>}
              <SourceLinks sources={message.sources} cards={!message.pending} />
              {message.status && <p className="answer-status">{message.status}</p>}
              {retry(message)}
            </div>
          </article>
        );
      })}
    </div>
  );
}

interface ComposerProps {
  mode: InterfaceMode;
  value: string;
  busy: boolean;
  commandHistory: string[];
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onClear: () => void;
}

function Composer({ mode, value, busy, commandHistory, onChange, onSubmit, onStop, onClear }: ComposerProps) {
  const historyIndex = useRef(commandHistory.length);
  const draft = useRef("");
  const editor = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    historyIndex.current = commandHistory.length;
    if (window.matchMedia("(pointer: fine)").matches) editor.current?.focus({ preventScroll: true });
  }, [commandHistory.length, mode]);
  useEffect(() => {
    if (!editor.current) return;
    editor.current.style.height = "auto";
    editor.current.style.height = `${Math.min(120, editor.current.scrollHeight)}px`;
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.key === "Process") return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!busy) onSubmit();
      return;
    }
    if (event.key === "Escape" && busy) {
      event.preventDefault();
      onStop();
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      onClear();
      return;
    }
    if (mode === "cli" && event.key === "Tab") {
      const match = value.trim() && commandSuggestions.find((suggestion) => suggestion !== value.toLowerCase() && suggestion.startsWith(value.toLowerCase()));
      if (match) {
        event.preventDefault();
        onChange(match);
      }
      return;
    }
    if (mode === "cli" && event.key === "ArrowUp" && !value.includes("\n") && commandHistory.length > 0) {
      event.preventDefault();
      if (historyIndex.current === commandHistory.length) draft.current = value;
      historyIndex.current = Math.max(0, historyIndex.current - 1);
      onChange(commandHistory[historyIndex.current] ?? "");
      return;
    }
    if (mode === "cli" && event.key === "ArrowDown" && !value.includes("\n") && commandHistory.length > 0) {
      event.preventDefault();
      historyIndex.current = Math.min(commandHistory.length, historyIndex.current + 1);
      onChange(historyIndex.current === commandHistory.length ? draft.current : commandHistory[historyIndex.current] ?? "");
    }
  }

  return (
    <div className={`composer ${mode === "cli" ? "composer-cli" : "composer-visual"}`}>
      {mode === "cli" && <div className="cli-command-actions" aria-label="Terminal actions">
        <button type="button" onClick={()=>onChange("/help")}>/help</button>
        <button type="button" onClick={()=>onChange("/experience")}>/experience</button>
        <button type="button" onClick={onClear}>Clear transcript</button>
      </div>}
      <div className="composer-inner">
        {mode === "cli" && <span className="composer-prompt" aria-hidden="true">❯</span>}
        <label className="sr-only" htmlFor="portfolio-prompt">Ask the portfolio agent</label>
        <textarea
          ref={editor}
          id="portfolio-prompt"
          data-testid="portfolio-prompt"
          maxLength={1000}
          rows={1}
          value={value}
          readOnly={busy}
          aria-busy={busy}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === "cli" ? "Ask a question or enter /help" : "Ask about experience, systems, impact, or projects…"}
        />
        {busy ? (
          <button className="composer-send composer-stop" type="button" onClick={onStop} aria-label="Stop generating">
            <StopIcon size={16} />
          </button>
        ) : (
          <button className="composer-send" type="button" onClick={onSubmit} disabled={!value.trim()} aria-label="Send message">
            <SendIcon size={16} />
          </button>
        )}
      </div>
      <div className="composer-meta">
        <span>{mode === "cli" ? "tab complete · ↑↓ history · esc stop · ctrl+l clear" : "Answers are grounded in Chintan's approved public profile."}</span>
        <span>{value.length}/1000 · <a href="/privacy">AI privacy</a></span>
      </div>
    </div>
  );
}

function PortfolioMenu() {
  return <details className="portfolio-menu" onKeyDown={event=>{if(event.key === "Escape") {event.currentTarget.open=false; event.currentTarget.querySelector("summary")?.focus();}}}>
    <summary>Links</summary>
    <nav aria-label="Portfolio links">
      <a href="/profile">Full profile</a><a href="/resume">Résumé</a><a href="/projects">Projects</a><a href="/writing">Writing</a>
      <a href="/contact">Contact</a><a href={identity.links.github} target="_blank" rel="noreferrer">GitHub ↗</a>
      <a href={identity.links.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a><a href="/privacy">AI privacy</a>
    </nav>
  </details>;
}

function AppHeader({
  mode,
  onMode,
  onChoose,
  theme,
  onTheme,
}: {
  mode: InterfaceMode;
  onMode: (mode: InterfaceMode) => void;
  onChoose: () => void;
  theme: "dark" | "light";
  onTheme: () => void;
}) {
  return (
    <header className={`agent-header agent-header-${mode}`}>
      <button className="agent-brand" type="button" onClick={onChoose} aria-label="CP Chintan portfolio agent — choose another interface">
        <span className="brand-mark">CP</span>
        <span><strong>Chintan</strong><small>portfolio agent</small></span>
      </button>
      <div className="mode-switch" role="group" aria-label="Interface mode">
        <button type="button" aria-label="Visual mode" aria-pressed={mode === "visual"} className={mode === "visual" ? "active" : ""} onClick={() => onMode("visual")}>
          <SparkIcon size={14} /> <span>Visual</span>
        </button>
        <button type="button" aria-label="CLI mode" aria-pressed={mode === "cli"} className={mode === "cli" ? "active" : ""} onClick={() => onMode("cli")}>
          <TerminalIcon size={14} /> <span>CLI</span>
        </button>
      </div>
      <nav className="agent-actions" aria-label="Portfolio actions">
        <a href="/profile">Full profile</a>
        <PortfolioMenu />
        <button type="button" className="icon-button" onClick={onTheme} aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}>
          {theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
        </button>
      </nav>
    </header>
  );
}

function CliHeader({
  onVisual,
  onChoose,
  theme,
  onTheme,
  busy,
  model,
}: {
  busy: boolean;
  model: string;
  onVisual: () => void;
  onChoose: () => void;
  theme: "dark" | "light";
  onTheme: () => void;
}) {
  return (
    <header className="cli-titlebar">
      <button className="cli-title-identity" type="button" onClick={onChoose} aria-label="chintan-agent — choose another interface">
        <span className="cli-title-glyph">◆</span>
        <strong>chintan-agent</strong>
        <span className="cli-title-session">~/portfolio</span>
      </button>
      <div className="cli-title-status" role="status">
        <span><i className="status-dot" /> {busy ? "responding" : "ready"}</span>
        <span className="cli-model-label" title={model}>{model}</span>
      </div>
      <nav className="cli-title-actions" aria-label="CLI navigation">
        <button type="button" onClick={onVisual} aria-label="Visual mode">Visual</button>
        <a href="/profile">Full profile</a>
        <PortfolioMenu />
        <button type="button" onClick={onTheme} aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}>
          {theme === "dark" ? <SunIcon size={13} /> : <MoonIcon size={13} />} <span className="cli-theme-label">theme</span>
        </button>
      </nav>
    </header>
  );
}

function VisualSidebar({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
    <aside className="visual-sidebar">
      <div className="sidebar-profile">
        <img src="/profile-128.webp" alt="Chintan Puggalok" width="64" height="64" />
        <div><strong>{identity.name}</strong><span>{identity.role}</span></div>
      </div>
      <p className="availability"><span className="status-dot" /> {identity.availability}</p>
      <div className="sidebar-section">
        <span className="sidebar-label">Explore</span>
        {suggestedPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => onPrompt(prompt)}>{prompt}</button>
        ))}
      </div>
      <div className="sidebar-links">
        <a href="/profile">Profile <ArrowIcon size={13} /></a>
        <a href="/projects">Projects <ArrowIcon size={13} /></a>
        <a href="/writing">Writing <ArrowIcon size={13} /></a>
        <a href="/resume" target="_blank" rel="noreferrer">Résumé <ExternalIcon size={12} /></a>
        <a href={identity.links.github} target="_blank" rel="noreferrer">GitHub ↗</a>
        <a href={identity.links.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>
        <a href="/contact">Contact →</a>
      </div>
    </aside>
  );
}

export default function PortfolioApp({ apiUrl, initialMode }: PortfolioAppProps) {
  const [mode, setMode] = useState<InterfaceMode | null>(initialMode ?? null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [model, setModel] = useState("Local commands · AI on request");
  const [announcement, setAnnouncement] = useState("Portfolio ready.");
  const abortRef = useRef<AbortController | null>(null);
  const autoPromptSent = useRef(false);
  const endpoint = useMemo(() => safeApiUrl(apiUrl), [apiUrl]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("mode");
    const stored = readPreference("portfolio-mode");
    const selected = requested === "visual" || requested === "cli" ? requested : stored;
    if (!initialMode && (selected === "visual" || selected === "cli")) setMode(selected);

    const storedTheme = readPreference("portfolio-theme");
    const preferred = storedTheme === "light" ? "light" : "dark";
    setTheme(preferred);
    document.documentElement.dataset.theme = preferred;
  }, [initialMode]);

  useEffect(() => {
    if (!mode || autoPromptSent.current) return;
    const url = new URL(window.location.href);
    const prompt = url.searchParams.get("prompt")?.trim();
    if (!prompt) return;
    autoPromptSent.current = true;
    setInput(prompt.slice(0, 1000));
    url.searchParams.delete("prompt");
    window.history.replaceState({}, "", url);
  }, [mode]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      if (!viewport || viewport.scale === 1) document.documentElement.style.setProperty("--app-height", `${viewport?.height ?? window.innerHeight}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => { viewport?.removeEventListener("resize", resize); window.removeEventListener("resize", resize); };
  }, []);
  useEffect(() => () => { abortRef.current?.abort(); abortRef.current = null; }, []);

  useEffect(() => {
    if (!busy) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") stopGeneration();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [busy]);

  function chooseMode(nextMode: InterfaceMode) {
    setMode(nextMode);
    writePreference("portfolio-mode", nextMode);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", nextMode);
    window.history.replaceState({}, "", url);
  }

  function showChooser() {
    stopGeneration();
    setMode(null);
    writePreference("portfolio-mode", null);
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    window.history.replaceState({}, "", url);
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    writePreference("portfolio-theme", next);
  }

  function clearTranscript() {
    stopGeneration();
    setMessages([welcomeMessage]);
    setInput("");
    setModel("Local commands · AI on request");
    setAnnouncement("Transcript cleared.");
  }

  function stopGeneration() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setMessages((current) => current.map((message) => message.pending
      ? { ...message, pending: false, error: true, status: "Generation stopped.", content: message.content || "Generation stopped." }
      : message));
    setAnnouncement("Generation stopped.");
  }

  async function submitPrompt(promptOverride?: string) {
    const question = (promptOverride ?? input).trim().slice(0, 1000);
    if (!question || abortRef.current || busy || !mode) return;

    setInput("");
    setCommandHistory((history) => [...history, question].slice(-50));

    const localResult = executeLocalCommand(question);
    if (localResult?.clear) {
      clearTranscript();
      return;
    }

    const userMessage: TranscriptMessage = { id: makeId("user"), role: "user", content: question };

    if (localResult) {
      const toolMessage: TranscriptMessage = {
        id: makeId("tool"),
        role: "tool",
        title: `read · ${localResult.title}`,
        content: localResult.sources.length ? `Resolved locally from ${localResult.sources.length} approved portfolio sources. No model call used.` : "Local interface command. No model call used.",
      };
      const answerMessage: TranscriptMessage = {
        id: makeId("assistant"),
        role: "assistant",
        content: localResult.content,
        sources: localResult.sources,
      };
      setMessages((current) => [...current, userMessage, toolMessage, answerMessage]);
      setModel("Local command");
      setAnnouncement(`${localResult.title} ready. Answer available in the transcript.`);
      if (localResult.switchMode) chooseMode(localResult.switchMode);
      if (localResult.navigation) window.open(localResult.navigation, "_blank", "noopener,noreferrer");
      return;
    }

    const answerId = makeId("assistant");
    const toolId = makeId("tool");
    const history: ChatHistoryItem[] = messages
      .filter((message): message is TranscriptMessage & { role: "user" | "assistant" } => message.role !== "tool" && message.id !== "welcome" && !message.error && !message.pending)
      .map((message) => ({ role: message.role, content: message.content }))
      .slice(-8);

    setMessages((current) => [
      ...current,
      userMessage,
      { id: toolId, role: "tool", title: "search · approved portfolio", content: "Selecting relevant public sources…", pending: true },
      { id: answerId, role: "assistant", content: "", pending: true, retryQuestion: question },
    ]);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    setModel("Connecting to AI…");
    setAnnouncement("Generating an answer. Stop is available.");
    const active = () => abortRef.current === controller && !controller.signal.aborted;
    let received = "";

    try {
      await streamPortfolioAnswer({
        apiUrl: endpoint,
        message: question,
        mode,
        history,
        signal: controller.signal,
        handlers: {
          onMeta: ({ model }) => {
            if (!active()) return;
            if (model) setModel(model);
            setMessages((current) => current.map((message) => message.id === toolId
              ? { ...message, title: `search · approved portfolio`, content: `Grounding answer with approved sources${model ? ` · ${model}` : ""}.` }
              : message));
          },
          onTool: ({ label, status }) => {
            if (!active()) return;
            setMessages((current) => current.map((message) => message.id === toolId
              ? { ...message, pending: status === "running", content: label }
              : message));
          },
          onDelta: (text) => {
            if (!active()) return;
            received += text;
            setMessages((current) => current.map((message) => message.id === answerId
              ? { ...message, content: message.content + text }
              : message));
          },
          onSources: (sources) => {
            if (!active()) return;
            setMessages((current) => current.map((message) => message.id === answerId ? { ...message, sources } : message));
          },
          onDone: ({ fallback }) => {
            if (!active()) return;
            setMessages((current) => current.map((message) => message.id === answerId
              ? { ...message, pending: false, retryQuestion: fallback ? question : undefined, status: fallback ? "AI unavailable · showing local facts" : undefined }
              : message.id === toolId ? { ...message, pending: false } : message));
            setAnnouncement(fallback ? "Local facts ready; AI unavailable." : "Answer complete. Sources are available in the transcript.");
          },
        },
      });
    } catch (error) {
      if (!active()) return;
      const fallback = createLocalFallback(question, history.filter(item => item.role === "user").map(item => item.content));
      const status = error instanceof ChatError ? error.message : "Live AI unavailable. Local facts are available; you can retry.";
      setModel(received ? "Interrupted AI answer" : "Local fallback");
      setMessages((current) => current.map((message) => {
        if (message.id === toolId) return received
          ? { ...message, pending: false, error: true, title: "interrupted · AI response", content: "The model connection ended before completion. Partial model text is preserved below." }
          : { ...message, pending: false, error: true, title: "fallback · local portfolio", content: "Live AI unavailable. Resolved from bundled public sources." };
        if (message.id === answerId) return { ...message, content: received || fallback.content, sources: received ? message.sources : fallback.sources, pending: false, error: true, status, retryQuestion: question, retryAt: error instanceof ChatError && error.retryAfter ? Date.now() + error.retryAfter * 1000 : undefined };
        return message;
      }));
      setAnnouncement(status);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(false);
      }
    }
  }

  if (!mode) return <ModeSelector onChoose={chooseMode} />;

  return (
    <main className={`portfolio-app portfolio-app-${mode}`} data-testid={`${mode}-mode`}>
      {mode === "visual" && (
        <AppHeader mode={mode} onMode={chooseMode} onChoose={showChooser} theme={theme} onTheme={toggleTheme} />
      )}

      {mode === "visual" ? (
        <div className="visual-workspace">
          <VisualSidebar onPrompt={(prompt) => void submitPrompt(prompt)} />
          <section className="conversation-panel" aria-label="Visual portfolio assistant">
            <div className="conversation-heading">
              <div><p className="eyebrow"><span className="status-dot" /> Grounded portfolio AI</p><h1>Ask about the work behind the résumé.</h1></div>
              <button className="retry-button" type="button" onClick={clearTranscript}>New chat</button>
            </div>
            {messages.length === 1 && (
              <div className="quick-prompts" aria-label="Suggested questions">
                {suggestedPrompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => void submitPrompt(prompt)}>
                    <CommandIcon size={15} /><span>{prompt}</span><ArrowIcon size={14} />
                  </button>
                ))}
              </div>
            )}
            <Transcript messages={messages} mode={mode} busy={busy} onRetry={q=>void submitPrompt(q)} />
            <Composer
              mode={mode}
              value={input}
              busy={busy}
              commandHistory={commandHistory}
              onChange={(value) => setInput(value.slice(0, 1000))}
              onSubmit={() => void submitPrompt()}
              onStop={stopGeneration}
              onClear={clearTranscript}
            />
          </section>
        </div>
      ) : (
        <div className="cli-terminal">
          <CliHeader
            busy={busy}
            model={model}
            onVisual={() => chooseMode("visual")}
            onChoose={showChooser}
            theme={theme}
            onTheme={toggleTheme}
          />
          <section className="cli-workspace" aria-label="Agent CLI portfolio assistant">
            <Transcript messages={messages} mode={mode} busy={busy} onRetry={q=>void submitPrompt(q)} />
            <Composer
              mode={mode}
              value={input}
              busy={busy}
              commandHistory={commandHistory}
              onChange={(value) => setInput(value.slice(0, 1000))}
              onSubmit={() => void submitPrompt()}
              onStop={stopGeneration}
              onClear={clearTranscript}
            />
            <div className="cli-footer" aria-hidden="true">
              <span><i className="status-dot" /> {busy ? "responding" : "ready"}</span>
              <span>↑↓ history · tab complete · esc stop</span>
              <span>scope: public portfolio</span>
            </div>
          </section>
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    </main>
  );
}
