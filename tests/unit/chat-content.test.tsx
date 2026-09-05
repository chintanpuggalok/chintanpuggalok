import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownContent, safeLink } from "../../src/components/ChatContent";

describe("safe portfolio Markdown", () => {
  it("allows only approved links", () => {
    expect(safeLink("/profile")).toBe("/profile");
    expect(safeLink("https://github.com/chintanpuggalok")).toContain("github.com");
    expect(safeLink("javascript:alert(1)")).toBeUndefined();
    expect(safeLink("https://evil.example/profile")).toBeUndefined();
  });

  it("renders useful formatting without interpreting HTML or unsafe links", () => {
    const { container } = render(<MarkdownContent content={'**Backend engineer**\n\n- Kafka\n- Flink\n\n[unsafe](javascript:alert(1))\n\n<img src=x onerror="alert(1)">'} />);
    expect(screen.getByText("Backend engineer").tagName).toBe("STRONG");
    expect(screen.getByText("Kafka").tagName).toBe("LI");
    expect(screen.getByText("unsafe").tagName).toBe("SPAN");
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
  });
});
