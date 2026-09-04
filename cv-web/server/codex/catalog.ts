import type { BootstrapResponse, ModelOption, ReasoningEffort } from "../../shared/types.js";
import { AppError } from "../errors.js";
import type { CodexAppServerClient } from "./client.js";
import type { AccountReadResponse, ModelListResponse } from "./protocol.js";

const MVP_EFFORTS = new Set<ReasoningEffort>(["low", "medium", "high"]);

export async function readAccount(client: CodexAppServerClient): Promise<BootstrapResponse["auth"]> {
  const response = await client.request<AccountReadResponse>("account/read", { refreshToken: false });
  const mode = typeof response.account?.type === "string" ? response.account.type : undefined;
  return {
    authenticated: response.account !== null,
    eligible: mode === "chatgpt",
    authMode: mode === "chatgpt" || mode === "apiKey" || mode === "amazonBedrock" ? mode : mode ? "unknown" : undefined,
    planType: response.account?.type === "chatgpt" && typeof response.account.planType === "string" ? response.account.planType : undefined,
  };
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
