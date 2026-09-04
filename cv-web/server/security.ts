import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { AppError } from "./errors.js";

export const SESSION_HEADER = "x-cv-session-token";

function equalSecret(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function authorizeMutation(request: FastifyRequest, expectedOrigin: string | string[], token: string): void {
  const origin = request.headers.origin;
  const allowedOrigins = Array.isArray(expectedOrigin) ? expectedOrigin : [expectedOrigin];
  if (typeof origin !== "string" || !allowedOrigins.includes(origin)) {
    throw new AppError(403, "invalid_origin", "The request origin is not allowed.");
  }
  const supplied = request.headers[SESSION_HEADER];
  if (typeof supplied !== "string" || !equalSecret(supplied, token)) {
    throw new AppError(403, "invalid_session", "The browser session token is missing or invalid.");
  }
}

export function redactSecrets(value: string): string {
  return value
    .replace(/(?:sk|sess)-[A-Za-z0-9_-]{12,}/g, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]");
}
