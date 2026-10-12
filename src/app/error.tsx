'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { mn } from '@/lib/i18n/mn';

/**
 * Route error boundary: shows a Mongolian message + retry button.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this would be reported to a monitoring service.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-50 text-danger-600 dark:bg-danger-950">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-bold text-text sm:text-3xl">
        {mn.errors.genericTitle}
      </h1>
      <p className="mt-3 max-w-md text-muted">{mn.errors.genericText}</p>
      <Button onClick={reset} className="mt-8" size="lg">
        {mn.errors.retry}
      </Button>
    </div>
  );
}
