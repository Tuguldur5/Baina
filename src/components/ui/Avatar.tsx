import Image from 'next/image';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
} as const;

export function Avatar({
  src,
  name,
  size = 'md',
  className,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size === 'sm' ? 32 : size === 'md' ? 40 : 56}
        height={size === 'sm' ? 32 : size === 'md' ? 40 : 56}
        className={cn(
          'shrink-0 rounded-full object-cover ring-1 ring-border',
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-gradient font-semibold text-white ring-1 ring-inset ring-white/20',
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}
