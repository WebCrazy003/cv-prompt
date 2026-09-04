import { buildApp } from "./app.js";
import { CodexAppServerClient } from "./codex/client.js";
import { loadConfig } from "./config.js";
import { messageOf, AppError } from "./errors.js";

const config = await loadConfig();
const client = new CodexAppServerClient(config.codexCommand);
const services = await buildApp(config, client);

try {
  await services.bootstrap.initialize();
} catch (error) {
  services.bootstrap.diagnostics = [messageOf(error)];
  if (error instanceof AppError && error.code !== "codex_not_found" && error.code !== "codex_upgrade_required") {
    process.stderr.write(`Bootstrap failed: ${messageOf(error)}\n`);
  }
}

let restarted = false;
client.on("unexpectedExit", () => {
  if (restarted) return;
  restarted = true;
  setTimeout(() => {
    void client.start().then(() => services.bootstrap.refresh()).catch((error) => {
      services.bootstrap.diagnostics = [`Codex restart failed: ${messageOf(error)}`];
    });
  }, 500).unref();
});

await services.app.listen({ host: config.host, port: config.port });
process.stdout.write(`CV Job Application Generator: ${config.origin}\n`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    client.close();
    void services.app.close().finally(() => process.exit(0));
  });
}
