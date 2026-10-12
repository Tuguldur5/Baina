import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
} as const;

export function Spinner({
  size = 'md',
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <Loader2
      aria-hidden="true"
      className={cn('animate-spin text-current', sizes[size], className)}
    />
  );
}
