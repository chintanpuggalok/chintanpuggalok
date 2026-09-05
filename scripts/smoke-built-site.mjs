import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url);
const requiredFiles = [
  "index.html",
  "ask/index.html",
  "profile/index.html",
  "experience/index.html",
  "experience/amazon/index.html",
  "experience/intuit-sde2/index.html",
  "projects/index.html",
  "projects/ticketing-analysis-agent/index.html",
  "writing/index.html",
  "writing/url-forwarding/index.html",
  "resume/index.html",
  "contact/index.html",
  "privacy/index.html",
  "CNAME",
  "sitemap-index.xml",
  "resume/chintan-puggalok-backend-engineer.pdf",
];

const failures = [];
for (const file of requiredFiles) {
  try {
    const info = await stat(new URL(file, dist));
    if (!info.isFile() || info.size === 0) failures.push(`${file} is empty or not a file`);
  } catch {
    failures.push(`${file} is missing`);
  }
}

const profile = await readFile(new URL("profile/index.html", dist), "utf8");
const home = await readFile(new URL("index.html", dist), "utf8");
const ask = await readFile(new URL("ask/index.html", dist), "utf8");
const privacy = await readFile(new URL("privacy/index.html", dist), "utf8");

const expectations = [
  [profile.includes("chintanpuggalokbackenddev@gmail.com"), "approved email is missing from profile"],
  [profile.includes("1.4M+"), "impact metric is missing from profile"],
  [profile.includes("Amazon"), "current employer is missing from profile"],
  [profile.includes("rel=\"canonical\""), "canonical metadata is missing"],
  [home.includes("1.4M+"), "default homepage does not contain the full profile"],
  [home.includes("/ask?mode=visual"), "default homepage Ask AI link is missing"],
  [!home.includes("PortfolioApp"), "default homepage unexpectedly loads the AI application"],
  [ask.includes("PortfolioApp"), "Ask AI hydration marker is missing"],
  [ask.includes("View full profile"), "Ask AI no-JavaScript profile fallback is missing"],
  [privacy.includes("OpenRouter"), "AI privacy disclosure is missing"],
];
for (const [condition, message] of expectations) if (!condition) failures.push(message);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return nested.flat();
}

const textFiles = (await listFiles(dist.pathname)).filter((file) => /\.(?:html|js|css|xml|txt|json)$/i.test(file));
for (const file of textFiles) {
  const text = await readFile(file, "utf8");
  if (text.includes("8527162716") || text.includes("+918527162716")) {
    failures.push(`phone number leaked into generated text asset: ${file.replace(dist.pathname, "")}`);
  }
}

if (failures.length > 0) {
  console.error("Production smoke test failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`Production smoke test passed (${requiredFiles.length} required assets, ${textFiles.length} text assets scanned).`);
