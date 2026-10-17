import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  /** Element type for semantic sections: `as="section"`. */
  as?: ElementType;
  children: ReactNode;
}

/**
 * The ONE shared page container (header, footer, landing, tenders, dashboard,
 * auth, static pages): `max-w-[1440px]` with the responsive gutter scale
 * 4/6/8/10. Pages that need a narrower reading column keep a `max-w-*` inner
 * element INSIDE the container instead of shrinking it, so every page shares
 * the same outer edges and none of them can produce horizontal scroll.
 */
export function Container({ as: Tag = 'div', className, children, ...rest }: ContainerProps) {
  return (
    <Tag
      className={cn(
        'mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
