import type { AccountUsageResponse, BootstrapResponse, ModelOption, ReasoningEffort } from "../../shared/types.js";
import { AppError } from "../errors.js";
import type { CodexAppServerClient } from "./client.js";
import type { AccountRateLimitsResponse, AccountReadResponse, ModelListResponse, RateLimitWindow } from "./protocol.js";

const MVP_EFFORTS = new Set<ReasoningEffort>(["low", "medium", "high"]);

export async function readAccount(client: CodexAppServerClient): Promise<BootstrapResponse["auth"]> {
  const response = await client.request<AccountReadResponse>("account/read", { refreshToken: false });
  const mode = typeof response.account?.type === "string" ? response.account.type : undefined;
  return {
    authenticated: response.account !== null,
    eligible: mode === "chatgpt",
    authMode: mode === "chatgpt" || mode === "apiKey" || mode === "amazonBedrock" ? mode : mode ? "unknown" : undefined,
    email: response.account?.type === "chatgpt" && typeof response.account.email === "string" ? response.account.email : undefined,
    planType: response.account?.type === "chatgpt" && typeof response.account.planType === "string" ? response.account.planType : undefined,
  };
}

function windowLabel(durationMinutes: number | null | undefined, index: number): string {
  if (durationMinutes === 5 * 60) return "5-hour limit";
  if (durationMinutes === 7 * 24 * 60) return "Weekly limit";
  if (durationMinutes && durationMinutes % (24 * 60) === 0) return `${durationMinutes / (24 * 60)}-day limit`;
  if (durationMinutes && durationMinutes % 60 === 0) return `${durationMinutes / 60}-hour limit`;
  return index === 0 ? "Primary limit" : "Secondary limit";
}

export function summarizeAccountRateLimits(
  response: AccountRateLimitsResponse,
  account: { email?: string; planType?: string },
  now = new Date(),
): AccountUsageResponse {
  const rawWindows: RateLimitWindow[] = [response.rateLimits.primary, response.rateLimits.secondary]
    .filter((window): window is RateLimitWindow => Boolean(window) && typeof window?.usedPercent === "number");
  const windows = rawWindows.map((window, index) => {
    const usedPercent = Math.min(100, Math.max(0, Math.round(window.usedPercent)));
    return {
      label: windowLabel(window.windowDurationMins, index),
      usedPercent,
      remainingPercent: 100 - usedPercent,
      resetsAt: typeof window.resetsAt === "number" && Number.isSafeInteger(window.resetsAt)
        ? new Date(window.resetsAt * 1_000).toISOString()
        : undefined,
    };
  });

  return {
    account: { ...account, planType: account.planType ?? response.rateLimits.planType ?? undefined },
    windows,
    fetchedAt: now.toISOString(),
  };
}

export async function readAccountUsage(client: CodexAppServerClient, now = new Date()): Promise<AccountUsageResponse> {
  const accountResponse = await client.request<AccountReadResponse>("account/read", { refreshToken: false });
  if (accountResponse.account?.type !== "chatgpt") {
    throw new AppError(409, "chatgpt_auth_required", "ChatGPT sign-in is required to read Codex account usage limits.");
  }
  const limits = await client.request<AccountRateLimitsResponse>("account/rateLimits/read", null);
  return summarizeAccountRateLimits(limits, {
    email: typeof accountResponse.account.email === "string" ? accountResponse.account.email : undefined,
    planType: typeof accountResponse.account.planType === "string" ? accountResponse.account.planType : undefined,
  }, now);
}

export async function listModels(client: CodexAppServerClient): Promise<ModelOption[]> {
  const models: ModelOption[] = [];
  let cursor: string | null = null;
  do {
    const response: ModelListResponse = await client.request<ModelListResponse>("model/list", {
      cursor,
      limit: 100,
      includeHidden: false,
    });
    for (const item of response.data) {
      if (item.hidden) continue;
      const supportedEfforts = item.supportedReasoningEfforts
        .map(({ reasoningEffort }) => reasoningEffort)
        .filter((effort): effort is ReasoningEffort => MVP_EFFORTS.has(effort as ReasoningEffort));
      if (supportedEfforts.length === 0) continue;
      const defaultEffort = MVP_EFFORTS.has(item.defaultReasoningEffort as ReasoningEffort)
        ? item.defaultReasoningEffort as ReasoningEffort
        : undefined;
      models.push({
        model: item.model,
        displayName: item.displayName,
        isDefault: item.isDefault,
        supportedEfforts,
        defaultEffort,
      });
    }
    cursor = response.nextCursor;
  } while (cursor);

  if (models.length === 0) {
    throw new AppError(503, "no_compatible_models", "Codex returned no picker-visible model supporting low, medium, or high effort.");
  }
  return models;
}
