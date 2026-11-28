import { z } from "zod"

export const emailSchema = z.string().email("Invalid email address").max(254)
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128)
export const nameSchema = z.string().min(1, "Name is required").max(100)
export const uuidSchema = z.string().uuid("Invalid ID format")
export const urlSchema = z.string().url("Invalid URL")

export const profileUpdateSchema = z.object({
  fullName: nameSchema.optional(),
  email: emailSchema.optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
})

export const notificationPreferencesSchema = z.object({
  email: z.object({
    conversions: z.boolean(),
    ai_generation: z.boolean(),
    signatures: z.boolean(),
    sharing: z.boolean(),
    usage_warnings: z.boolean(),
    marketing: z.boolean(),
    security: z.boolean(),
  }),
  push: z.object({
    conversions: z.boolean(),
    ai_generation: z.boolean(),
    signatures: z.boolean(),
    sharing: z.boolean(),
    usage_warnings: z.boolean(),
  }),
  in_app: z.object({
    conversions: z.boolean(),
    ai_generation: z.boolean(),
    signatures: z.boolean(),
    sharing: z.boolean(),
  }),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const documentCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  template_id: uuidSchema.optional(),
  account_id: uuidSchema.optional(),
  encrypted: z.boolean().optional(),
  encrypted_content: z.string().optional(),
  encryption_key_wrapped: z.string().optional(),
  encryption_iv: z.string().optional(),
})

export const conversionJobSchema = z.object({
  type: z.enum(["document", "unit", "metadata"]),
  source_format: z.string().min(1),
  target_format: z.string().min(1),
  source_url: z.string().optional(),
  value: z.string().optional(),
  options: z.record(z.unknown()).optional(),
  source_document_id: uuidSchema.optional(),
})

export const apiKeyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.record(z.boolean()).optional(),
  expires_at: z.string().datetime().optional(),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}