'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { adminHref } from '@/lib/hosts';
import { mn } from '@/lib/i18n/mn';

type Step = 'credentials' | 'mfa' | 'enroll';

/**
 * Admin sign-in (admin host only).
 *
 * Two rules drive the whole flow:
 *   1. Never reveal whether an account exists or is an admin. A wrong password
 *      and a non-admin account both end with the same generic message, and a
 *      signed-in non-admin is signed straight back out of this host.
 *   2. Password alone is never enough — the panel needs a verified TOTP factor
 *      (aal2), which is what `public.is_admin()` checks in the database too.
 *
 * Sessions are host-only, so signing in here does not touch the public site.
 */
export function AdminLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  // Already verified in this tab session? Go straight to the panel.
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel === 'aal2') router.replace(adminHref('/'));
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setPending(false);
      setError(mn.admin.login.invalid);
      return;
    }

    // The admin flag is readable on your own profile row, even at aal1.
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', data.user.id)
      .maybeSingle();

    if ((profile as { is_admin?: boolean } | null)?.is_admin !== true) {
      await supabase.auth.signOut({ scope: 'local' });
      setPending(false);
      setError(mn.admin.noAccess);
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal2') {
      router.replace(adminHref('/'));
      return;
    }

    setPending(false);
    setStep(aal?.nextLevel === 'aal2' ? 'mfa' : 'enroll');
  }

  async function handleMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    // `all` carries both verified and unverified factors (the typed `totp`
    // shortcut only exposes verified ones).
    const totp = factors?.all.find(
      (factor) => factor.factor_type === 'totp' && factor.status === 'verified'
    );

    if (factorsError || !totp) {
      setPending(false);
      setStep('enroll');
      return;
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totp.id,
    });

    if (challengeError || !challenge) {
      setPending(false);
      setError(mn.admin.login.mfaInvalid);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challenge.id,
      code: code.trim(),
    });

    if (verifyError) {
      setPending(false);
      setCode('');
      setError(mn.admin.login.mfaInvalid);
      return;
    }

    router.replace(adminHref('/'));
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
          {step === 'credentials' ? (
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <h1 className="text-lg font-bold text-slate-900">
          {step === 'credentials' ? mn.admin.login.title : mn.admin.login.mfaTitle}
        </h1>
        <p className="text-sm text-slate-500">
          {step === 'credentials' ? mn.admin.login.subtitle : mn.admin.login.mfaHint}
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {step === 'credentials' && (
        <form onSubmit={handleCredentials} className="flex flex-col gap-4" noValidate>
          <Input
            label={mn.admin.login.email}
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
          <Input
            label={mn.admin.login.password}
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" loading={pending} fullWidth>
            {pending ? mn.admin.login.submitting : mn.admin.login.submit}
          </Button>
        </form>
      )}

      {step === 'mfa' && (
        <form onSubmit={handleMfa} className="flex flex-col gap-4" noValidate>
          <Input
            label={mn.admin.login.mfaCode}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            required
            autoFocus
          />
          <Button type="submit" loading={pending} fullWidth disabled={code.length < 6}>
            {mn.admin.login.mfaSubmit}
          </Button>
        </form>
      )}

      {step === 'enroll' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">{mn.admin.login.enrollRequired}</p>
          <Link href={adminHref('/security')} className="block">
            <Button fullWidth>{mn.admin.nav.security}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
