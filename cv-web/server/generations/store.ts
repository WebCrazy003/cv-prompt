import { randomUUID } from "node:crypto";
import { mkdir, opendir, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import type { ApplicationGenerationStatus, CreateGenerationRequest, GenerationEvent, GenerationSummary } from "../../shared/types.js";
import { AppError, messageOf } from "../errors.js";
import { atomicWriteJson } from "../fs-utils.js";
import type { DiscoveredSkill } from "../skills/discovery.js";
import { generationPaths } from "./workspace.js";
import { normalizeRequest, type GenerationRecord, type PersistedGeneration } from "./types.js";

const ACTIVE = new Set<ApplicationGenerationStatus>([
  "preparing", "starting_codex", "running", "waiting_for_input", "cancelling", "validating",
]);
const TERMINAL = new Set<ApplicationGenerationStatus>(["completed", "failed", "cancelled"]);
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1_000;

export class GenerationStore {
  readonly records = new Map<string, GenerationRecord>();
  private readonly listeners = new Map<string, Set<(event: GenerationEvent) => void>>();

  constructor(private readonly runtimeRoot: string) {}

  async initialize(): Promise<void> {
    const generationsRoot = join(this.runtimeRoot, "generations");
    await mkdir(generationsRoot, { recursive: true });
    const directory = await opendir(generationsRoot);
    for await (const entry of directory) {
      if (!entry.isDirectory()) continue;
      try {
        const parsed = JSON.parse(await readFile(join(generationsRoot, entry.name, "generation.json"), "utf8")) as PersistedGeneration;
        const record = { ...parsed, runtime: {}, events: parsed.events ?? [], nextEventId: parsed.nextEventId ?? 1 } as GenerationRecord;
        this.records.set(record.id, record);
        if (ACTIVE.has(record.status)) await this.finish(record, "failed", "The backend restarted while this generation was active. Please retry.");
      } catch (error) {
        process.stderr.write(`Could not recover generation ${entry.name}: ${messageOf(error)}\n`);
      }
    }
  }

  activeCount(): number {
    return [...this.records.values()].filter((record) => ACTIVE.has(record.status)).length;
  }

  isActive(record: GenerationRecord): boolean {
    return ACTIVE.has(record.status);
  }

  isTerminal(record: GenerationRecord): boolean {
    return TERMINAL.has(record.status);
  }

  async create(request: CreateGenerationRequest, skill: DiscoveredSkill, pdfOutputDirectory: string): Promise<GenerationRecord> {
    if (this.activeCount() >= 2) {
      throw new AppError(409, "generation_capacity_reached", "Both generation slots are active. No generation was queued.");
    }
    if ([...this.records.values()].some((record) => record.applicationTabId === request.applicationTabId && ACTIVE.has(record.status))) {
      throw new AppError(409, "application_tab_busy", "This application tab already owns an active generation.");
    }
    const id = randomUUID();
    const record: GenerationRecord = {
      id,
      applicationTabId: request.applicationTabId,
      status: "preparing",
      createdAt: new Date().toISOString(),
      cancelRequested: false,
      kept: false,
      submitted: normalizeRequest(request),
      pdfOutputDirectory,
      paths: generationPaths(this.runtimeRoot, id, skill.name),
      events: [],
      nextEventId: 1,
      runtime: { skill, validateParameters: skill.validateParameters },
    };
    this.records.set(id, record);
    await mkdir(record.paths.root, { recursive: true });
    await this.persist(record);
    await this.emit(record, "status", { status: record.status });
    return record;
  }

  get(id: string): GenerationRecord {
    const record = this.records.get(id);
    if (!record) throw new AppError(404, "generation_not_found", "Generation not found.");
    return record;
  }

  async transition(record: GenerationRecord, status: ApplicationGenerationStatus, data: Record<string, unknown> = {}): Promise<void> {
    record.status = status;
    await this.persist(record);
    await this.emit(record, "status", { status, ...data });
  }

  async finish(record: GenerationRecord, status: "completed" | "failed" | "cancelled", error?: string): Promise<void> {
    const now = new Date();
    record.status = status;
    record.completedAt = now.toISOString();
    record.error = error;
    record.pendingInput = undefined;
    record.retentionStartedAt = now.toISOString();
    record.expiresAt = new Date(now.getTime() + THIRTY_DAYS).toISOString();
    await this.persist(record);
    await this.emit(record, status === "completed" ? "completed" : "error", { status, error });
  }

  async emit(record: GenerationRecord, type: GenerationEvent["type"], data: Record<string, unknown>): Promise<GenerationEvent> {
    const event: GenerationEvent = { id: record.nextEventId++, type, createdAt: new Date().toISOString(), data };
    record.events.push(event);
    if (record.events.length > 500) record.events.shift();
    await this.persist(record);
    for (const listener of this.listeners.get(record.id) ?? []) listener(event);
    return event;
  }

  subscribe(id: string, listener: (event: GenerationEvent) => void): () => void {
    const listeners = this.listeners.get(id) ?? new Set();
    listeners.add(listener);
    this.listeners.set(id, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(id);
    };
  }

  async persist(record: GenerationRecord): Promise<void> {
    const { runtime: _runtime, ...persisted } = record;
    await atomicWriteJson(record.paths.metadata, persisted);
  }

  summary(record: GenerationRecord): GenerationSummary {
    return {
      id: record.id,
      applicationTabId: record.applicationTabId,
      skillName: record.submitted.skillName,
      model: record.submitted.model,
      effort: record.submitted.effort,
      status: record.status,
      codexStatus: record.codexStatus,
      createdAt: record.createdAt,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      error: record.error,
      resultAvailable: record.status === "completed" && record.result !== undefined,
      pdfAvailable: record.status === "completed" && record.pdf !== undefined,
      pdfPath: record.status === "completed" ? record.pdf?.path : undefined,
      pdfWarning: record.status === "completed" ? record.pdf?.warning : undefined,
      kept: record.kept,
      retentionStartedAt: record.retentionStartedAt,
      expiresAt: record.expiresAt,
    };
  }

  async setKept(record: GenerationRecord, kept: boolean): Promise<void> {
    if (!this.isTerminal(record)) throw new AppError(409, "generation_active", "Only a terminal generation can be kept.");
    record.kept = kept;
    if (kept) {
      record.retentionStartedAt = undefined;
      record.expiresAt = undefined;
    } else {
      const now = new Date();
      record.retentionStartedAt = now.toISOString();
      record.expiresAt = new Date(now.getTime() + THIRTY_DAYS).toISOString();
    }
    await this.persist(record);
  }

  async deleteTerminal(record: GenerationRecord): Promise<void> {
    if (!this.isTerminal(record)) throw new AppError(409, "generation_active", "An active generation cannot be deleted.");
    const generationsRoot = join(this.runtimeRoot, "generations");
    const cleanupRoot = join(this.runtimeRoot, "cleanup");
    await mkdir(cleanupRoot, { recursive: true });
    const expectedRoot = join(generationsRoot, record.id);
    if (record.paths.root !== expectedRoot) throw new AppError(500, "unsafe_generation_path", "Generation path failed its safety check.");
    const staged = join(cleanupRoot, `${record.id}.${randomUUID()}`);
    await rename(expectedRoot, staged);
    this.records.delete(record.id);
    this.listeners.delete(record.id);
    try {
      await rm(staged, { recursive: true, force: true });
    } catch (error) {
      process.stderr.write(`Staged cleanup failed for ${record.id}: ${messageOf(error)}\n`);
    }
  }

  async clearUnkeptTerminal(): Promise<number> {
    const targets = [...this.records.values()].filter((record) => this.isTerminal(record) && !record.kept);
    for (const record of targets) await this.deleteTerminal(record);
    return targets.length;
  }

  async cleanupExpired(now = Date.now()): Promise<number> {
    const targets = [...this.records.values()].filter((record) => this.isTerminal(record) && !record.kept && record.expiresAt && Date.parse(record.expiresAt) <= now);
    for (const record of targets) await this.deleteTerminal(record);
    return targets.length;
  }
}
