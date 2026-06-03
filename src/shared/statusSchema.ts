import { z } from "zod";
import { agentKinds } from "./types";

export const statusUpdateSchema = z
  .object({
    repoPath: z.string().trim().min(1, "repoPath is required"),
    agent: z.enum(agentKinds),
    title: z.string().trim().min(1).optional(),
    summary: z.string().trim().min(1).optional(),
    nextRecommendedAction: z.string().trim().min(1, "nextRecommendedAction is required"),
  })
  .strict();

export const validateStatusUpdatePayload = (input: unknown) => statusUpdateSchema.parse(input);

export const formatValidationError = (error: unknown) =>
  error instanceof z.ZodError
    ? error.issues.map((issue) => issue.message).join("; ")
    : error instanceof Error
      ? error.message
      : String(error);
