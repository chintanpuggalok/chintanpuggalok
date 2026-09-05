import { isPortfolioQuestion, scopeReply } from "@shared/scope";
import {
  education,
  experience,
  identity,
  impactMetrics,
  portfolioSources,
  projects,
  recognition,
  selectPortfolioSources,
  skillGroups,
  type PortfolioSource,
} from "@shared/portfolio";

export interface LocalCommandResult {
  command: string;
  title: string;
  content: string;
  sources: PortfolioSource[];
  navigation?: string;
  clear?: boolean;
  switchMode?: "visual" | "cli";
}

const helpText = `Available commands

\`\`\`text
/help          Show this command reference
/about         Read Chintan's professional summary
/impact        Inspect quantified engineering outcomes
/experience    List roles at Amazon and Intuit
/projects      List selected backend and AI projects
/skills        Inspect the backend toolkit
/contact       Get approved public contact links
/resume        Open the résumé PDF
/profile       Open the complete professional profile
/ui            Switch to Visual mode
/clear         Clear this transcript
\`\`\`

Shell aliases also work: \`ls projects\`, \`ls experience\`, \`cat about\`, \`cat experience/amazon\`, \`grep kafka experience\`, \`open profile\`, and \`open resume\`.

You can also ask an ordinary question and the portfolio AI will answer from approved sources.`;

function sourceFor(id: string): PortfolioSource[] {
  const source = portfolioSources.find((item) => item.id === id);
  return source ? [source] : [];
}

function listExperience(): LocalCommandResult {
  return {
    command: "/experience",
    title: "Experience index",
    content: experience
      .map((role) => `**${role.role} · ${role.company}**\n${role.period}\n${role.summary}`)
      .join("\n\n"),
    sources: experience.map((role) => portfolioSources.find((source) => source.id === role.id)).filter(Boolean) as PortfolioSource[],
  };
}

function experienceDetail(companyOrRole: string): LocalCommandResult | null {
  const normalized = companyOrRole.toLowerCase();
  if (normalized === "experience/intuit" || normalized === "intuit") {
    const roles = experience.filter((item) => item.company === "Intuit");
    return {
      command: `cat ${companyOrRole}`,
      title: "Experience at Intuit",
      content: roles.map((role) => `**${role.role} · ${role.period}**\n${role.summary}\n\n${role.highlights.map((item) => `- ${item}`).join("\n")}`).join("\n\n"),
      sources: roles.map((role) => portfolioSources.find((source) => source.id === role.id)).filter(Boolean) as PortfolioSource[],
    };
  }
  const role = experience.find((item) => {
    if (["amazon", "experience/amazon"].includes(normalized)) return item.company === "Amazon";
    if (["intuit-sde2", "experience/intuit-sde2"].includes(normalized)) return item.id === "experience-intuit-sde2";
    if (["intuit-sde1", "experience/intuit-sde1"].includes(normalized)) return item.id === "experience-intuit-sde1";
    return false;
  });

  if (!role) return null;
  return {
    command: `cat ${companyOrRole}`,
    title: `${role.role} at ${role.company}`,
    content: `${role.period} · ${role.location}\n\n${role.summary}\n\n${role.highlights.map((item) => `- ${item}`).join("\n")}\n\n**Stack:** ${role.technologies.join(" · ")}`,
    sources: sourceFor(role.id),
  };
}

function listProjects(): LocalCommandResult {
  return {
    command: "/projects",
    title: "Project index",
    content: projects
      .map((project) => `**${project.title}** · ${project.period}\n${project.summary}\nStack: ${project.technologies.join(" · ")}`)
      .join("\n\n"),
    sources: projects.map((project) => portfolioSources.find((source) => source.id === project.id)).filter(Boolean) as PortfolioSource[],
  };
}

function skillsResult(filter?: string): LocalCommandResult {
  const normalized = filter?.trim().toLowerCase();
  const groups = normalized
    ? skillGroups.filter((group) => `${group.title} ${group.description} ${group.items.join(" ")}`.toLowerCase().includes(normalized))
    : skillGroups;

  return {
    command: normalized ? `grep ${normalized} skills` : "/skills",
    title: normalized ? `Capabilities matching “${normalized}”` : "Backend capabilities",
    content:
      groups.length > 0
        ? groups.map((group) => `**${group.title}**\n${group.description}\n${group.items.join(" · ")}`).join("\n\n")
        : `No exact skill entry matched “${normalized}”. Try Java, Kafka, Flink, AWS, reliability, or AI.`,
    sources: sourceFor("skills-overview"),
  };
}

export function executeLocalCommand(rawInput: string): LocalCommandResult | null {
  const input = rawInput.trim();
  const normalized = input.toLowerCase().replace(/\s+/g, " ");
  if (!input) return null;

  if (["/help", "help", "?"].includes(normalized)) {
    return { command: input, title: "Command reference", content: helpText, sources: [] };
  }

  if (["/about", "about", "whoami", "cat about", "cat profile"].includes(normalized)) {
    return {
      command: input,
      title: "Professional summary",
      content: `**${identity.name}**\n${identity.role} at ${identity.currentCompany} · ${identity.location}\n\n${identity.shortBio}\n\n_${identity.availability}._`,
      sources: sourceFor("profile-summary"),
    };
  }

  if (["/impact", "impact", "metrics", "cat impact"].includes(normalized)) {
    return {
      command: input,
      title: "Selected engineering impact",
      content: impactMetrics
        .map((metric) => `**${metric.value} ${metric.label}**\n${metric.detail}${metric.qualifier === "projected" ? " _(projected)_" : ""}`)
        .join("\n\n"),
      sources: [
        ...sourceFor("profile-impact"),
        ...new Map(impactMetrics.flatMap((metric) => sourceFor(metric.sourceId)).map((source) => [source.id, source])).values(),
      ],
    };
  }

  if (["/experience", "experience", "ls experience", "ls experience/"].includes(normalized)) return listExperience();
  if (normalized.startsWith("cat experience/") || normalized.startsWith("/experience ")) {
    const result = experienceDetail(normalized.replace(/^(cat |\/experience )/, ""));
    if (result) return result;
  }

  if (["/projects", "projects", "ls projects", "ls projects/"].includes(normalized)) return listProjects();

  if (["/skills", "skills", "stack", "cat skills"].includes(normalized)) return skillsResult();
  const grepMatch = normalized.match(/^grep\s+(\S+)\s+(skills|experience|profile)$/);
  if (grepMatch) {
    if (grepMatch[2] === "skills") return skillsResult(grepMatch[1]);
    const sources = portfolioSources.filter((source) =>
      (grepMatch[2] !== "experience" || source.kind === "experience") && source.content.toLowerCase().includes(grepMatch[1]));
    return {
      command: input, title: `Search ${grepMatch[2]} for “${grepMatch[1]}”`, sources,
      content: sources.length ? sources.map((source) => `**${source.title}**\n${source.content}`).join("\n\n") : "No matching portfolio information. Try a different term or /help.",
    };
  }

  if (["/contact", "contact", "cat contact"].includes(normalized)) {
    return {
      command: input,
      title: "Contact Chintan",
      content: `Email: [${identity.email}](mailto:${identity.email})\nLinkedIn: [linkedin.com/in/chintanpuggalok](${identity.links.linkedin})\nGitHub: [github.com/chintanpuggalok](${identity.links.github})`,
      sources: sourceFor("contact"),
    };
  }

  if (["/resume", "resume", "open resume"].includes(normalized)) {
    return {
      command: input,
      title: "Opening résumé",
      content: `Opening the approved résumé. If your browser blocks the new tab, [open the PDF here](${identity.resume}).`,
      sources: sourceFor("profile-summary"),
      navigation: identity.resume,
    };
  }

  if (["/profile", "profile", "open profile"].includes(normalized)) {
    return {
      command: input,
      title: "Opening full profile",
      content: "Opening the professional profile. If your browser blocks the new tab, [open the full profile here](/profile).", 
      sources: sourceFor("profile-summary"),
      navigation: "/profile",
    };
  }

  if (["/ui", "ui", "visual", "open ui"].includes(normalized)) {
    return {
      command: input,
      title: "Switching interface",
      content: "Switching to Visual mode. Your transcript stays here.",
      sources: [],
      switchMode: "visual",
    };
  }

  if (["/clear", "clear", "ctrl+l"].includes(normalized)) {
    return { command: input, title: "Clear", content: "", sources: [], clear: true };
  }

  if (["education", "/education", "cat education"].includes(normalized)) {
    return {
      command: input,
      title: "Education",
      content: `**${education.institution}**\n${education.degree}\n${education.period} · GPA ${education.gpa}`,
      sources: sourceFor(education.id),
    };
  }

  if (["awards", "/awards", "recognition", "/recognition"].includes(normalized)) {
    return {
      command: input,
      title: "Recognition",
      content: recognition.map((item) => `- ${item}`).join("\n"),
      sources: sourceFor("recognition"),
    };
  }

  if (/^(\/|ls\b|cat\b|grep\b|open\b)/.test(normalized)) {
    return { command: input, title: "Unknown command", content: "That command or path is not available. Enter /help for supported commands. This interface cannot execute shell commands.", sources: [] };
  }
  return null;
}

export function createLocalFallback(question: string, previousQuestions: string[] = []): LocalCommandResult {
  if (!isPortfolioQuestion(question, previousQuestions)) return { command: question, title: "Portfolio scope", content: scopeReply, sources: [] };
  const sources = selectPortfolioSources(`${previousQuestions.at(-1) ?? ""} ${question}`.trim(), 3);
  return {
    command: question,
    title: "Portfolio knowledge fallback",
    content: `I couldn't reach the live AI service, so here are the most relevant approved, verified facts:\n\n${sources
      .map((source) => `**${source.title}**\n${source.content}`)
      .join("\n\n")}\n\nUse the source links below for the full context.`,
    sources,
  };
}

export const commandSuggestions = [
  "/help",
  "/about",
  "/impact",
  "/experience",
  "/projects",
  "/skills",
  "/contact",
  "/resume",
  "/profile",
  "/ui",
  "/clear",
  "ls projects",
  "ls experience",
  "cat experience/amazon",
  "cat experience/intuit-sde2",
  "grep kafka experience",
  "open profile",
  "open resume",
];
