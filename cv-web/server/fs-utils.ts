import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "./errors.js";

export function assertContained(parent: string, candidate: string, label = "path"): string {
  const resolvedParent = resolve(parent);
  const resolvedCandidate = resolve(candidate);
  const relation = relative(resolvedParent, resolvedCandidate);
  if (relation === "" || (!relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && relation !== ".." && !isAbsolute(relation))) {
    return resolvedCandidate;
  }
  throw new AppError(400, "unsafe_path", `${label} resolves outside its allowed root.`);
}

export async function atomicWrite(path: string, value: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, value, { flag: "wx", mode: 0o600 });
  await rename(temporary, path);
}

export async function atomicWriteJson(path: string, value: unknown): Promise<void> {
  await atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}
