import { z } from "zod";

export const createGenerationSchema = z.object({
  applicationTabId: z.enum(["application-1", "application-2"]),
  jobDescription: z.string().max(100_000).refine((value) => value.trim().length > 0, "Job description is required."),
  questions: z.array(z.string().max(10_000)).max(50),
  skillName: z.string().min(1).max(200),
  skillParameters: z.record(z.string(), z.unknown()),
  model: z.string().min(1).max(200),
  effort: z.enum(["low", "medium", "high"]),
}).strict();

export const inputResponseSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["accept", "cancel"]),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
}).strict();
