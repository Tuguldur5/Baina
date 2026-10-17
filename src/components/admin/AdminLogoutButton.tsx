'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { adminHref } from '@/lib/hosts';

/**
 * Signs the admin out of THIS host only (`scope: 'local'`): auth cookies are
 * host-only, so a global sign-out would also kill the same person's public
 * session on baina.mn.
 */
export function AdminLogoutButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await createClient().auth.signOut({ scope: 'local' });
        router.replace(adminHref('/login'));
        router.refresh();
      }}
      className={
        className ??
        'inline-flex min-h-tap w-full items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60'
      }
    >
      {label}
    </button>
  );
}
