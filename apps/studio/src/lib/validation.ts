import { z } from "zod";

// ─── Primitive enums ────────────────────────────────────────────────────────

export const workAreaSchema = z.enum(["speech", "language", "hearing"]);
export const categorySchema = z.enum(["speech", "language", "hearing"]);
export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const ageGroupSchema = z.enum(["3-6", "7-12", "13-18", "adult"]);
export const progressStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);

export const cardStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);

export const nameSchema = z.string().min(2).max(100).trim();
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Geçersiz email adresi");
export const passwordSchema = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalıdır")
  .max(128, "Şifre en fazla 128 karakter olabilir");

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Geçersiz token"),
  password: passwordSchema,
});

export const resendVerificationBodySchema = z.object({
  email: emailSchema,
});

// ─── Request body schemas ────────────────────────────────────────────────────

export const studentBodySchema = z.object({
  name: nameSchema,
  workArea: workAreaSchema,
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih formatı")
    .nullish(),
  diagnosis: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  curriculumIds: z.array(z.string()).optional(),
});

export const cardGenerateBodySchema = z.object({
  category: categorySchema,
  difficulty: difficultySchema,
  ageGroup: ageGroupSchema,
  focusArea: z.string().max(500).optional(),
  studentId: z.string().optional(),
  curriculumGoalIds: z.array(z.string()).optional(),
});

export const progressUpdateItemSchema = z.object({
  goalId: z.string().min(1),
  status: progressStatusSchema,
  notes: z.string().max(2000).nullable().optional(),
});

export const progressUpdatesSchema = z.array(progressUpdateItemSchema).min(1);

export const registerBodySchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Strips all HTML tags from a string.
 * Used to sanitize AI-generated content before storing.
 */
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

/**
 * Returns the first Zod error message for a 400 response.
 */
export function zodError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Geçersiz istek verisi";
}
