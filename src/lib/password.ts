import { z } from "zod"

export const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
})

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const result = passwordSchema.safeParse({ password })
  if (result.success) {
    return { valid: true, errors: [] }
  }
  // Return specific validation errors so users can fix their password
  return { valid: false, errors: (result.error as any).issues.map((e: any) => e.message) }
}
