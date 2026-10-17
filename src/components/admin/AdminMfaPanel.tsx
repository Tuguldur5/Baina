'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminHref } from '@/lib/hosts';
import { mn } from '@/lib/i18n/mn';

type Phase = 'loading' | 'verified' | 'idle' | 'verify' | 'enrolling';

/**
 * Two-factor (TOTP) enrollment / verification for admins.
 *
 * Works at aal1 — that is the whole point: an admin whose session is only
 * password-verified is sent here by `requireAdmin()` and can only get into the
 * panel after the second factor is verified. Uses the Supabase auth MFA API
 * only (no QR library): the enroll response already contains the otpauth SVG.
 */
export function AdminMfaPanel() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!active) return;
      if (aal?.currentLevel === 'aal2') {
        setPhase('verified');
        return;
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (!active) return;
      // `all` lists verified AND unverified factors.
      const verified = factors?.all.find(
        (factor) => factor.factor_type === 'totp' && factor.status === 'verified'
      );
      setFactorId(verified?.id ?? null);
      setPhase(verified ? 'verify' : 'idle');
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleStartEnroll() {
    setPending(true);
    setError(null);
    const supabase = createClient();

    // Drop half-finished enrollments so repeated attempts do not pile up
    // unverified factors on the account.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const unfinished = (existing?.all ?? []).filter(
      (factor) => factor.factor_type === 'totp' && factor.status !== 'verified'
    );
    for (const factor of unfinished) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `admin-${Date.now()}`,
    });

    if (enrollError || !data) {
      setPending(false);
      setError(mn.admin.security.genericError);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setPending(false);
    setPhase('enrolling');
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId) return;
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError || !challenge) {
      setPending(false);
      setError(mn.admin.security.genericError);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    if (verifyError) {
      setPending(false);
      setCode('');
      setError(mn.admin.security.invalid);
      return;
    }

    setPending(false);
    setCode('');
    setPhase('verified');
    router.refresh();
  }

  if (phase === 'loading') {
    return (
      <div className="space-y-3" role="status" aria-live="polite">
        <span className="sr-only">{mn.common.loading}</span>
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-11 w-40" />
      </div>
    );
  }

  if (phase === 'verified') {
    return (
      <div className="space-y-5">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          {mn.admin.security.statusVerified}
        </p>
        <Link href={adminHref('/')} className="inline-block">
          <Button>{mn.admin.security.continueToPanel}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-5">
      {phase === 'idle' && (
        <>
          <p className="text-sm text-slate-600">{mn.admin.security.statusMissing}</p>
          <Button onClick={handleStartEnroll} loading={pending}>
            {mn.admin.security.start}
          </Button>
        </>
      )}

      {phase === 'verify' && (
        <p className="text-sm text-slate-600">{mn.admin.login.mfaHint}</p>
      )}

      {phase === 'enrolling' && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">{mn.admin.security.scanHint}</p>
          {qrCode && (
            // The QR is an `<img>` on purpose: Supabase returns an SVG data URI
            // from the enroll response (no QR library, no dangerouslySetInnerHTML).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCode}
              alt={mn.admin.security.scanHint}
              width={192}
              height={192}
              className="rounded-xl border border-slate-200 bg-white"
            />
          )}
          {secret && (
            <p className="break-all text-xs text-slate-500">
              {mn.admin.security.manualHint}{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">
                {secret}
              </code>
            </p>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {(phase === 'verify' || phase === 'enrolling') && (
        <form onSubmit={handleVerify} className="flex flex-col gap-4" noValidate>
          <Input
            label={mn.admin.security.codeLabel}
            name="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            required
          />
          <Button type="submit" loading={pending} disabled={code.length < 6}>
            {mn.admin.security.confirm}
          </Button>
        </form>
      )}

      {phase === 'enrolling' && (
        <button
          type="button"
          onClick={handleStartEnroll}
          disabled={pending}
          className="text-sm font-medium text-slate-500 underline-offset-4 hover:underline disabled:opacity-60"
        >
          {mn.admin.security.restart}
        </button>
      )}
    </div>
  );
}
