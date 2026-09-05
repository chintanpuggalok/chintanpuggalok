import { describe, expect, it } from "vitest";
import { createLocalFallback, executeLocalCommand } from "@/lib/commands";
import { selectPortfolioSources } from "@shared/portfolio";

describe("portfolio source selection", () => {
  it("prioritizes Amazon for a cross-border pricing question", () => {
    const sources = selectPortfolioSources("What did Chintan build for cross-border pricing at Amazon?");
    expect(sources[0]?.id).toBe("experience-amazon");
    expect(sources.some((source) => source.id === "profile-summary")).toBe(true);
  });

  it("selects stream-processing experience for Kafka and Flink", () => {
    const sources = selectPortfolioSources("Kafka Flink stream processing");
    expect(sources.some((source) => source.id === "experience-intuit-sde1")).toBe(true);
    expect(sources.some((source) => source.id === "skills-overview")).toBe(true);
  });

  it("falls back to summary and impact for an unmatched query", () => {
    const sources = selectPortfolioSources("xyzzy quux");
    expect(sources.map((source) => source.id)).toEqual(["profile-summary", "profile-impact"]);
  });
});

describe("deterministic CLI commands", () => {
  it.each(["/about", "whoami", "cat about"])("resolves %s locally", (command) => {
    const result = executeLocalCommand(command);
    expect(result?.title).toBe("Professional summary");
    expect(result?.content).toContain("Amazon");
  });

  it("returns detailed Amazon experience", () => {
    const result = executeLocalCommand("cat experience/amazon");
    expect(result?.content).toContain("Global Store Competitive Match Pricing");
    expect(result?.sources[0]?.id).toBe("experience-amazon");
  });

  it("returns both Intuit roles for the company alias", () => {
    const result = executeLocalCommand("cat experience/intuit");
    expect(result?.title).toBe("Experience at Intuit");
    expect(result?.content).toContain("Software Development Engineer II");
    expect(result?.content).toContain("Software Development Engineer I");
  });

  it("opens the approved résumé route", () => {
    const result = executeLocalCommand("open resume");
    expect(result?.navigation).toBe("/resume/chintan-puggalok-backend-engineer.pdf");
  });

  it("supports clear and mode-switch commands", () => {
    expect(executeLocalCommand("/clear")?.clear).toBe(true);
    expect(executeLocalCommand("/ui")?.switchMode).toBe("visual");
  });

  it("does not intercept ordinary natural-language questions", () => {
    expect(executeLocalCommand("Why is Chintan a strong backend engineer?")).toBeNull();
  });

  it("creates an offline answer with validated sources", () => {
    const result = createLocalFallback("Tell me about Kafka");
    expect(result.content).toContain("verified facts");
    expect(result.sources.length).toBeGreaterThan(0);
  });
});
