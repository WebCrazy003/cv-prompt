import { access, realpath, stat } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
    codexCommand: env.CODEX_COMMAND ?? "codex",
    minimumCodexVersion: "0.153.0",
    pdfGeneratorRoot: join(APP_ROOT, "pdf-generator"),
    pdfPythonCommand: env.CV_PDF_PYTHON ?? (process.platform === "darwin" ? "/usr/bin/python3" : "python3"),
  };
}
