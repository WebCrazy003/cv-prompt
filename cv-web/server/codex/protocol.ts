export type JsonRpcId = number | string;

export interface JsonRpcRequest<T = unknown> {
  method: string;
  id: JsonRpcId;
  params: T;
}

export interface JsonRpcNotification<T = unknown> {
  method: string;
  params: T;
}

export interface JsonRpcResponse<T = unknown> {
  id: JsonRpcId;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export type Account =
  | { type: "apiKey" }
  | { type: "chatgpt"; email?: string; planType?: string }
  | { type: "amazonBedrock" }
  | { type: string; [key: string]: unknown };

export interface AccountReadResponse {
  account: Account | null;
  requiresOpenaiAuth: boolean;
}

export interface AppServerModel {
  model: string;
  displayName: string;
  hidden: boolean;
  isDefault: boolean;
  defaultReasoningEffort?: string;
  supportedReasoningEfforts: Array<{ reasoningEffort: string; description?: string }>;
}

export interface ModelListResponse {
  data: AppServerModel[];
  nextCursor: string | null;
}

export interface ThreadStartResponse {
  thread: { id: string; [key: string]: unknown };
}

export interface TurnStartResponse {
  turn: { id: string; status: string; [key: string]: unknown };
}
