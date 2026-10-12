'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  CheckCircle2,
  LogIn,
  Paperclip,
  Pencil,
  Timer,
  Trash2,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProposalStatusBadge, RoleBadge, Badge } from '@/components/ui/Badge';
import { DeadlineCountdown } from '@/components/tenders/DeadlineCountdown';
import { FileDownloadList } from '@/components/tenders/FileDownloadList';
import { useToast } from '@/components/ui/Toast';
import { PROPOSAL_FILES_BUCKET } from '@/lib/constants';
import {
  awardProposal,
  closeTender,
  rejectProposal,
  shortlistProposal,
  withdrawProposal,
} from '@/lib/actions/tenders';
import { formatDateTime, formatMNT } from '@/lib/utils';
import { staggerContainer, fadeInUp } from '@/lib/animations';
import { mn } from '@/lib/i18n/mn';
import type {
  ProposalRow,
  ProposalWithBidder,
  TenderWithOwner,
} from '@/lib/types/index';

interface DetailProps {
  tender: TenderWithOwner;
  isOwner: boolean;
  isLoggedIn: boolean;
  isClosed: boolean;
  isExpired: boolean;
  proposals: ProposalWithBidder[];
  viewerProposal: ProposalRow | null;
  /** Opens the submit/edit proposal modal (owned by TenderDetailSections). */
  onPropose: () => void;
}

/**
 * Interactive part of the tender detail page.
 * - Owner: proposals list + shortlist / reject / award / close actions.
 * - Bidder: own proposal with edit & withdraw while pending.
 * - Logged out: login prompt.
 */
export function TenderDetailClient({
  tender,
  isOwner,
  isLoggedIn,
  isClosed,
  isExpired,
  proposals,
  viewerProposal,
  onPropose,
}: DetailProps) {
  const router = useRouter();
  const toast = useToast();

  const [closeOpen, setCloseOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<
    { type: 'award' | 'shortlist' | 'reject' | 'withdraw'; id: string } | null
  >(null);
  const [loading, setLoading] = useState(false);
  const canBid = tender.status === 'open' && !isClosed && !isExpired;

  const runAction = async () => {
    if (!actionTarget) return;
    setLoading(true);

    let result: Awaited<ReturnType<typeof awardProposal>>;
    switch (actionTarget.type) {
      case 'award':
        result = await awardProposal({
          tenderId: tender.id,
          proposalId: actionTarget.id,
        });
        break;
      case 'shortlist':
        result = await shortlistProposal({
          tenderId: tender.id,
          proposalId: actionTarget.id,
        });
        break;
      case 'reject':
        result = await rejectProposal({
          tenderId: tender.id,
          proposalId: actionTarget.id,
        });
        break;
      case 'withdraw':
        result = await withdrawProposal(actionTarget.id);
        break;
    }

    setLoading(false);
    setActionTarget(null);

    if (result.ok) {
      toast.success(
        actionTarget.type === 'award'
          ? mn.toast.winnerSelected
          : actionTarget.type === 'shortlist'
            ? mn.toast.shortlisted
            : actionTarget.type === 'withdraw'
              ? mn.tenderDetail.proposalWithdrawn
              : actionTarget.type === 'reject'
                ? mn.toast.rejected
                : mn.toast.saved
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const onCloseTender = async () => {
    setLoading(true);
    const result = await closeTender({ tenderId: tender.id });
    setLoading(false);
    setCloseOpen(false);
    if (result.ok) {
      toast.success(mn.toast.tenderClosed);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const confirmMap = {
    award: {
      title: mn.tenderDetail.awardConfirmTitle,
      text: mn.tenderDetail.awardConfirmText,
      label: mn.tenderDetail.award,
    },
    shortlist: {
      title: mn.tenderDetail.shortlistConfirmTitle,
      text: mn.tenderDetail.shortlistConfirmText,
      label: mn.tenderDetail.shortlist,
    },
    reject: {
      title: mn.tenderDetail.rejectConfirmTitle,
      text: mn.tenderDetail.rejectConfirmText,
      label: mn.tenderDetail.reject,
    },
    withdraw: {
      title: mn.tenderDetail.withdrawConfirmTitle,
      text: mn.tenderDetail.withdrawConfirmText,
      label: mn.tenderDetail.withdrawProposal,
    },
  } as const;

  // Owner's proposals, cheapest first (then newest).
  const sortedProposals = [...proposals].sort((a, b) => {
    const priceDiff = Number(a.priceOffer) - Number(b.priceOffer);
    if (priceDiff !== 0) return priceDiff;
    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  return (
    <>
      {/* Closed / awarded / expired banners */}
      {isOwner && tender.status === 'open' && !isClosed && (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setCloseOpen(true)}>
            {mn.tenderDetail.close}
          </Button>
        </div>
      )}

      {tender.status === 'awarded' && (
        <Banner tone="info" icon={<Trophy className="h-5 w-5" aria-hidden="true" />}>
          {mn.tenderDetail.awardedBanner}
        </Banner>
      )}
      {tender.status === 'closed' && !isOwner && (
        <Banner tone="neutral" icon={<XCircle className="h-5 w-5" aria-hidden="true" />}>
          {mn.tenderDetail.closedBanner}
        </Banner>
      )}
      {tender.status === 'open' && isExpired && !isOwner && (
        <Banner tone="warning" icon={<Timer className="h-5 w-5" aria-hidden="true" />}>
          {mn.tenderDetail.expiredBanner}
        </Banner>
      )}

      {/* Proposals (owner view) */}
      {isOwner && (
        <section className="mb-10 mt-8">
          <h2 className="text-lg font-semibold text-text">
            {mn.tenderDetail.proposalsTitle}
            <span className="ml-2 text-sm font-normal text-muted">
              ({sortedProposals.length})
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            {mn.tenderDetail.ownTenderNotice}
          </p>

          {sortedProposals.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title={mn.tenderDetail.emptyProposals.title}
                text={mn.tenderDetail.emptyProposals.text}
              />
            </div>
          ) : (
            <motion.ul
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="mt-4 space-y-4"
            >
              {sortedProposals.map((proposal) => {
                const isWinner = tender.winnerProposalId === proposal.id;
                const canDecide =
                  tender.status === 'open' &&
                  !isClosed &&
                  proposal.status !== 'accepted' &&
                  proposal.status !== 'rejected';

                return (
                  <motion.li key={proposal.id} variants={fadeInUp}>
                    <div
                      className={`card p-5 sm:p-6 ${
                        isWinner ? 'ring-2 ring-accent-500' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={proposal.bidder?.avatarUrl ?? null}
                            name={proposal.bidder?.companyName ?? proposal.bidder?.name ?? '?'}
                            size="md"
                          />
                          <div>
                            <p className="font-semibold text-text">
                              {proposal.bidder?.companyName ?? proposal.bidder?.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              {proposal.bidder && (
                                <RoleBadge role={proposal.bidder.role} />
                              )}
                              <span className="text-xs text-muted">
                                {formatDateTime(proposal.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            {formatMNT(proposal.priceOffer)}
                          </p>
                          <div className="mt-1">
                            {isWinner ? (
                              <Badge tone="success">
                                <Trophy className="h-3 w-3" aria-hidden="true" />
                                {mn.tenderDetail.winner}
                              </Badge>
                            ) : (
                              <ProposalStatusBadge status={proposal.status} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* What the bidder promises, before the long text — the
                          two figures an owner compares across offers. */}
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                        {proposal.durationDays ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 font-semibold text-text">
                            <CalendarClock className="h-3.5 w-3.5 text-primary-500" aria-hidden="true" />
                            {mn.tenderDetail.durationDays(proposal.durationDays)}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">
                        {proposal.proposalText}
                      </p>

                      {proposal.attachments.length > 0 && (
                        <div className="mt-4">
                          <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted/70">
                            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                            {mn.tenderDetail.bidderDocs}
                          </h4>
                          <FileDownloadList
                            attachments={proposal.attachments}
                            bucket={PROPOSAL_FILES_BUCKET}
                            className="mt-2 space-y-2"
                          />
                        </div>
                      )}

                      {canDecide && (
                        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setActionTarget({ type: 'reject', id: proposal.id })
                            }
                          >
                            {mn.tenderDetail.reject}
                          </Button>
                          {proposal.status === 'pending' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setActionTarget({ type: 'shortlist', id: proposal.id })
                              }
                              loading={loading && actionTarget?.id === proposal.id}
                            >
                              {mn.tenderDetail.shortlist}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() =>
                              setActionTarget({ type: 'award', id: proposal.id })
                            }
                            loading={loading && actionTarget?.id === proposal.id}
                          >
                            <Trophy className="h-4 w-4" aria-hidden="true" />
                            {mn.tenderDetail.award}
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </section>
      )}

      {/* Bidder / guest actions */}
      {!isOwner && (
        <section className="mb-10 mt-8">
          {!isLoggedIn ? (
            <div className="card flex flex-col items-center gap-4 p-8 text-center">
              <h2 className="text-lg font-semibold text-text">
                {mn.tenderDetail.loginPrompt.title}
              </h2>
              <p className="max-w-md text-sm text-muted">
                {mn.tenderDetail.loginPrompt.text}
              </p>
              <Link href={`/auth/login?next=/tenders/${tender.id}`}>
                <Button>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  {mn.tenderDetail.loginPrompt.cta}
                </Button>
              </Link>
            </div>
          ) : viewerProposal ? (
            <div
              className={`card p-5 sm:p-6 ${
                viewerProposal.status === 'shortlisted' ||
                viewerProposal.status === 'accepted'
                  ? 'ring-2 ring-accent-500'
                  : ''
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-base font-semibold text-text">
                  {mn.tenderDetail.myProposal}
                  <ProposalStatusBadge status={viewerProposal.status} />
                </h3>
                <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {formatMNT(viewerProposal.price_offer)}
                </p>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-muted">
                {viewerProposal.proposal_text}
              </p>

              {(viewerProposal.status === 'shortlisted' ||
                viewerProposal.status === 'accepted') && (
                <p
                  role="status"
                  className="mt-4 flex items-start gap-2 rounded-2xl bg-accent-50 px-4 py-3 text-sm text-accent-800 dark:bg-accent-950 dark:text-accent-200"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {viewerProposal.status === 'shortlisted'
                    ? mn.tenderDetail.shortlistedNotice
                    : mn.tenderDetail.winner}
                </p>
              )}

          {viewerProposal.status === 'pending' && canBid && (
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActionTarget({ type: 'withdraw', id: viewerProposal.id })}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {mn.tenderDetail.withdrawProposal}
              </Button>
              <Button size="sm" onClick={onPropose}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                {mn.tenderDetail.editProposal}
              </Button>
            </div>
          )}
            </div>
          ) : canBid ? (
            <Button size="lg" onClick={onPropose}>
              {mn.tenderDetail.propose}
            </Button>
          ) : (
            <Banner
              tone="warning"
              icon={<XCircle className="h-5 w-5" aria-hidden="true" />}
            >
              {tender.status !== 'open'
                ? mn.submitProposal.notOpen
                : mn.submitProposal.expired}
            </Banner>
          )}
        </section>
      )}

      <ConfirmDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onConfirm={onCloseTender}
        title={mn.tenderDetail.closeConfirmTitle}
        text={mn.tenderDetail.closeConfirmText}
        confirmLabel={mn.tenderDetail.close}
        loading={loading}
      />

      <ConfirmDialog
        open={actionTarget !== null}
        onClose={() => setActionTarget(null)}
        onConfirm={runAction}
        title={actionTarget ? confirmMap[actionTarget.type].title : ''}
        text={actionTarget ? confirmMap[actionTarget.type].text : ''}
        confirmLabel={actionTarget ? confirmMap[actionTarget.type].label : ''}
        loading={loading}
        danger={actionTarget?.type === 'withdraw'}
      />
    </>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: 'info' | 'warning' | 'neutral';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones = {
    info: 'border-info-200 bg-info-50 text-info-800 dark:border-info-900 dark:bg-info-950 dark:text-info-200',
    warning:
      'border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-900 dark:bg-warning-950 dark:text-warning-200',
    neutral:
      'border-border bg-surface-2 text-muted dark:bg-surface-2 dark:text-muted',
  } as const;

  return (
    <div
      role="status"
      className={`mb-4 flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm ${tones[tone]}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  );
}

/**
 * Sticky side card: budget, deadline countdown, proposal count and the main
 * action (bid / login / owner notice).
 */
export function TenderSideCard({
  tender,
  isOwner,
  isLoggedIn,
  isClosed,
  isExpired,
  proposalsCount,
  onPropose,
}: {
  tender: TenderWithOwner;
  isOwner: boolean;
  isLoggedIn: boolean;
  isClosed: boolean;
  isExpired: boolean;
  proposalsCount: number;
  onPropose?: () => void;
}) {
  const canBid = tender.status === 'open' && !isClosed && !isExpired;

  return (
    <div className="card sticky top-28 space-y-4 p-5">
      <div>
        <p className="text-xs text-muted">{mn.tenders.labels.budget}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-text">
          {formatMNT(tender.budget)}
        </p>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted">{mn.tenders.labels.deadline}</p>
        <DeadlineCountdown deadline={tender.deadline} className="mt-1" />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
        <span className="text-muted">{mn.tenders.labels.proposals}</span>
        <span className="font-semibold text-text">{proposalsCount}</span>
      </div>

      <div className="border-t border-border pt-4">
        {isOwner ? (
          <p className="rounded-2xl bg-primary-50 px-4 py-3 text-xs text-primary-700 dark:bg-primary-950 dark:text-primary-300">
            {mn.tenderDetail.ownTenderNotice}
          </p>
        ) : !isLoggedIn ? (
          <Link href={`/auth/login?next=/tenders/${tender.id}`}>
            <Button fullWidth>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {mn.tenderDetail.loginPrompt.cta}
            </Button>
          </Link>
        ) : canBid ? (
          <Button fullWidth size="lg" onClick={onPropose}>
            {mn.tenderDetail.propose}
          </Button>
        ) : (
          <p className="rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted">
            {tender.status !== 'open'
              ? mn.tenderDetail.closedBanner
              : mn.tenderDetail.expiredBanner}
          </p>
        )}
      </div>
    </div>
  );
}
