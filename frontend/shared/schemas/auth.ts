import { z } from 'zod'

// Shared by the forms (instant feedback) and this server (checked again before calling Django).
// The rules mirror the Django backend, so people see the same messages before and after submitting;
// Django has the final word (e.g. it also refuses very common passwords).

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email address')
  .max(254, 'Email address is too long')
  .pipe(z.email('Enter a valid email address, like name@example.com'))

/** Contact form: any name */
export const nameField = z.string().trim().min(2, 'Enter your name').max(60, 'Name must be 60 characters or fewer')

export const firstNameField = z.string().trim().min(1, 'Enter your first name').max(150, 'That name is too long')

/** Django's policy: 8+ characters, an uppercase letter and a digit */
export const passwordField = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128, 'Password must be 128 characters or fewer')
  .regex(/[A-Z]/, 'Include at least one capital letter')
  .regex(/\d/, 'Include at least one number')

const confirmed = <T extends { password: string; confirmPassword: string }>(v: T, ctx: z.RefinementCtx) => {
  if (v.password !== v.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' })
}

export const registerSchema = z
  .object({
    firstName: firstNameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Repeat your password'),
    terms: z.literal(true, { error: 'Please accept the terms to continue' }),
    /** Package slug chosen on the pricing page — after sign-up the learner goes straight to paying for it */
    plan: z.string().max(60).optional()
  })
  .superRefine(confirmed)

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password').max(128),
  remember: z.boolean().optional()
})

export const forgotPasswordSchema = z.object({ email: emailField })

export const resetPasswordSchema = z
  .object({ token: z.string().min(1), password: passwordField, confirmPassword: z.string().min(1, 'Repeat your password') })
  .superRefine(confirmed)

export const profileSchema = z.object({
  firstName: firstNameField,
  lastName: z.string().trim().max(150, 'That name is too long'),
  phone: z.string().trim().max(30, 'That number is too long')
})

export const passwordChangeSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password'), password: passwordField, confirmPassword: z.string().min(1, 'Repeat your new password') })
  .superRefine(confirmed)

export const emailChangeSchema = z.object({ email: emailField })

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
