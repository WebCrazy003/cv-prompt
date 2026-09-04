import { glob, lstat, opendir, readFile, realpath, stat } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import { parse as parseYaml } from "yaml";
import type { ParameterSchema, SkillOption } from "../../shared/types.js";
import { assertContained } from "../fs-utils.js";
import { messageOf } from "../errors.js";
import { compileParameterSchema } from "./schema.js";

interface RuntimeContract {
  version: 1;
  runtimeParameters: ["jobDescriptionFile", "jobQuestionsFile", "cvOutputFile"];
  outputSchema: "references/cv-output.schema.json";
  candidateDataRoot: string;
  snapshotIncludes: string[];
}

export interface DiscoveredSkill extends SkillOption {
  sourcePath: string;
  realSourcePath: string;
  contract?: RuntimeContract;
  snapshotFiles: string[];
  validateParameters: ValidateFunction;
  outputSchema?: object;
}

export interface SkillDiscoveryResult {
  options: SkillOption[];
  byName: Map<string, DiscoveredSkill>;
  errors: string[];
}

function frontmatter(markdown: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  if (!match) throw new Error("SKILL.md has no YAML frontmatter.");
  const value = parseYaml(match[1]!) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("SKILL.md frontmatter is not an object.");
  return value as Record<string, unknown>;
}

async function optionalInterface(skillPath: string): Promise<{ displayName?: string; description?: string }> {
  try {
    const value = parseYaml(await readFile(join(skillPath, "agents", "openai.yaml"), "utf8")) as {
      interface?: { display_name?: unknown; short_description?: unknown };
    };
    return {
      displayName: typeof value?.interface?.display_name === "string" ? value.interface.display_name.trim() : undefined,
      description: typeof value?.interface?.short_description === "string" ? value.interface.short_description.trim() : undefined,
    };
  } catch {
    return {};
  }
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

function noParameters(): { schema: undefined; validate: ValidateFunction } {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return { schema: undefined, validate: ajv.compile({ type: "object", maxProperties: 0, additionalProperties: false }) };
}

async function snapshotMatches(repositoryRoot: string, contract: RuntimeContract): Promise<string[]> {
  const candidateRoot = assertContained(repositoryRoot, join(repositoryRoot, contract.candidateDataRoot), "candidateDataRoot");
  const candidateRealPath = await realpath(candidateRoot);
  assertContained(repositoryRoot, candidateRealPath, "candidateDataRoot");
  const found = new Set<string>();

  for (const pattern of contract.snapshotIncludes) {
    const matches: string[] = [];
    for await (const match of glob(pattern, { cwd: repositoryRoot })) {
      const absolute = assertContained(repositoryRoot, join(repositoryRoot, match), "snapshot match");
      const info = await lstat(absolute);
      const actual = await realpath(absolute);
      assertContained(repositoryRoot, actual, "snapshot symlink");
      if (match.startsWith(`base-profile${sep}`) || match.startsWith("base-profile/")) {
        assertContained(candidateRealPath, actual, "candidate snapshot match");
      }
      if (info.isFile() || (info.isSymbolicLink() && (await stat(actual)).isFile())) matches.push(match);
    }
    if (matches.length === 0) throw new Error(`snapshotIncludes pattern matched no files: ${pattern}`);
    matches.forEach((match) => found.add(match));
  }
  return [...found].sort();
}

async function inspectSkill(
  repositoryRoot: string,
  skillsRoot: string,
  contractValidator: ValidateFunction,
  directoryName: string,
): Promise<DiscoveredSkill> {
  const sourcePath = join(skillsRoot, directoryName);
  const realSourcePath = await realpath(sourcePath);
  assertContained(skillsRoot, realSourcePath, "skill directory");
  const metadata = frontmatter(await readFile(join(realSourcePath, "SKILL.md"), "utf8"));
  if (typeof metadata.name !== "string" || metadata.name.trim() === "") throw new Error("Frontmatter name is missing.");
  if (typeof metadata.description !== "string" || metadata.description.trim() === "") throw new Error("Frontmatter description is missing.");
  const name = metadata.name.trim();
  const ui = await optionalInterface(realSourcePath);
  const base: DiscoveredSkill = {
    name,
    displayName: ui.displayName || name,
    description: ui.description || metadata.description.trim(),
    runnable: false,
    sourcePath,
    realSourcePath,
    snapshotFiles: [],
    validateParameters: noParameters().validate,
  };

  try {
    const contractValue = await readJson(join(realSourcePath, "runtime.contract.json"));
    if (!contractValidator(contractValue)) throw new Error(`runtime.contract.json: ${contractValidator.errors?.map((e) => e.message).join(", ")}`);
    const contract = contractValue as RuntimeContract;
    const outputSchemaPath = assertContained(realSourcePath, join(realSourcePath, contract.outputSchema), "output schema");
    const outputSchema = await readJson(outputSchemaPath) as object;
    new Ajv2020({ allErrors: true, strict: false, formats: { email: true } }).compile(outputSchema);
    const snapshotFiles = await snapshotMatches(repositoryRoot, contract);
    let parameterSchema: ParameterSchema | undefined;
    let validateParameters = noParameters().validate;
    try {
      const compiled = compileParameterSchema(await readJson(join(realSourcePath, "ui.schema.json")));
      parameterSchema = compiled.schema;
      validateParameters = compiled.validate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return { ...base, runnable: true, contract, outputSchema, snapshotFiles, parameterSchema, validateParameters };
  } catch (error) {
    return { ...base, disabledReason: messageOf(error) };
  }
}

export async function discoverSkills(repositoryRoot: string, skillsRoot: string, contractSchemaPath: string): Promise<SkillDiscoveryResult> {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const contractValidator = ajv.compile(await readJson(contractSchemaPath) as object);
  const discovered: DiscoveredSkill[] = [];
  const errors: string[] = [];
  const directory = await opendir(skillsRoot);
  for await (const entry of directory) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    try {
      discovered.push(await inspectSkill(repositoryRoot, skillsRoot, contractValidator, entry.name));
    } catch (error) {
      errors.push(`${entry.name}: ${messageOf(error)}`);
    }
  }

  const groups = new Map<string, DiscoveredSkill[]>();
  for (const skill of discovered) groups.set(skill.name, [...(groups.get(skill.name) ?? []), skill]);
  for (const [name, duplicates] of groups) {
    if (duplicates.length < 2) continue;
    for (const skill of duplicates) {
      skill.runnable = false;
      skill.disabledReason = `Duplicate skill name: ${name}`;
    }
    errors.push(`Duplicate skill name: ${name}`);
  }

  discovered.sort((a, b) => a.displayName.localeCompare(b.displayName));
  const byName = new Map(discovered.filter((skill) => skill.runnable).map((skill) => [skill.name, skill]));
  const options = discovered.map(({ sourcePath: _source, realSourcePath: _real, contract: _contract, snapshotFiles: _files, validateParameters: _validate, outputSchema: _output, ...option }) => option);
  return { options, byName, errors };
}
