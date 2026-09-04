import { closeSync, openSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(projectRoot, "..");
const runtimeRoot = join(repositoryRoot, ".cv-web-runtime");
const pidPath = join(runtimeRoot, "cv-studio.pid.json");
const logPath = join(runtimeRoot, "cv-studio.log");
const serverEntry = join(projectRoot, "dist", "server", "server", "index.js");
const appUrl = "http://127.0.0.1:4317";

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

async function readPidRecord() {
  try {
    const record = JSON.parse(await readFile(pidPath, "utf8"));
    return Number.isInteger(record.pid) && record.pid > 1 ? record : undefined;
  } catch {
    return undefined;
  }
}

async function clearPidFile() {
  try {
    await unlink(pidPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function runningInstance() {
  try {
    const response = await fetch(`${appUrl}/api/runtime`, { signal: AbortSignal.timeout(1_000) });
    if (!response.ok) return undefined;
    const runtime = await response.json();
    if (runtime.application !== "cv-job-application-generator" || runtime.projectRoot !== projectRoot || !Number.isInteger(runtime.pid) || runtime.pid <= 1) return undefined;
    process.kill(runtime.pid, 0);
    const pidRecord = await readPidRecord();
    return { pid: runtime.pid, managed: pidRecord?.pid === runtime.pid };
  } catch {
    return undefined;
  }
}

function stopSignalTarget(running) {
  if (running.managed) return -running.pid;
  const groupResult = spawnSync("/bin/ps", ["-o", "pgid=", "-p", String(running.pid)], { encoding: "utf8" });
  const groupId = Number.parseInt(groupResult.stdout.trim(), 10);
  if (!Number.isInteger(groupId) || groupId <= 1) return running.pid;
  const leaderResult = spawnSync("/bin/ps", ["-o", "command=", "-p", String(groupId)], { encoding: "utf8" });
  if (/^npm run dev(?::server)?$/.test(leaderResult.stdout.trim())) return -groupId;
  return running.pid;
}

async function start() {
  const running = await runningInstance();
  if (running) {
    console.log(`CV Studio is already running (PID ${running.pid}).`);
    spawn("/usr/bin/open", [appUrl], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  await clearPidFile();
  try {
    const response = await fetch(appUrl, { signal: AbortSignal.timeout(1_000) });
    if (!response.ok) throw new Error();
    throw new Error(`Something is already responding at ${appUrl}; it was not started by this shortcut.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already responding")) throw error;
  }

  console.log("Building CV Studio…");
  const build = spawnSync("npm", ["run", "build"], { cwd: projectRoot, stdio: "inherit" });
  if (build.status !== 0) throw new Error("The build failed. The project was not started.");

  await mkdir(runtimeRoot, { recursive: true });
  const logFd = openSync(logPath, "a");
  const child = spawn(process.execPath, [serverEntry], {
    cwd: projectRoot,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();
  closeSync(logFd);
  await writeFile(pidPath, `${JSON.stringify({ pid: child.pid, startedAt: new Date().toISOString() }, null, 2)}\n`, { mode: 0o600 });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const started = await runningInstance();
    if (started?.pid === child.pid) {
      console.log(`CV Studio started (PID ${child.pid}).`);
      spawn("/usr/bin/open", [appUrl], { detached: true, stdio: "ignore" }).unref();
      return;
    }
    try {
      process.kill(child.pid, 0);
    } catch {
      break;
    }
    await wait(500);
  }
  await clearPidFile();
  throw new Error(`CV Studio did not start. Check ${logPath}`);
}

async function stop() {
  const running = await runningInstance();
  if (!running) {
    await clearPidFile();
    console.log("CV Studio is not running.");
    return;
  }

  console.log(`Stopping CV Studio (PID ${running.pid})…`);
  process.kill(stopSignalTarget(running), "SIGTERM");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await wait(250);
    if (!await runningInstance()) {
      await clearPidFile();
      console.log("CV Studio stopped.");
      return;
    }
  }
  throw new Error("CV Studio is still stopping. Run this shortcut again in a few seconds.");
}

const action = process.argv[2] ?? "toggle";
try {
  if (action === "start") await start();
  else if (action === "stop") await stop();
  else if (action === "status") console.log(await runningInstance() ? "CV Studio is running." : "CV Studio is stopped.");
  else if (action === "toggle") await (await runningInstance() ? stop() : start());
  else throw new Error(`Unknown action: ${action}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
