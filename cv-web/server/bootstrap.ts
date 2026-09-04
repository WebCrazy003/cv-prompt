import { GENERATION_CAPACITY, type BootstrapResponse, type ModelOption } from "../shared/types.js";
import { listModels, readAccount } from "./codex/catalog.js";
import type { CodexAppServerClient } from "./codex/client.js";
import { readCodexVersion } from "./codex/version.js";
import type { AppConfig } from "./config.js";
import { discoverSkills, type DiscoveredSkill } from "./skills/discovery.js";

export class BootstrapService {
  codexVersion = "unknown";
  auth: BootstrapResponse["auth"] = { authenticated: false, eligible: false };
  models: ModelOption[] = [];
  skillOptions: BootstrapResponse["skills"] = [];
  skillsByName = new Map<string, DiscoveredSkill>();
  diagnostics: string[] = [];

  constructor(private readonly config: AppConfig, private readonly client: CodexAppServerClient) {}

  async initialize(): Promise<void> {
    const version = await readCodexVersion(this.config.codexCommand, this.config.minimumCodexVersion);
    this.codexVersion = version.raw;
    await this.client.start();
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.diagnostics = [];
    const discovery = await discoverSkills(this.config.repositoryRoot, this.config.skillsRoot, this.config.contractSchemaPath);
    this.skillOptions = discovery.options;
    this.skillsByName = discovery.byName;
    this.diagnostics.push(...discovery.errors);
    this.auth = await readAccount(this.client);
    this.models = this.auth.eligible ? await listModels(this.client) : [];
  }

  response(active: number): BootstrapResponse & { diagnostics: string[] } {
    return {
      codexVersion: this.codexVersion,
      capacity: { active, limit: GENERATION_CAPACITY },
      auth: this.auth,
      models: this.models,
      skills: this.skillOptions,
      limits: { jobDescription: 100_000, question: 10_000, questions: 50 },
      diagnostics: this.diagnostics,
    };
  }
}
