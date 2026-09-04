// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "../client/src/App";

const bootstrap = {
  codexVersion: "codex-cli 0.153.0",
  capacity: { active: 0, limit: 2 },
  auth: { authenticated: true, eligible: true, authMode: "chatgpt", planType: "plus" },
  limits: { jobDescription: 100_000, question: 10_000, questions: 50 },
  models: [{ model: "model-1", displayName: "Model One", isDefault: true, supportedEfforts: ["low", "medium", "high"], defaultEffort: "medium" }],
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
