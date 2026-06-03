import { z } from 'zod';
import { chatResponseSchema } from './aiActions';

/**
 * Request/response contracts for the FastAPI backend, plus a small typed
 * validation helper used by the service layer.
 */

export const chatRequestSchema = z.object({
  message: z.string().min(1),
  graph: z.object({
    nodes: z.array(z.unknown()),
    edges: z.array(z.unknown()),
  }),
});

export const submitProcessingCodeRequestSchema = z.object({
  nodeId: z.string().min(1),
  language: z.enum(['sql', 'python']),
  code: z.string(),
});

export { chatResponseSchema };

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type SubmitProcessingCodeRequest = z.infer<
  typeof submitProcessingCodeRequestSchema
>;

export type ValidationResult<T> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; error: string; data?: undefined };

/** Validate unknown data against a Zod schema and normalize the result. */
export function validateWith<T>(
  schema: z.ZodType<T>,
  data: unknown,
): ValidationResult<T> {
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const issue = parsed.error.issues[0];
  const path = issue?.path.join('.') || '(root)';
  return {
    ok: false,
    error: `Invalid payload at ${path}: ${issue?.message ?? 'unknown error'}`,
  };
}
