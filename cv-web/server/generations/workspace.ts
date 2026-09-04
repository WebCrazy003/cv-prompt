import { copyFile, lstat, mkdir, opendir, realpath, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { DiscoveredSkill } from "../skills/discovery.js";
import { assertContained, atomicWrite, atomicWriteJson } from "../fs-utils.js";
import type { GenerationPaths, GenerationRecord } from "./types.js";

export function generationPaths(runtimeRoot: string, id: string, skillName: string): GenerationPaths {
  const root = assertContained(join(runtimeRoot, "generations"), join(runtimeRoot, "generations", id), "generation root");
  const workspace = join(root, "workspace");
  return {
    root,
    metadata: join(root, "generation.json"),
    workspace,
    inputDirectory: join(workspace, "runtime-input"),
    jobDescription: join(workspace, "runtime-input", "job-description.txt"),
    jobQuestions: join(workspace, "runtime-input", "job-questions.json"),
    outputDirectory: join(workspace, "runtime-output"),
    cvOutput: join(workspace, "runtime-output", "cv-output.json"),
    resultDirectory: join(root, "result"),
    result: join(root, "result", "cv-output.json"),
    pdfResult: join(root, "result", "cv-output.pdf"),
    skillMarkdown: join(workspace, ".codex", "skills", skillName, "SKILL.md"),
    outputSchema: join(workspace, ".codex", "skills", skillName, "references", "cv-output.schema.json"),
  };
}

async function copyTree(source: string, destination: string, repositoryRoot: string, seen: Set<string>): Promise<void> {
  const actual = await realpath(source);
  assertContained(repositoryRoot, actual, "snapshot source");
  if (seen.has(actual)) throw new Error(`Symlink cycle detected at ${source}`);
  const info = await stat(actual);
  if (info.isFile()) {
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(actual, destination);
    return;
  }
  if (!info.isDirectory()) throw new Error(`Unsupported snapshot file type: ${source}`);
  seen.add(actual);
  await mkdir(destination, { recursive: true });
  const directory = await opendir(actual);
  for await (const entry of directory) {
    await copyTree(join(actual, entry.name), join(destination, entry.name), repositoryRoot, seen);
  }
  seen.delete(actual);
}

export async function buildWorkspace(repositoryRoot: string, record: GenerationRecord, skill: DiscoveredSkill): Promise<void> {
  const { paths } = record;
  await Promise.all([
    mkdir(paths.inputDirectory, { recursive: true }),
    mkdir(paths.outputDirectory, { recursive: true }),
    mkdir(paths.resultDirectory, { recursive: true }),
  ]);

  const copiedSkill = join(paths.workspace, ".codex", "skills", skill.name);
  await copyTree(skill.realSourcePath, copiedSkill, repositoryRoot, new Set());
  for (const repositoryRelativePath of skill.snapshotFiles) {
    const source = assertContained(repositoryRoot, join(repositoryRoot, repositoryRelativePath), "snapshot source");
    const destination = assertContained(paths.workspace, join(paths.workspace, repositoryRelativePath), "snapshot destination");
    await copyTree(source, destination, repositoryRoot, new Set());
  }

  await Promise.all([
    atomicWrite(paths.jobDescription, record.submitted.jobDescription),
    atomicWriteJson(paths.jobQuestions, { version: 1, questions: record.submitted.questions }),
  ]);
}

export async function assertWorkspaceIntegrity(record: GenerationRecord): Promise<void> {
  const expected = [record.paths.skillMarkdown, record.paths.outputSchema, record.paths.jobDescription, record.paths.jobQuestions];
  for (const path of expected) {
    assertContained(record.paths.workspace, path, "workspace file");
    const info = await lstat(path);
    if (!info.isFile()) throw new Error(`Required workspace file is not a regular file: ${relative(record.paths.workspace, path)}`);
  }
}
