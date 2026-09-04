import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { AppError, messageOf } from "../errors.js";
import type { JsonRpcId, JsonRpcNotification, JsonRpcRequest, JsonRpcResponse } from "./protocol.js";

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
}

export interface ServerRequestEvent {
  request: JsonRpcRequest;
  respond: (result: unknown) => void;
  reject: (code: number, message: string) => void;
}

export class CodexAppServerClient extends EventEmitter {
  private child?: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private readonly pending = new Map<JsonRpcId, PendingRequest>();
  private closing = false;

  constructor(private readonly command: string) {
    super();
  }

  async start(): Promise<void> {
    if (this.child) return;
    this.closing = false;
    const child = spawn(this.command, ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      env: process.env,
    });
    this.child = child;
    child.once("error", (error) => this.failAll(error));
    child.once("exit", (code, signal) => {
      this.child = undefined;
      const error = new Error(`Codex app-server exited (${signal ?? code ?? "unknown"}).`);
      this.failAll(error);
      if (!this.closing) this.emit("unexpectedExit", error);
    });
    child.stderr.on("data", (chunk: Buffer) => this.emit("diagnostic", chunk.toString("utf8")));

    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    lines.on("line", (line) => this.receive(line));

    await this.request("initialize", {
      clientInfo: { name: "cv_job_application_generator", title: "CV Job Application Generator", version: "0.1.0" },
      capabilities: { experimentalApi: true, requestAttestation: false },
    });
    this.notify("initialized", {});
  }

  async request<T>(method: string, params: unknown, timeoutMs = 30_000): Promise<T> {
    if (!this.child) throw new AppError(503, "codex_unavailable", "Codex app-server is not running.");
    const id = this.nextId++;
    const promise = new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex request timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
    });
    this.write({ method, id, params });
    return promise;
  }

  notify(method: string, params: unknown): void {
    this.write({ method, params });
  }

  respond(id: JsonRpcId, result: unknown): void {
    this.write({ id, result });
  }

  respondError(id: JsonRpcId, code: number, message: string): void {
    this.write({ id, error: { code, message } });
  }

  close(): void {
    this.closing = true;
    this.child?.kill("SIGTERM");
    this.child = undefined;
    this.failAll(new Error("Codex app-server closed."));
  }

  private write(message: object): void {
    if (!this.child?.stdin.writable) throw new Error("Codex app-server stdin is unavailable.");
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private receive(line: string): void {
    let message: JsonRpcResponse | JsonRpcRequest | JsonRpcNotification;
    try {
      message = JSON.parse(line) as JsonRpcResponse | JsonRpcRequest | JsonRpcNotification;
    } catch (error) {
      this.emit("diagnostic", `Invalid app-server JSON: ${messageOf(error)}`);
      return;
    }

    if ("id" in message && !("method" in message)) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.message} (${message.error.code})`));
      else pending.resolve(message.result);
      return;
    }

    if ("method" in message && "id" in message) {
      const request = message as JsonRpcRequest;
      this.emit("request", {
        request,
        respond: (result: unknown) => this.respond(request.id, result),
        reject: (code: number, errorMessage: string) => this.respondError(request.id, code, errorMessage),
      } satisfies ServerRequestEvent);
      return;
    }

    if ("method" in message) this.emit("notification", message as JsonRpcNotification);
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
