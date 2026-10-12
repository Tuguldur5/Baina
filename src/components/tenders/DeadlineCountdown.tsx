'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getTimeLeft, pad2 } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';
import { cn } from '@/lib/utils';

/**
 * Live deadline countdown (updates every second).
 * Shows "Хугацаа дууссан" once the deadline has passed.
 */
export function DeadlineCountdown({
  deadline,
  className,
}: {
  deadline: string;
  className?: string;
}) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(deadline));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft(deadline));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

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

  return (
    <span
      className={cn(
        // tabular-nums: the digits keep the same width while ticking, so the
        // countdown never jitters or re-wraps from one second to the next.
        'inline-flex items-center gap-1.5 text-sm tabular-nums text-muted',
        className
      )}
      aria-live="off"
    >
      <Clock className="h-4 w-4" aria-hidden="true" />
      <span>
        {timeLeft.days} хоног {pad2(timeLeft.hours)}:{pad2(timeLeft.minutes)}:
        {pad2(timeLeft.seconds)}
      </span>
    </span>
  );
}
