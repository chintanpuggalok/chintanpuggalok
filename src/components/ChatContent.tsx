import type { ReactNode } from "react";
import { experience, projects, impactMetrics, skillGroups, validateSources, identity, type PortfolioSource } from "@shared/portfolio";

export function safeLink(url: string): string | undefined {
  if (/^\/(?!\/)/.test(url) && !/[\\\x00-\x20]/.test(url)) return url;
  if (url === `mailto:${identity.email}`) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && ["chintanpuggalok.com", "www.linkedin.com", "github.com", "dev.to"].includes(parsed.hostname)) return url;
  } catch { /* Not an approved URL. */ }
  return undefined;
}

function inlineMarkdown(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.filter(Boolean).map((part, index) => {
    const partKey = `${key}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={partKey}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={partKey}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = safeLink(link[2]);
      return href ? <a key={partKey} href={href} target="_blank" rel="noopener noreferrer">{link[1]}</a> : <span key={partKey}>{link[1]}</span>;
    }
    return part;
  });
}

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      for (index++; index < lines.length && !lines[index].startsWith("```"); index++) code.push(lines[index]);
      if (index < lines.length) index++;
      blocks.push(<pre key={`code-${index}`}><code className={language ? `language-${language}` : undefined}>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const Tag = `h${heading[1].length}` as "h1" | "h2" | "h3";
      blocks.push(<Tag key={`heading-${index}`}>{inlineMarkdown(heading[2], `heading-${index}`)}</Tag>);
      index++;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        const text = lines[index].replace(/^[-*]\s+/, "");
        items.push(<li key={`item-${index}`}>{inlineMarkdown(text, `item-${index}`)}</li>);
        index++;
      }
      blocks.push(<ul key={`list-${index}`}>{items}</ul>);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index])) {
        const text = lines[index].replace(/^\d+[.)]\s+/, "");
        items.push(<li key={`item-${index}`}>{inlineMarkdown(text, `item-${index}`)}</li>);
        index++;
      }
      blocks.push(<ol key={`list-${index}`}>{items}</ol>);
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s+|^```|^[-*]\s+|^\d+[.)]\s+/.test(lines[index])) {
      paragraph.push(lines[index]);
      index++;
    }
    blocks.push(<p key={`paragraph-${index}`}>{paragraph.flatMap((text, lineIndex) => [lineIndex ? <br key={`break-${index}-${lineIndex}`} /> : null, ...inlineMarkdown(text, `paragraph-${index}-${lineIndex}`)])}</p>);
  }
  return <>{blocks}</>;
}

export function SourceLinks({ sources = [], cards = false }: { sources?: PortfolioSource[]; cards?: boolean }) {
  const valid = validateSources(sources);
  if (!valid.length) return null;
  return <>
    <nav className="message-sources" aria-label="Answer sources"><span>Sources</span>
      {valid.map(source => <a key={source.id} href={source.href} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>)}
    </nav>
    {cards && <div className="answer-cards" aria-label="Related portfolio details">
      {valid.slice(0, 3).map(source => {
        const role = experience.find(item => item.id === source.id);
        const project = projects.find(item => item.id === source.id);
        return <a className="answer-card" href={source.href} key={source.id} target="_blank" rel="noopener noreferrer">
          <strong>{source.title} ↗</strong>
          <span>{role?.period ?? project?.period ?? source.kind}</span>
          <p>{role?.summary ?? project?.summary ?? (source.id === "profile-impact"
            ? impactMetrics.map(m=>`${m.value} ${m.label} (${m.qualifier})`).join(" · ")
            : source.id === "skills-overview" ? skillGroups.map(g=>g.title).join(" · ") : source.content)}</p>
        </a>;
      })}
    </div>}
  </>;
}
