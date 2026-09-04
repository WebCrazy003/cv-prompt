import { access, readdir, realpath, stat } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function locateAppRoot(start: string): string {
  let candidate = resolve(start);
  while (true) {
    if (existsSync(join(candidate, "package.json"))) return candidate;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("Could not locate cv-web/package.json.");
    candidate = parent;
  }
}

export const APP_ROOT = locateAppRoot(dirname(fileURLToPath(import.meta.url)));

export interface AppConfig {
  appRoot: string;
  repositoryRoot: string;
  skillsRoot: string;
  contractSchemaPath: string;
  runtimeRoot: string;
  host: "127.0.0.1";
  port: number;
  origin: string;
  codexCommand: string;
  minimumCodexVersion: string;
  pdfGeneratorRoot: string;
  pdfPythonCommand: string;
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function vscodeCodexBinPrefix(): string | undefined {
  if (process.platform === "darwin") return "macos-";
  if (process.platform === "linux") return "linux-";
  if (process.platform === "win32") return "windows-";
  return undefined;
}

export async function resolveCodexCommand(env: NodeJS.ProcessEnv = process.env, homeDirectory = homedir()): Promise<string> {
  if (env.CODEX_COMMAND) return env.CODEX_COMMAND;

  const executableName = process.platform === "win32" ? "codex.exe" : "codex";
  for (const directory of (env.PATH ?? "").split(delimiter).filter(Boolean)) {
    const candidate = join(directory, executableName);
    if (await isExecutable(candidate)) return candidate;
  }

  for (const candidate of [
    join(homeDirectory, ".local", "bin", executableName),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
  ]) {
    if (await isExecutable(candidate)) return candidate;
  }

  const extensionRoot = join(homeDirectory, ".vscode", "extensions");
  const binPrefix = vscodeCodexBinPrefix();
  if (binPrefix) {
    try {
      const extensions = (await readdir(extensionRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("openai.chatgpt-"))
        .map((entry) => entry.name)
        .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
      for (const extension of extensions) {
        const extensionBinRoot = join(extensionRoot, extension, "bin");
        const binDirectories = (await readdir(extensionBinRoot, { withFileTypes: true }))
          .filter((entry) => entry.isDirectory() && entry.name.startsWith(binPrefix))
          .map((entry) => entry.name);
        for (const binDirectory of binDirectories) {
          const candidate = join(extensionBinRoot, binDirectory, executableName);
          if (await isExecutable(candidate)) return candidate;
        }
      }
    } catch {
      // The VS Code extension is an optional fallback.
    }
  }

  return executableName;
}

export async function loadConfig(env: NodeJS.ProcessEnv = process.env): Promise<AppConfig> {
  const configuredRoot = env.CV_REPOSITORY_ROOT ?? resolve(APP_ROOT, "..");
  const repositoryRoot = await realpath(configuredRoot);
  const rootStat = await stat(repositoryRoot);
  if (!rootStat.isDirectory()) throw new Error(`Repository root is not a directory: ${repositoryRoot}`);

  const skillsRoot = join(repositoryRoot, ".codex", "skills");
  const contractSchemaPath = join(repositoryRoot, "spec", "cv-skill-runtime-contract.schema.json");
  await Promise.all([
    access(skillsRoot, constants.R_OK),
    access(contractSchemaPath, constants.R_OK),
  ]);

  const port = Number.parseInt(env.CV_WEB_PORT ?? "4317", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid CV_WEB_PORT: ${env.CV_WEB_PORT ?? ""}`);
  }

  return {
    appRoot: APP_ROOT,
    repositoryRoot,
    skillsRoot,
    contractSchemaPath,
    runtimeRoot: join(repositoryRoot, ".cv-web-runtime"),
    host: "127.0.0.1",
    port,
    origin: env.CV_WEB_ORIGIN ?? `http://127.0.0.1:${port}`,
    codexCommand: await resolveCodexCommand(env),
    minimumCodexVersion: "0.153.0",
    pdfGeneratorRoot: join(APP_ROOT, "pdf-generator"),
    pdfPythonCommand: env.CV_PDF_PYTHON ?? (process.platform === "darwin" ? "/usr/bin/python3" : "python3"),
  };
}
