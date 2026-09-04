import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import type { ApplicationTabId, CreateGenerationRequest } from "../shared/types.js";
import { versionAtLeast } from "../server/codex/version.js";
import { listModels } from "../server/codex/catalog.js";
import { assertContained } from "../server/fs-utils.js";
import { normalizeRequest } from "../server/generations/types.js";
import { GenerationStore } from "../server/generations/store.js";
import { freshThreadStartParams, safeItemActivity, THREAD_SANDBOX_MODE } from "../server/generations/coordinator.js";
import { publishedPdfFilename } from "../server/pdf/generator.js";
import { buildWorkspace } from "../server/generations/workspace.js";
import { redactSecrets } from "../server/security.js";
import { discoverSkills, type DiscoveredSkill } from "../server/skills/discovery.js";
import { compileParameterSchema } from "../server/skills/schema.js";
import { SettingsService } from "../server/settings.js";

const repositoryRoot = resolve(import.meta.dirname, "..", "..");
const temporaryDirectories: string[] = [];

async function temporary(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "cv-web-test-"));
  temporaryDirectories.push(path);
  return path;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function request(tab: ApplicationTabId = "application-1"): CreateGenerationRequest {
  return {
    applicationTabId: tab,
    jobDescription: "A role\r\nwith details",
    questions: [" First? ", "", "Second?\nMore"],
    skillName: "alex-cv-generator",
    skillParameters: {},
    model: "test-model",
    effort: "medium",
  };
}

describe("Codex catalog", () => {
  it("uses the SandboxMode spelling required by thread/start", () => {
    expect(THREAD_SANDBOX_MODE).toBe("workspace-write");
  });

  it("starts every generation as a fresh ephemeral thread", () => {
    expect(freshThreadStartParams({
      submitted: { model: "test-model" },
      paths: { workspace: "/isolated/generation" },
    } as never)).toEqual({
      model: "test-model",
      cwd: "/isolated/generation",
      approvalPolicy: "never",
      sandbox: "workspace-write",
      ephemeral: true,
    });
  });

  it("normalizes safe activity without exposing reasoning or raw commands", () => {
    expect(safeItemActivity("item/started", { type: "commandExecution", text: "cat ~/.codex/auth.json" })).toBe("Codex started a workspace command.");
    expect(safeItemActivity("item/completed", { type: "fileChange" })).toBe("Codex finished writing the generated output.");
    expect(safeItemActivity("item/started", { type: "reasoning", text: "hidden" })).toBeUndefined();
  });

  it("compares supported semantic versions", () => {
    expect(versionAtLeast("0.153.0", "0.153.0")).toBe(true);
    expect(versionAtLeast("0.154.0", "0.153.0")).toBe(true);
    expect(versionAtLeast("0.152.9", "0.153.0")).toBe(false);
  });

  it("paginates models and filters hidden and unsupported entries", async () => {
    let page = 0;
    const client = { request: async () => page++ === 0 ? {
      data: [
        { model: "visible", displayName: "Visible", hidden: false, isDefault: true, defaultReasoningEffort: "medium", supportedReasoningEfforts: [{ reasoningEffort: "low" }, { reasoningEffort: "medium" }] },
        { model: "hidden", displayName: "Hidden", hidden: true, isDefault: false, supportedReasoningEfforts: [{ reasoningEffort: "high" }] },
      ], nextCursor: "next",
    } : {
      data: [{ model: "unsupported", displayName: "Unsupported", hidden: false, isDefault: false, supportedReasoningEfforts: [{ reasoningEffort: "minimal" }] }], nextCursor: null,
    } };
    const models = await listModels(client as never);
    expect(page).toBe(2);
    expect(models).toEqual([{ model: "visible", displayName: "Visible", isDefault: true, defaultEffort: "medium", supportedEfforts: ["low", "medium"] }]);
  });
});

describe("input serialization and isolation", () => {
  it("normalizes CRLF and removes empty questions before assigning stable IDs", () => {
    expect(normalizeRequest(request())).toMatchObject({
      jobDescription: "A role\nwith details",
      questions: [{ id: "q1", text: "First?" }, { id: "q2", text: "Second?\nMore" }],
    });
  });

  it("rejects paths outside their expected parent", () => {
    expect(assertContained("/safe/root", "/safe/root/child")).toBe("/safe/root/child");
    expect(() => assertContained("/safe/root", "/safe/other")).toThrow(/outside/);
  });

  it("copies only the selected skill snapshot and writes deterministic inputs", async () => {
    const discovery = await discoverSkills(repositoryRoot, join(repositoryRoot, ".codex", "skills"), join(repositoryRoot, "spec", "cv-skill-runtime-contract.schema.json"));
    const skill = discovery.byName.get("alex-cv-generator")!;
    const runtime = await temporary();
    const store = new GenerationStore(runtime);
    await store.initialize();
    const record = await store.create(request(), skill, join(runtime, "pdf-output"));
    await buildWorkspace(repositoryRoot, record, skill);
    expect(await readFile(record.paths.jobDescription, "utf8")).toBe("A role\nwith details");
    expect(JSON.parse(await readFile(record.paths.jobQuestions, "utf8"))).toEqual({ version: 1, questions: [{ id: "q1", text: "First?" }, { id: "q2", text: "Second?\nMore" }] });
    await expect(readFile(join(record.paths.workspace, "base-profile", "steven", "candidate-profile-steven.md"))).rejects.toThrow();
    expect(await readFile(join(record.paths.workspace, "base-profile", "alex", "candidate-profile.md"), "utf8")).toContain("Alex");
  });
});

describe("skills and admission", () => {
  it("discovers all migrated skills and validates Steven parameters", async () => {
    const discovery = await discoverSkills(repositoryRoot, join(repositoryRoot, ".codex", "skills"), join(repositoryRoot, "spec", "cv-skill-runtime-contract.schema.json"));
    expect(discovery.options).toHaveLength(5);
    expect(discovery.options.every((skill) => skill.runnable)).toBe(true);
    const steven = discovery.byName.get("steven-cv-generator")!;
    expect(steven.validateParameters({ country: "UK", "LK-match": "none" })).toBe(true);
    expect(steven.validateParameters({ country: "US", "LK-match": "none" })).toBe(false);
  });

  it("rejects runtime path names and unknown submitted parameters", () => {
    expect(() => compileParameterSchema({ type: "object", properties: { cvOutputFile: { type: "string" } }, additionalProperties: false })).toThrow(/reserved/i);
    const compiled = compileParameterSchema({ type: "object", properties: { country: { type: "string", enum: ["UK"] } }, required: ["country"], additionalProperties: false });
    expect(compiled.validate({ country: "UK", extra: true })).toBe(false);
  });

  it("admits three independent tabs and rejects a fourth request without a queue", async () => {
    const runtime = await temporary();
    const store = new GenerationStore(runtime);
    await store.initialize();
    const validate = (() => true) as DiscoveredSkill["validateParameters"];
    validate.errors = null;
    const skill = { name: "alex-cv-generator", realSourcePath: "", sourcePath: "", displayName: "Alex", description: "Test", runnable: true, snapshotFiles: [], validateParameters: validate } as DiscoveredSkill;
    await store.create(request("application-1"), skill, join(runtime, "pdf-output"));
    await store.create(request("application-2"), skill, join(runtime, "pdf-output"));
    await store.create(request("application-3"), skill, join(runtime, "pdf-output"));
    await expect(store.create(request("application-1"), skill, join(runtime, "pdf-output"))).rejects.toMatchObject({ code: "generation_capacity_reached" });
    expect(store.activeCount()).toBe(3);
  });

  it("starts a fresh 30-day retention window when Keep is removed", async () => {
    const runtime = await temporary();
    const store = new GenerationStore(runtime);
    await store.initialize();
    const validate = (() => true) as DiscoveredSkill["validateParameters"];
    const skill = { name: "alex-cv-generator", realSourcePath: "", sourcePath: "", displayName: "Alex", description: "Test", runnable: true, snapshotFiles: [], validateParameters: validate } as DiscoveredSkill;
    const record = await store.create(request(), skill, join(runtime, "pdf-output"));
    await store.finish(record, "failed", "test");
    expect(Date.parse(record.expiresAt!) - Date.parse(record.retentionStartedAt!)).toBe(30 * 24 * 60 * 60 * 1_000);
    await store.setKept(record, true);
    expect(record).toMatchObject({ kept: true, expiresAt: undefined });
    await store.setKept(record, false);
    expect(Date.parse(record.expiresAt!) - Date.parse(record.retentionStartedAt!)).toBe(30 * 24 * 60 * 60 * 1_000);
  });
});

describe("PDF settings", () => {
  it("uses a clean PDF name and only adds a numeric suffix for a collision", () => {
    const result = { personNameOnCV: "Steve Onye", companyNameApplyJob: "Alpaca" };
    expect(publishedPdfFilename(result)).toBe("Steve Onye_Alpaca.pdf");
    expect(publishedPdfFilename(result, 2)).toBe("Steve Onye_Alpaca_2.pdf");
  });

  it("persists a canonical writable output directory across service restarts", async () => {
    const runtime = await temporary();
    const output = join(runtime, "published-cvs");
    const settingsPath = join(runtime, "settings.json");
    const first = new SettingsService(settingsPath);
    await first.initialize();
    expect(first.get()).toEqual({ outputDirectory: "" });
    await expect(first.save("relative/path")).rejects.toMatchObject({ code: "invalid_output_directory" });
    await expect(first.save(resolve(output).slice(0, 1))).rejects.toMatchObject({ code: "invalid_output_directory" });
    const saved = await first.save(output);
    const canonicalOutput = await realpath(output);
    expect(saved).toEqual({ outputDirectory: canonicalOutput });

    const restored = new SettingsService(settingsPath);
    await restored.initialize();
    expect(restored.requireOutputDirectory()).toBe(canonicalOutput);
  });
});

it("redacts token-like diagnostics", () => {
  expect(redactSecrets("Bearer abc.def.ghi and sk-abcdefghijklmnopqrstuvwxyz")).toBe("Bearer [REDACTED] and [REDACTED]");
});
