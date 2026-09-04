export type ApplicationTabId = "application-1" | "application-2";
export type ReasoningEffort = "low" | "medium" | "high";
export type ApplicationGenerationStatus =
  | "idle"
  | "preparing"
  | "starting_codex"
  | "running"
  | "waiting_for_input"
  | "cancelling"
  | "validating"
  | "completed"
  | "failed"
  | "cancelled";
export type CodexTurnStatus = "inProgress" | "completed" | "failed" | "interrupted";

export interface ModelOption {
  model: string;
  displayName: string;
  supportedEfforts: ReasoningEffort[];
  defaultEffort?: ReasoningEffort;
  isDefault: boolean;
}

export type ParameterSchema = {
  type: "object";
  properties: Record<string, {
    type: "string" | "boolean" | "integer" | "number";
    title?: string;
    description?: string;
    default?: string | boolean | number;
    enum?: Array<string | boolean | number>;
    minimum?: number;
    maximum?: number;
  }>;
  required?: string[];
  additionalProperties: false;
};

export interface SkillOption {
  name: string;
  displayName: string;
  description: string;
  runnable: boolean;
  disabledReason?: string;
  parameterSchema?: ParameterSchema;
}

export interface BootstrapResponse {
  codexVersion: string;
  capacity: { active: number; limit: 2 };
  auth: {
    authenticated: boolean;
    eligible: boolean;
    authMode?: "chatgpt" | "apiKey" | "amazonBedrock" | "unknown";
    planType?: string;
  };
  models: ModelOption[];
  skills: SkillOption[];
  limits: {
    jobDescription: number;
    question: number;
    questions: number;
  };
}

export interface ApplicationQuestion {
  id: string;
  text: string;
}

export interface CreateGenerationRequest {
  applicationTabId: ApplicationTabId;
  skillName: string;
  model: string;
  effort: ReasoningEffort;
  jobDescription: string;
  questions: string[];
  skillParameters: Record<string, unknown>;
}

export interface GenerationEvent {
  id: number;
  type: "status" | "progress" | "input_required" | "completed" | "error";
  createdAt: string;
  data: Record<string, unknown>;
}

export interface GenerationSummary {
  id: string;
  applicationTabId: ApplicationTabId;
  skillName: string;
  model: string;
  effort: ReasoningEffort;
  status: ApplicationGenerationStatus;
  codexStatus?: CodexTurnStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  resultAvailable: boolean;
  kept: boolean;
  retentionStartedAt?: string;
  expiresAt?: string;
}

export interface GenerationResult {
  generation: GenerationSummary;
  content: unknown;
}

export interface InputResponse {
  answers: Record<string, string[]>;
}
