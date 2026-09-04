import { randomBytes } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { ZodError } from "zod";
import type { CreateGenerationRequest } from "../shared/types.js";
import { BootstrapService } from "./bootstrap.js";
import type { CodexAppServerClient } from "./codex/client.js";
import type { AppConfig } from "./config.js";
import { AppError, messageOf } from "./errors.js";
import { GenerationCoordinator } from "./generations/coordinator.js";
import { GenerationStore } from "./generations/store.js";
import { authorizeMutation, redactSecrets, SESSION_HEADER } from "./security.js";
import { createGenerationSchema, inputResponseSchema } from "./validation.js";

export interface AppServices {
  app: FastifyInstance;
  bootstrap: BootstrapService;
  store: GenerationStore;
  coordinator: GenerationCoordinator;
  sessionToken: string;
}

export async function buildApp(config: AppConfig, client: CodexAppServerClient): Promise<AppServices> {
  const app = fastify({ logger: true, bodyLimit: 1_200_000 });
  const sessionToken = randomBytes(32).toString("base64url");
  const store = new GenerationStore(config.runtimeRoot);
  await store.initialize();
  await store.cleanupExpired();
  const cleanupInterval = setInterval(() => void store.cleanupExpired(), 24 * 60 * 60 * 1_000);
  cleanupInterval.unref();
  app.addHook("onClose", async () => clearInterval(cleanupInterval));
  const coordinator = new GenerationCoordinator(store, client, config.repositoryRoot);
  const bootstrap = new BootstrapService(config, client);
  const allowedOrigins = [...new Set([config.origin, `http://127.0.0.1:${config.port}`, "http://127.0.0.1:5173"] )];

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      void reply.status(error.statusCode).send({ code: error.code, message: redactSecrets(error.message), details: error.details });
      return;
    }
    if (error instanceof ZodError) {
      void reply.status(400).send({ code: "invalid_request", message: "The request is invalid.", details: error.issues });
      return;
    }
    app.log.error(redactSecrets(messageOf(error)));
    void reply.status(500).send({ code: "internal_error", message: "An unexpected local error occurred." });
  });

  app.addHook("preHandler", async (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      authorizeMutation(request, allowedOrigins, sessionToken);
    }
  });

  app.get("/api/bootstrap", async (_request, reply) => {
    reply.header(SESSION_HEADER, sessionToken);
    return bootstrap.response(store.activeCount());
  });

  app.post("/api/bootstrap/refresh", async () => {
    await bootstrap.initialize();
    return bootstrap.response(store.activeCount());
  });

  app.post("/api/generations", async (request, reply) => {
    const body = createGenerationSchema.parse(request.body) as CreateGenerationRequest;
    if (!bootstrap.auth.eligible) throw new AppError(409, "chatgpt_auth_required", "ChatGPT sign-in is required. Run `codex logout`, then `codex login`.");
    const model = bootstrap.models.find((item) => item.model === body.model);
    if (!model) throw new AppError(400, "model_unavailable", "The selected model is no longer available. Refresh models.");
    if (!model.supportedEfforts.includes(body.effort)) throw new AppError(400, "effort_unsupported", "The selected model does not support this reasoning effort.");
    const skill = bootstrap.skillsByName.get(body.skillName);
    if (!skill) throw new AppError(400, "skill_unavailable", "The selected skill is missing or incompatible. Refresh skills.");
    if (!skill.validateParameters(body.skillParameters)) {
      throw new AppError(400, "invalid_skill_parameters", "Skill parameters are invalid.", skill.validateParameters.errors);
    }
    const record = await coordinator.create(body, skill);
    return reply.status(202).send({ generationId: record.id, status: "preparing" });
  });

  app.get<{ Params: { id: string } }>("/api/generations/:id", async (request) => {
    const record = store.get(request.params.id);
    return {
      generation: store.summary(record),
      pendingInput: record.pendingInput ? {
        requestId: record.pendingInput.requestId,
        questions: record.pendingInput.questions,
        deadline: record.pendingInput.deadline,
      } : undefined,
      events: record.events,
      result: record.status === "completed" ? record.result : undefined,
    };
  });

  app.get<{ Params: { id: string } }>("/api/generations/:id/events", async (request, reply) => {
    const record = store.get(request.params.id);
    const lastHeader = request.headers["last-event-id"];
    const lastId = typeof lastHeader === "string" ? Number.parseInt(lastHeader, 10) || 0 : 0;
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const write = (event: (typeof record.events)[number]) => {
      reply.raw.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    };
    record.events.filter((event) => event.id > lastId).forEach(write);
    const unsubscribe = store.subscribe(record.id, write);
    const heartbeat = setInterval(() => reply.raw.write(": heartbeat\n\n"), 20_000);
    request.raw.once("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.post<{ Params: { id: string } }>("/api/generations/:id/cancel", async (request) => {
    const record = store.get(request.params.id);
    await coordinator.cancel(record);
    return { generation: store.summary(record) };
  });

  app.post<{ Params: { id: string } }>("/api/generations/:id/input-response", async (request) => {
    const body = inputResponseSchema.parse(request.body);
    const record = store.get(request.params.id);
    if (body.action === "cancel") await coordinator.cancel(record, "Interactive input was cancelled.");
    else await coordinator.respondToInput(record, body.requestId, body.answers ?? {});
    return { generation: store.summary(record) };
  });

  app.post<{ Params: { id: string } }>("/api/generations/:id/keep", async (request) => {
    const body = request.body as { kept?: unknown };
    if (typeof body?.kept !== "boolean") throw new AppError(400, "invalid_request", "kept must be a boolean.");
    const record = store.get(request.params.id);
    await store.setKept(record, body.kept);
    return { generation: store.summary(record) };
  });

  app.delete<{ Params: { id: string } }>("/api/generations/:id", async (request, reply) => {
    const record = store.get(request.params.id);
    await store.deleteTerminal(record);
    return reply.status(204).send();
  });

  app.delete<{ Querystring: { scope?: string } }>("/api/generations", async (request) => {
    if (request.query.scope !== "unkept-terminal") throw new AppError(400, "invalid_cleanup_scope", "Only unkept-terminal cleanup is supported.");
    return { deleted: await store.clearUnkeptTerminal() };
  });

  app.get<{ Params: { id: string } }>("/api/generations/:id/download", async (request, reply) => {
    const record = store.get(request.params.id);
    if (record.status !== "completed" || record.result === undefined) throw new AppError(404, "result_not_found", "A validated result is not available.");
    reply.header("Content-Type", "application/json; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename=\"cv-output-${record.id}.json\"`);
    return readFile(record.paths.result);
  });

  const clientDirectory = join(config.appRoot, "dist", "client");
  try {
    await access(clientDirectory);
    await app.register(fastifyStatic, { root: clientDirectory, wildcard: false });
    app.get("/*", async (_request, reply) => reply.sendFile("index.html"));
  } catch {
    app.get("/", async () => ({ name: "CV Job Application Generator", developmentClient: "http://127.0.0.1:5173" }));
  }

  return { app, bootstrap, store, coordinator, sessionToken };
}
