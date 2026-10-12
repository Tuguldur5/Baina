import { z } from 'zod';
import { mn } from '@/lib/i18n/mn';
import { PASSWORD_MIN_LENGTH, USER_ROLES } from '@/lib/constants';

/** Password: min 8 chars, must contain letters and numbers. */
export const passwordSchema = z
  .string()
  .min(1, mn.validation.required)
  .min(PASSWORD_MIN_LENGTH, mn.validation.passwordMin)
  .regex(/[A-Za-zА-Яа-яЁё]/, mn.validation.passwordRule)
  .regex(/[0-9]/, mn.validation.passwordRule);

export const emailSchema = z
  .string()
  .trim()
  .min(1, mn.validation.required)
  .email(mn.validation.email);

/** Optional MN phone: exactly 8 digits (e.g. 99112233). */
const phoneSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || /^[0-9]{8}$/.test(v), mn.validation.phone);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, mn.validation.required),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, mn.validation.nameMin)
      .max(100, mn.validation.nameMax),
    role: z.enum(USER_ROLES, {
      errorMap: () => ({ message: mn.validation.required }),
    }),
    companyName: z
      .string()
      .trim()
      .max(150, mn.validation.companyNameMax)
      .optional(),
    email: emailSchema,
    phone: phoneSchema.optional(),
    password: passwordSchema,
    passwordConfirm: z.string().min(1, mn.validation.required),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'company' && !data.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyName'],
        message: mn.validation.companyNameRequired,
      });
    }
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['passwordConfirm'],
        message: mn.validation.passwordMismatch,
      });
    }
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Set a new password from the recovery link (/auth/reset-password). */
export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirm: z.string().min(1, mn.validation.required),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['passwordConfirm'],
        message: mn.validation.passwordMismatch,
      });
    }
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

/**
 * Internal redirect target (`?next=…`): only same-site paths are allowed so
 * the parameter can never become an open redirect.
 */
export function sanitizeNext(next: string | null | undefined): string {
  if (!next) return '/dashboard';
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  return next;
}

/**
 * Password strength 0..4 for the register form meter.
 * Returns an index into mn.auth.register.passwordLevels.
 */
export function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Za-zА-Яа-яЁё]/.test(password) && /[0-9]/.test(password)) score += 1;
  if (/[^A-Za-zА-Яа-яЁё0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}
