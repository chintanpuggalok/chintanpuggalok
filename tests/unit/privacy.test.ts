import { describe, expect, it } from "vitest";
import { identity, portfolioSources } from "@shared/portfolio";

describe("public AI knowledge boundary", () => {
  it("uses the approved professional email", () => {
    expect(identity.email).toBe("chintanpuggalokbackenddev@gmail.com");
  });

  it("does not expose the phone number in AI-visible sources", () => {
    const serialized = JSON.stringify(portfolioSources);
    expect(serialized).not.toContain("8527162716");
    expect(serialized).not.toContain("+91");
  });

  it("marks the portfolio as open to opportunities", () => {
    expect(identity.availability.toLowerCase()).toContain("open");
  });
});
