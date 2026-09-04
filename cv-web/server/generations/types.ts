import type { ValidateFunction } from "ajv";
import type {
  ApplicationGenerationStatus,
  ApplicationTabId,
  CodexTurnStatus,
  CreateGenerationRequest,
  GenerationEvent,
  ReasoningEffort,
} from "../../shared/types.js";
import type { DiscoveredSkill } from "../skills/discovery.js";

export interface NormalizedQuestion {
  id: string;
  text: string;
}

export interface GenerationPaths {
  root: string;
  metadata: string;
  workspace: string;
  inputDirectory: string;
  jobDescription: string;
  jobQuestions: string;
  outputDirectory: string;
  cvOutput: string;
  resultDirectory: string;
  result: string;
  pdfResult: string;
  skillMarkdown: string;
  outputSchema: string;
}

export interface PendingInput {
  requestId: string;
  appServerRequestId: string | number;
  questions: unknown[];
  deadline: string;
}

export interface GenerationRecord {
  id: string;
  applicationTabId: ApplicationTabId;
  status: ApplicationGenerationStatus;
  codexStatus?: CodexTurnStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  threadId?: string;
  turnId?: string;
  error?: string;
  cancelRequested: boolean;
  kept: boolean;
  retentionStartedAt?: string;
  expiresAt?: string;
  submitted: {
    jobDescription: string;
    questions: NormalizedQuestion[];
    skillName: string;
    skillParameters: Record<string, unknown>;
    model: string;
    effort: ReasoningEffort;
  };
  pdfOutputDirectory: string;
  paths: GenerationPaths;
  pendingInput?: PendingInput;
  result?: unknown;
  pdf?: {
    path: string;
    warning?: string;
  };
  events: GenerationEvent[];
  nextEventId: number;
  runtime: {
    skill?: DiscoveredSkill;
    validateParameters?: ValidateFunction;
  };
}

export interface PersistedGeneration extends Omit<GenerationRecord, "runtime"> {
  runtime?: never;
}

export function normalizeRequest(request: CreateGenerationRequest): GenerationRecord["submitted"] {
  return {
    jobDescription: request.jobDescription.replace(/\r\n/g, "\n"),
    questions: request.questions
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text, index) => ({ id: `q${index + 1}`, text })),
    skillName: request.skillName,
    skillParameters: structuredClone(request.skillParameters),
    model: request.model,
    effort: request.effort,
  };
}
