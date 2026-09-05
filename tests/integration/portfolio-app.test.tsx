import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortfolioApp from "@/components/PortfolioApp";

function aiStream(answer = "Chintan has built **high-throughput backend systems**.") {
  const body = [
    'event: meta\ndata: {"requestId":"test-1","model":"test/free"}\n\n',
    'event: tool\ndata: {"status":"running","label":"2 approved sources selected"}\n\n',
    `event: delta\ndata: ${JSON.stringify({ text: answer })}\n\n`,
    'event: sources\ndata: {"sources":[{"id":"profile-summary","kind":"profile","title":"Professional summary","href":"/profile#about","keywords":[],"content":"Approved summary"}]}\n\n',
    'event: done\ndata: {"fallback":false}\n\n',
  ].join("");
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("open", vi.fn());
});

describe("dual-mode portfolio journey", () => {
  it("lets a first-time visitor choose Visual mode", async () => {
    const user = userEvent.setup();
    render(<PortfolioApp apiUrl="https://api.test" />);

    expect(await screen.findByTestId("mode-selector")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /visual interface/i }));

    expect(screen.getByTestId("visual-mode")).toBeInTheDocument();
    expect(window.localStorage.getItem("portfolio-mode")).toBe("visual");
    expect(screen.getByText(/ask about the work behind the résumé/i)).toBeInTheDocument();
  });

  it("runs a deterministic CLI command without calling AI", async () => {
    const user = userEvent.setup();
    render(<PortfolioApp apiUrl="https://api.test" initialMode="cli" />);

    const prompt = screen.getByTestId("portfolio-prompt");
    await user.type(prompt, "/experience");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("read · Experience index")).toBeInTheDocument();
    expect(screen.getByText(/No model call used/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("streams a grounded natural-language answer and displays citations", async () => {
    vi.mocked(fetch).mockResolvedValue(aiStream());
    const user = userEvent.setup();
    render(<PortfolioApp apiUrl="https://api.test" initialMode="visual" />);

    await user.type(screen.getByTestId("portfolio-prompt"), "What has Chintan built at scale?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText(/high-throughput backend systems/i)).toBeInTheDocument();
    const sourceNav = screen.getByRole("navigation", { name: "Answer sources" });
    expect(within(sourceNav).getByRole("link", { name: /Professional summary/ })).toHaveAttribute("href", "/profile#about");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/api/chat",
      expect.objectContaining({ method: "POST" }),
    );
    const requestInit = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const requestBody = JSON.parse(String(requestInit.body));
    expect(requestBody.history).toEqual([]);
  });

  it("preserves transcript while switching between CLI and Visual modes", async () => {
    const user = userEvent.setup();
    render(<PortfolioApp apiUrl="https://api.test" initialMode="cli" />);

    await user.type(screen.getByTestId("portfolio-prompt"), "/about");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByRole("log")).toHaveTextContent("Software Development Engineer II at Amazon");

    await user.click(screen.getByRole("button", { name: /Visual/ }));
    expect(screen.getByTestId("visual-mode")).toBeInTheDocument();
    expect(screen.getByRole("log")).toHaveTextContent("Software Development Engineer II at Amazon");
  });

  it("falls back to bundled facts when the AI endpoint fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Network unavailable"));
    const user = userEvent.setup();
    render(<PortfolioApp apiUrl="https://api.test" initialMode="visual" />);

    await user.type(screen.getByTestId("portfolio-prompt"), "Tell me about Kafka");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByRole("log")).toHaveTextContent(/live AI unavailable/i));
    expect(screen.getByText(/most relevant approved, verified facts/i)).toBeInTheDocument();
  });

  it("supports CLI tab completion and ctrl+l clearing", async () => {
    const user = userEvent.setup();
    render(<PortfolioApp initialMode="cli" />);
    const prompt = screen.getByTestId("portfolio-prompt");

    await user.type(prompt, "/exp");
    fireEvent.keyDown(prompt, { key: "Tab" });
    expect(prompt).toHaveValue("/experience");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("read · Experience index")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId("portfolio-prompt"), { key: "l", ctrlKey: true });
    await waitFor(() => expect(screen.queryByText("read · Experience index")).not.toBeInTheDocument());
  });
});
