import { z } from "zod";
import { agentKinds, priorityLevels, statusUpdateStatuses } from "./types";

export const statusUpdateSchema = z.object({
  repoPath: z.string().trim().min(1, "repoPath is required"),
  agent: z.enum(agentKinds),
  status: z.enum(statusUpdateStatuses),
  bodyMarkdown: z.string().trim().min(1, "bodyMarkdown is required"),
  title: z.string().trim().min(1).optional(),
  summary: z.string().trim().min(1).optional(),
  priority: z.enum(priorityLevels).optional(),
});

export const validateStatusUpdatePayload = (input: unknown) => statusUpdateSchema.parse(input);

export const formatValidationError = (error: unknown) =>
  error instanceof z.ZodError
    ? error.issues.map((issue) => issue.message).join("; ")
    : error instanceof Error
      ? error.message
      : String(error);
