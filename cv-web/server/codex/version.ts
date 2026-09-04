import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AppError } from "../errors.js";

const execFileAsync = promisify(execFile);

export interface CodexVersion {
  raw: string;
  version: string;
}

function components(value: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value);
  if (!match) throw new Error(`Invalid semantic version: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function versionAtLeast(actual: string, minimum: string): boolean {
  const a = components(actual);
  const b = components(minimum);
  for (let index = 0; index < 3; index += 1) {
    if (a[index]! > b[index]!) return true;
    if (a[index]! < b[index]!) return false;
  }
  return true;
}

export async function readCodexVersion(command: string, minimum: string): Promise<CodexVersion> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(command, ["--version"], { timeout: 10_000 }));
  } catch {
    throw new AppError(503, "codex_not_found", "Codex CLI is unavailable. Install Codex and run `codex login`.");
  }
  const raw = stdout.trim();
  const match = /(\d+\.\d+\.\d+)/.exec(raw);
  if (!match) throw new AppError(503, "codex_version_unknown", `Could not parse Codex version: ${raw}`);
  if (!versionAtLeast(match[1]!, minimum)) {
    throw new AppError(503, "codex_upgrade_required", `Codex ${minimum} or newer is required; installed: ${match[1]}.`);
  }
  return { raw, version: match[1]! };
}
