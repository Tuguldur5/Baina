'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ForgotPasswordInput,
} from '@/lib/validators/auth';
import { mn } from '@/lib/i18n/mn';
import type { ActionResult } from '@/lib/types/index';

function firstError(error: { errors: { message: string }[] }): string {
  return error.errors[0]?.message ?? mn.errors.genericText;
}

/** Email + password sign-in. */
export async function login(
  input: LoginInput
): Promise<ActionResult<{ needsEmailConfirm: boolean }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: mn.auth.login.invalid };
  }

  return {
    ok: true,
    data: { needsEmailConfirm: !data.session },
  };
}

/** Create a new account (individual or company). */
export async function register(
  input: RegisterInput
): Promise<ActionResult<{ needsEmailConfirm: boolean }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
        role: parsed.data.role,
        company_name: parsed.data.companyName ?? null,
      },
    },
  });

  if (error) {
    // Do not leak whether the email already exists.
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: { needsEmailConfirm: !data.session },
  };
}

/** Sign out and redirect to the landing page. */
export async function logout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}

/** Send a password-reset link. Always reports success (no email leak). */
export async function forgotPassword(
  input: ForgotPasswordInput
): Promise<ActionResult<{ sent: true }>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // Recovery links land on the password-reset page (see /auth/reset-password).
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: { sent: true } };
}
