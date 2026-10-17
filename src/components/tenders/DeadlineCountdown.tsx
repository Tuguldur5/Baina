'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getTimeLeft, pad2, type TimeLeft } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';
import { cn } from '@/lib/utils';

/**
 * Live deadline countdown — hydration-safe by design:
 *
 *  - the server renders a stable placeholder (icon + em dash) because the
 *    remaining time depends on `Date.now()`, which can never match between
 *    server and client — the old seconds-ticking version caused hydration
 *    warnings on every page with a deadline;
 *  - after mount the real value appears, computed in the browser;
 *  - COARSE units only (`2 хоног 04:15` — no seconds) refreshed every 60 s,
 *    so consecutive renders never flip unexpectedly.
 *
 * Shows "Хугацаа дууссан" once the deadline has passed.
 */
export function DeadlineCountdown({
  deadline,
  className,
}: {
  deadline: string;
  className?: string;
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const tick = () => setTimeLeft(getTimeLeft(deadline));
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  if (timeLeft === null) {
    // Stable server / first-client render — no clock values at all.
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-sm tabular-nums text-muted',
          className
        )}
        aria-hidden="true"
      >
        <Clock className="h-4 w-4" aria-hidden="true" />
        <span>—</span>
      </span>
    );
  }

  if (timeLeft.expired) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-sm font-medium text-danger-600',
          className
        )}
      >
        <Clock className="h-4 w-4" aria-hidden="true" />
        {mn.tenders.labels.expired}
      </span>
    );
  }

  const hhmm = `${pad2(timeLeft.hours)}:${pad2(timeLeft.minutes)}`;

  return (
    <span
      className={cn(
        // tabular-nums: the digits keep the same width while ticking, so the
        // countdown never jitters or re-wraps when the value changes.
        'inline-flex items-center gap-1.5 text-sm tabular-nums text-muted',
        className
      )}
      aria-live="off"
    >
      <Clock className="h-4 w-4" aria-hidden="true" />
      <span>
        {timeLeft.days > 0 ? `${timeLeft.days} хоног ${hhmm}` : hhmm}
      </span>
    </span>
  );
}
