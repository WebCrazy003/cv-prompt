// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App, ResultPanel } from "../client/src/App";

const bootstrap = {
  codexVersion: "codex-cli 0.153.0",
  capacity: { active: 0, limit: 5 },
  auth: { authenticated: true, eligible: true, authMode: "chatgpt", email: "person@example.com", planType: "plus" },
  limits: { jobDescription: 100_000, question: 10_000, questions: 50 },
  models: [
    { model: "model-1", displayName: "Model One", isDefault: true, supportedEfforts: ["low", "medium", "high"], defaultEffort: "medium" },
    { model: "model-2", displayName: "Model Two", isDefault: false, supportedEfforts: ["medium", "high"], defaultEffort: "high" },
  ],
  skills: [{
    name: "steven-cv-generator", displayName: "Steven CV Generator", description: "Tailor Steven's CV", runnable: true,
    parameterSchema: {
      type: "object", additionalProperties: false, required: ["country", "LK-match"],
      properties: {
        country: { type: "string", title: "Country", enum: ["poland", "UK"] },
        "LK-match": { type: "string", title: "LinkedIn match", enum: ["none", "LK-match"] },
      },
    },
  }],
};

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.stubGlobal("sessionStorage", new MemoryStorage());
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(bootstrap), { status: 200, headers: { "Content-Type": "application/json", "x-cv-session-token": "test-token" } })));
  vi.stubGlobal("EventSource", class { addEventListener() {} close() {} });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("renders five independent application tabs", async () => {
  render(<App />);
  await screen.findByText("ChatGPT · plus");
  expect(screen.getByText("Application 1")).toBeInTheDocument();
  expect(screen.getByText("Application 2")).toBeInTheDocument();
  expect(screen.getByText("Application 3")).toBeInTheDocument();
  expect(screen.getByText("Application 4")).toBeInTheDocument();
  expect(screen.getByText("Application 5")).toBeInTheDocument();
});

it("starts with exactly five questions and can add another", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("ChatGPT · plus");
  expect(screen.getAllByLabelText(/^Question \d+$/)).toHaveLength(5);
  await user.click(screen.getByRole("button", { name: "+ Add question" }));
  expect(screen.getAllByLabelText(/^Question \d+$/)).toHaveLength(6);
});

it("renders the discovered Steven parameter controls", async () => {
  const user = userEvent.setup();
  render(<App />);
  const skill = await screen.findByLabelText(/CV skill/);
  await user.selectOptions(skill, "steven-cv-generator");
  expect(screen.getByLabelText(/Country/)).toBeInTheDocument();
  expect(screen.getByLabelText(/LinkedIn match/)).toBeInTheDocument();
});

it("persists a selected model and effort as defaults for a new session", async () => {
  const user = userEvent.setup();
  const first = render(<App />);
  const model = await screen.findByLabelText(/Model/);
  await user.selectOptions(model, "model-2");
  await user.click(screen.getByLabelText("High"));
  expect(JSON.parse(localStorage.getItem("cv-web:preferences:v1")!)).toMatchObject({ model: "model-2", effort: "high" });

  first.unmount();
  sessionStorage.clear();
  render(<App />);
  await waitFor(() => expect(screen.getByLabelText(/Model/)).toHaveValue("model-2"));
  expect(screen.getByLabelText("High")).toBeChecked();
});

it("resets a terminal tab to five blank questions while preserving defaults", async () => {
  sessionStorage.setItem("cv-web:draft:application-1:v1", JSON.stringify({
    jobDescription: "Old job", questions: ["One", "Two", "", "", ""], skillName: "steven-cv-generator",
    skillParameters: { country: "UK", "LK-match": "none" }, model: "model-1", effort: "high", generationId: "generation-1",
  }));
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes("/api/generations/generation-1")) return new Response(JSON.stringify({
      generation: { id: "generation-1", applicationTabId: "application-1", skillName: "steven-cv-generator", model: "model-1", effort: "high", status: "failed", createdAt: new Date().toISOString(), error: "test", resultAvailable: false, kept: false },
      events: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(bootstrap), { status: 200, headers: { "Content-Type": "application/json", "x-cv-session-token": "test-token" } });
  }));
  const user = userEvent.setup();
  render(<App />);
  const reset = await screen.findByRole("button", { name: "Reset application" });
  expect(reset.closest(".application-actions")?.previousElementSibling).toBe(screen.getByRole("navigation", { name: "Applications" }));
  await user.click(reset);
  expect(screen.getByLabelText(/Job description/)).toHaveValue("");
  expect(screen.getAllByLabelText(/^Question \d+$/)).toHaveLength(5);
  expect(screen.getByText(/Application reset\. Your saved defaults were preserved\./)).toBeInTheDocument();
});

it("notifies after copying a result action", async () => {
  const writeText = vi.fn(async () => undefined);
  const onNotify = vi.fn();
  const user = userEvent.setup();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<ResultPanel result={{ personNameOnCV: "Alex", summary: "Summary", jobQuestionAnswers: [{ question: "Why?", answer: "Because." }] }} generationId="generation-1" pdfPath="/CVs/26_09_04/Alex_Company.pdf" onNotify={onNotify} />);
  expect(screen.getByText("/CVs/26_09_04/Alex_Company.pdf")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Download CV PDF" })).toHaveAttribute("href", "/api/generations/generation-1/pdf");
  await user.click(screen.getByRole("button", { name: "Copy CV JSON" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
  expect(onNotify).toHaveBeenCalledWith("CV JSON copied to clipboard.");
});

it("loads and persists the default PDF output directory from Settings", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path === "/api/settings" && init?.method === "POST") {
      return new Response(init.body as string, { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (path === "/api/settings") {
      return new Response(JSON.stringify({ outputDirectory: "/existing/CVs" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (path === "/api/account/usage") {
      return new Response(JSON.stringify({
        account: { email: "person@example.com", planType: "plus" },
        windows: [
          { label: "5-hour limit", usedPercent: 33, remainingPercent: 67 },
          { label: "Weekly limit", usedPercent: 5, remainingPercent: 95 },
        ],
        fetchedAt: "2026-09-04T08:00:00.000Z",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(bootstrap), { status: 200, headers: { "Content-Type": "application/json", "x-cv-session-token": "test-token" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Settings" }));
  const directory = screen.getByLabelText(/Default CV output directory/);
  expect(directory).toHaveValue("/existing/CVs");
  await user.clear(directory);
  await user.type(directory, "/new/CVs");
  await user.click(screen.getByRole("button", { name: "Save output directory" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/settings", expect.objectContaining({ method: "POST", body: JSON.stringify({ outputDirectory: "/new/CVs" }) })));
  expect(await screen.findByRole("status")).toHaveTextContent("Default CV output directory saved.");
});

it("shows fresh used and remaining allowance percentages from the signed-in Codex account", async () => {
  const user = userEvent.setup();
  const usage = {
    account: { email: "person@example.com", planType: "plus" },
    windows: [
      { label: "5-hour limit", usedPercent: 33, remainingPercent: 67, resetsAt: "2026-09-04T12:00:00.000Z" },
      { label: "Weekly limit", usedPercent: 5, remainingPercent: 95, resetsAt: "2026-09-11T12:00:00.000Z" },
    ],
    fetchedAt: "2026-09-04T08:00:00.000Z",
  };
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path === "/api/settings") return new Response(JSON.stringify({ outputDirectory: "/existing/CVs" }), { status: 200, headers: { "Content-Type": "application/json" } });
    if (path === "/api/account/usage") return new Response(JSON.stringify(usage), { status: 200, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(bootstrap), { status: 200, headers: { "Content-Type": "application/json", "x-cv-session-token": "test-token" } });
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Settings" }));
  expect(await screen.findByText("33%")).toBeInTheDocument();
  expect(screen.getByText("67% remaining")).toBeInTheDocument();
  expect(screen.getByText("5%")).toBeInTheDocument();
  expect(screen.getByText("95% remaining")).toBeInTheDocument();
  expect(screen.getByText("person@example.com")).toBeInTheDocument();
  expect(screen.getByText("5-hour limit")).toBeInTheDocument();
  expect(screen.getByText("Weekly limit")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/account/usage", expect.objectContaining({ cache: "no-store" }));

  await user.click(screen.getByRole("button", { name: "Refresh usage" }));
  await waitFor(() => expect(fetchMock.mock.calls.filter(([input]) => String(input) === "/api/account/usage")).toHaveLength(2));
});
