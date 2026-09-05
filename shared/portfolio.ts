export type SourceKind = "profile" | "experience" | "project" | "skills" | "education" | "recognition";

export interface LinkItem {
  label: string;
  href: string;
}

export interface ImpactMetric {
  value: string;
  label: string;
  detail: string;
  qualifier: "measured" | "projected" | "initiative";
  sourceId: string;
}

export interface ExperienceRole {
  id: string;
  company: string;
  role: string;
  location: string;
  period: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  summary: string;
  highlights: string[];
  technologies: string[];
  href: string;
}

export interface Project {
  id: string;
  title: string;
  period: string;
  summary: string;
  highlights: string[];
  technologies: string[];
  href: string;
  confidentialityNote?: string;
}

export interface SkillGroup {
  id: string;
  title: string;
  description: string;
  items: string[];
}

export interface PortfolioSource {
  id: string;
  kind: SourceKind;
  title: string;
  href: string;
  keywords: string[];
  content: string;
}

export const identity = {
  name: "Chintan Puggalok",
  shortName: "Chintan",
  initials: "CP",
  role: "Software Development Engineer II",
  currentCompany: "Amazon",
  location: "Bengaluru, India",
  eyebrow: "Backend engineer · Distributed systems · Agentic AI",
  headline: "I build backend systems that stay reliable when the scale—and the stakes—grow.",
  shortBio:
    "Software Engineer II with about three years of experience designing high-throughput distributed systems with Java, Kotlin, Kafka, Flink, and AWS, alongside agentic AI solutions that automate operational work.",
  availability: "Open to thoughtful backend and platform opportunities",
  email: "chintanpuggalokbackenddev@gmail.com",
  image: "/profile.webp",
  resume: "/resume/chintan-puggalok-backend-engineer.pdf",
  links: {
    github: "https://github.com/chintanpuggalok",
    linkedin: "https://www.linkedin.com/in/chintanpuggalok",
    devto: "https://dev.to/chintanpuggalok",
  },
} as const;

export const impactMetrics: ImpactMetric[] = [
  {
    value: "1.4M+",
    label: "leads processed yearly",
    detail: "Owned a reactive lead-consumer service with ten-second-or-better processing latency.",
    qualifier: "measured",
    sourceId: "experience-intuit-sde1",
  },
  {
    value: "14%",
    label: "form conversion lift",
    detail: "Built real-time Flink validation and deduplication pipelines supporting higher-quality lead data.",
    qualifier: "initiative",
    sourceId: "experience-intuit-sde1",
  },
  {
    value: "28+",
    label: "international arcs",
    detail: "Designed scalable cross-border offer-mapping configurations and document ingestion architecture.",
    qualifier: "initiative",
    sourceId: "experience-amazon",
  },
  {
    value: "50k+",
    label: "candidates supported",
    detail: "Led reliability, monitoring, performance testing, and risk-analysis improvements for hiring systems.",
    qualifier: "initiative",
    sourceId: "experience-intuit-sde2",
  },
];

export const experience: ExperienceRole[] = [
  {
    id: "experience-amazon",
    company: "Amazon",
    role: "Software Development Engineer II",
    location: "Bengaluru, Karnataka",
    period: "Aug 2025 — Present",
    startDate: "2025-08",
    current: true,
    summary:
      "Building cross-border pricing and compliance systems, with an emphasis on configurable architecture, operational reliability, and platform modernization.",
    highlights: [
      "Spearheaded the Global Store Competitive Match Pricing launch from the UK to Ireland, engineering the organization’s first configurable price floor for external competitor-price matching.",
      "Led a compliance initiative in the CP Precompute system, shaping data-deletion architecture across DynamoDB and AWS Glue while rapidly onboarding to the domain.",
      "Improved CrossBorderCPCalculator reliability and observability by investigating OOM and heap anomalies, integrating JFR profiling, and driving JDK 21, Kotlin 2.x, and Gradle 8.x migrations.",
      "Authored high- and low-level designs for dynamic cross-border price optimization and scalable DocStore ingestion through GraphQL across more than 28 international arcs.",
      "Recognized for Bias for Action, technical leadership, mentorship, and advocacy for code quality in complex design discussions.",
    ],
    technologies: ["Java", "Kotlin", "AWS", "DynamoDB", "Glue", "GraphQL", "JFR", "Gradle", "Distributed systems"],
    href: "/experience/amazon",
  },
  {
    id: "experience-intuit-sde2",
    company: "Intuit",
    role: "Software Development Engineer II",
    location: "Bengaluru, Karnataka",
    period: "Jan 2025 — Aug 2025",
    startDate: "2025-01",
    endDate: "2025-08",
    summary:
      "Led operational-excellence and platform initiatives for hiring systems while guiding a seven-engineer team through reliability and architecture improvements.",
    highlights: [
      "Led seven engineers in implementing Wavefront golden-signal monitoring, Gatling performance testing, and FMEA risk analysis for systems supporting more than 50,000 candidates.",
      "Spearheaded a self-serve rehire system using hexagonal architecture and GraphQL, creating reusable adapters intended to reduce integration effort and target a 50% reduction in hiring costs.",
      "Improved delivery security and speed through Docker/Jenkins CI/CD optimization, vulnerability remediation, and Renovate-based dependency automation.",
    ],
    technologies: ["Java", "Spring Boot", "GraphQL", "DGS", "Gatling", "Wavefront", "Docker", "Jenkins", "FMEA"],
    href: "/experience/intuit-sde2",
  },
  {
    id: "experience-intuit-sde1",
    company: "Intuit",
    role: "Software Development Engineer I",
    location: "Bengaluru, Karnataka",
    period: "Aug 2023 — Jan 2025",
    startDate: "2023-08",
    endDate: "2025-01",
    summary:
      "Owned event-driven lead-processing services and stream pipelines for a major hiring initiative, establishing reusable architecture and testing patterns.",
    highlights: [
      "Architected and owned a reactive Kafka lead-consumer service processing more than 1.4 million leads per year with ten-second-or-better latency for a $22M initiative; the architecture was recognized internally as a gold standard.",
      "Implemented real-time Apache Flink pipelines for validation and deduplication, supporting high-quality data and a 14% form-conversion increase.",
      "Created a parallel Karate testing framework adopted across services to improve reliability and reduce execution time.",
      "Introduced Drools for maintainable lead-qualification rules, delivered multi-channel invitations that increased portal adoption by 20%, and automated Camunda BPMN timers that accelerated hiring by 20%.",
    ],
    technologies: ["Java", "Project Reactor", "Kafka", "Apache Flink", "DGS", "Drools", "Camunda", "Karate"],
    href: "/experience/intuit-sde1",
  },
];

export const projects: Project[] = [
  {
    id: "project-sim-agent",
    title: "Ticketing Analysis Agent",
    period: "Aug 2025 — Present",
    summary:
      "A GenAI agent that investigates operational ticket patterns and turns fragmented service knowledge into useful transition artifacts.",
    highlights: [
      "Queries and analyzes ticketing data to identify recurring patterns across services.",
      "Generates knowledge-transfer reports and architecture maps to accelerate service-ownership transitions.",
    ],
    technologies: ["GenAI", "LLMs", "Agent workflows", "Knowledge synthesis"],
    href: "/projects/ticketing-analysis-agent",
    confidentialityNote: "Presented only at the level approved in the public résumé.",
  },
  {
    id: "project-hiring-bot",
    title: "Agentic Hiring Bot",
    period: "Apr 2025",
    summary:
      "An agentic bot that helps recruiters and candidates understand hiring processes and reduces dependence on human support.",
    highlights: [
      "Developed a process-question assistant for recruiters and candidates.",
      "Used LangChain, Python, and a vector database, as listed in the public résumé.",
    ],
    technologies: ["LangChain", "Python", "Vector database", "Agentic AI"],
    href: "/projects/agentic-hiring-bot",
  },
  {
    id: "project-phone-screen",
    title: "Phone Screen Automation Prototype",
    period: "Oct 2023",
    summary:
      "A rapid engineering prototype exploring how a knowledge engine could streamline the initial hiring-screen stage.",
    highlights: [
      "Led rapid prototyping during Global Engineering Days.",
      "Demonstrated a projected annual saving of more than 45,000 hours.",
      "Earned leadership recognition and helped move the idea into initiative prioritization.",
    ],
    technologies: ["Automation", "Knowledge engine", "Rapid prototyping"],
    href: "/projects/phone-screen-automation",
  },
];

export const skillGroups: SkillGroup[] = [
  {
    id: "languages",
    title: "Languages & APIs",
    description: "Production languages and interface technologies used to build backend services.",
    items: ["Java 11+", "Kotlin", "Python", "SQL / Postgres", "JavaScript", "GraphQL"],
  },
  {
    id: "distributed",
    title: "Distributed & event-driven systems",
    description: "Patterns and platforms for high-throughput asynchronous processing.",
    items: ["Kafka", "Apache Flink", "Project Reactor", "Microservices", "Stream processing", "Event-driven architecture"],
  },
  {
    id: "backend",
    title: "Backend platforms",
    description: "Frameworks and workflow technologies used across service and business-logic layers.",
    items: ["Spring Boot", "DGS Framework", "Drools", "Camunda BPM", "Hexagonal architecture", "API design"],
  },
  {
    id: "cloud",
    title: "Cloud & delivery",
    description: "Infrastructure and delivery systems supporting reliable production operation.",
    items: ["AWS", "DynamoDB", "Glue", "S3", "ECS", "SQS", "Kubernetes", "Docker", "Jenkins", "CI/CD"],
  },
  {
    id: "quality",
    title: "Reliability & quality",
    description: "Operational practices for understanding, testing, and improving live systems.",
    items: ["Observability", "JFR profiling", "Splunk", "Wavefront", "JUnit", "Karate", "Gatling", "FMEA"],
  },
  {
    id: "ai",
    title: "Applied AI",
    description: "Grounded assistants and agents designed around practical operational workflows.",
    items: ["GenAI", "Agentic AI", "LangChain", "Retrieval", "Vector databases", "Knowledge synthesis"],
  },
];

export const education = {
  id: "education-iiitd",
  institution: "Indraprastha Institute of Information Technology Delhi",
  degree: "Bachelor of Technology in Computer Science and Applied Mathematics",
  period: "Aug 2019 — Jul 2023",
  gpa: "8.67 / 10.0",
};

export const recognition = [
  "10+ Intuit Spotlight recognitions spanning customer obsession, technical innovation, courage, and collaboration.",
  "Third-place finalist at Hackanoodle by Zomato (2022), a national e-commerce hackathon.",
];

export const interests = ["LLMs and agentic systems", "Personal finance", "Credit cards", "Board games", "Exploring eateries"];

const profileSource: PortfolioSource = {
  id: "profile-summary",
  kind: "profile",
  title: "Professional summary",
  href: "/profile#about",
  keywords: ["about", "summary", "who", "backend", "engineer", "amazon", "location", "hire", "opportunity"],
  content: `${identity.name} is a ${identity.role} at ${identity.currentCompany} in ${identity.location}. ${identity.shortBio} ${identity.availability}.`,
};

const impactSource: PortfolioSource = {
  id: "profile-impact",
  kind: "profile",
  title: "Selected engineering impact",
  href: "/profile#impact",
  keywords: ["impact", "metric", "scale", "achievement", "biggest", "million", "latency", "conversion", "candidate", "arcs"],
  content: impactMetrics.map((metric) => `${metric.value} ${metric.label} (${metric.qualifier}): ${metric.detail}`).join(" "),
};

export const portfolioSources: PortfolioSource[] = [
  profileSource,
  impactSource,
  {
    id: "contact", kind: "profile", title: "Contact and résumé", href: "/contact",
    keywords: ["contact", "email", "linkedin", "github", "resume", "résumé", "reach"],
    content: `Public email: ${identity.email}. LinkedIn: ${identity.links.linkedin}. GitHub: ${identity.links.github}. Résumé: https://chintanpuggalok.com/resume. ${identity.availability}.`,
  },
  ...experience.map((role) => ({
    id: role.id,
    kind: "experience" as const,
    title: `${role.role} at ${role.company}`,
    href: role.href,
    keywords: [
      role.company.toLowerCase(),
      role.role.toLowerCase(),
      ...role.technologies.map((technology) => technology.toLowerCase()),
      "experience",
      "work",
    ],
    content: `${role.period}. ${role.summary} ${role.highlights.join(" ")} Technologies: ${role.technologies.join(", ")}.`,
  })),
  ...projects.map((project) => ({
    id: project.id,
    kind: "project" as const,
    title: project.title,
    href: project.href,
    keywords: ["project", ...project.title.toLowerCase().split(/\s+/), ...project.technologies.map((technology) => technology.toLowerCase())],
    content: `${project.period}. ${project.summary} ${project.highlights.join(" ")} Technologies: ${project.technologies.join(", ")}.`,
  })),
  {
    id: "skills-overview",
    kind: "skills",
    title: "Technical capabilities",
    href: "/profile#capabilities",
    keywords: ["skill", "stack", "technology", "java", "kotlin", "python", "aws", "kafka", "flink", "spring", "cloud", "reliability", "ai"],
    content: skillGroups.map((group) => `${group.title}: ${group.items.join(", ")}.`).join(" "),
  },
  {
    id: education.id,
    kind: "education",
    title: "Education",
    href: "/profile#education",
    keywords: ["education", "college", "university", "degree", "gpa", "iiit", "mathematics"],
    content: `${education.degree} from ${education.institution}, ${education.period}, GPA ${education.gpa}.`,
  },
  {
    id: "recognition",
    kind: "recognition",
    title: "Recognition",
    href: "/profile#recognition",
    keywords: ["award", "recognition", "hackathon", "spotlight", "zomato", "hackanoodle"],
    content: recognition.join(" "),
  },
];

export const suggestedPrompts = [
  "What are Chintan's biggest engineering outcomes?",
  "Tell me about his Kafka and Flink experience.",
  "What has he built at Amazon?",
  "Why is Chintan a strong backend engineer?",
  "Show me his applied AI projects.",
  "How can I contact Chintan?",
  "Summarize Chintan's experience.",
  "What did he accomplish at Intuit?",
];

export function selectPortfolioSources(query: string, limit = 5): PortfolioSource[] {
  const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ");
  const stopWords = new Set(["the", "and", "for", "with", "what", "did", "has", "have", "his", "her", "about", "tell", "show", "chintan"]);
  const terms = normalizedQuery
    .split(/\s+/)
    .filter((term) => term.length > 1 && !stopWords.has(term));

  const scored = portfolioSources.map((source, index) => {
    const searchable = `${source.title} ${source.keywords.join(" ")} ${source.content}`.toLowerCase();
    const termScore = terms.reduce((total, term) => {
      const keywordMatch = source.keywords.some((keyword) => keyword.toLowerCase().split(/[^a-z0-9+#.]+/).includes(term));
      const textMatch = searchable.includes(term);
      return total + (keywordMatch ? 4 : 0) + (textMatch ? 1 : 0);
    }, 0);
    const phraseScore = source.keywords.reduce((total, keyword) => {
      const normalizedKeyword = keyword.toLowerCase();
      return total + (normalizedKeyword.length > 3 && normalizedQuery.includes(normalizedKeyword) ? 5 : 0);
    }, 0);
    return { source, score: termScore + phraseScore, index };
  });

  const matching = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ source }) => source);

  const size = Math.max(1, limit);
  if (matching.length === 0) return [profileSource, impactSource].slice(0, size);
  if (!matching.some((source) => source.id === "profile-summary")) {
    return [...matching.slice(0, size - 1), profileSource];
  }
  return matching.slice(0, size);
}

export function getSourceById(id: string): PortfolioSource | undefined {
  return portfolioSources.find((source) => source.id === id);
}

// Never trust a model/client-supplied URL or source body: resolve IDs from our catalog.
export function validateSources(value: unknown, allowed = portfolioSources): PortfolioSource[] {
  if (!Array.isArray(value)) return [];
  const ids = value.flatMap((item) => typeof item === "string" ? [item] : item && typeof item.id === "string" ? [item.id] : []);
  return [...new Set(ids)].flatMap((id) => {
    const source = allowed.find((item) => item.id === id);
    return source ? [source] : [];
  }).slice(0, 6);
}
