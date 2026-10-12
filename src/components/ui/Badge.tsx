import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';
import type { ProposalStatus, TenderStatus } from '@/lib/constants';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneClasses: Record<Tone, string> = {
  success: 'bg-accent-50 text-accent-700 ring-accent-200 dark:bg-accent-950 dark:text-accent-300 dark:ring-accent-900',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-950 dark:text-warning-300 dark:ring-warning-900',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200 dark:bg-danger-950 dark:text-danger-300 dark:ring-danger-900',
  info: 'bg-info-50 text-info-700 ring-info-200 dark:bg-info-950 dark:text-info-300 dark:ring-info-200',
  neutral: 'bg-surface-2 text-muted ring-border dark:bg-surface-2 dark:text-muted',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const tenderStatusTone: Record<TenderStatus, Tone> = {
  open: 'success',
  closed: 'neutral',
  awarded: 'info',
};

/** Badge for tender status (open / closed / awarded). */
export function TenderStatusBadge({ status }: { status: TenderStatus }) {
  return <Badge tone={tenderStatusTone[status]}>{mn.tenderStatus[status]}</Badge>;
}

const proposalStatusTone: Record<ProposalStatus, Tone> = {
  pending: 'warning',
  shortlisted: 'info',
  accepted: 'success',
  rejected: 'danger',
};

/** Badge for proposal status (pending / accepted / rejected). */
export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <Badge tone={proposalStatusTone[status]}>{mn.proposalStatus[status]}</Badge>
  );
}

/** Badge showing the creator role: individual (green) vs company (blue). */
export function RoleBadge({ role }: { role: 'user' | 'company' }) {
  return (
    <Badge tone={role === 'company' ? 'info' : 'success'}>
      {mn.roles[role]}
    </Badge>
  );
}
