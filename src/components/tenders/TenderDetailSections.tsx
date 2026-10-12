'use client';

import { useState, type ReactNode } from 'react';
import { SubmitProposalModal } from '@/components/tenders/SubmitProposalModal';
import {
  TenderDetailClient,
  TenderSideCard,
} from '@/components/tenders/TenderDetailClient';
import type {
  ProposalRow,
  ProposalWithBidder,
  TenderWithOwner,
} from '@/lib/types/index';

/**
 * Interactive shell of the tender detail page:
 * left column = server-rendered content (children), right = sticky action card,
 * below = proposals & actions. The submit/edit modal state is shared.
 */
export function TenderDetailSections({
  tender,
  proposals,
  viewerProposal,
  isOwner,
  isLoggedIn,
  isClosed,
  isExpired,
  children,
}: {
  tender: TenderWithOwner;
  proposals: ProposalWithBidder[];
  viewerProposal: ProposalRow | null;
  isOwner: boolean;
  isLoggedIn: boolean;
  isClosed: boolean;
  isExpired: boolean;
  children: ReactNode;
}) {
  const [proposalOpen, setProposalOpen] = useState(false);
  const openProposal = () => setProposalOpen(true);

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">{children}</div>
        <aside aria-label={tender.title}>
          <TenderSideCard
            tender={tender}
            isOwner={isOwner}
            isLoggedIn={isLoggedIn}
            isClosed={isClosed}
            isExpired={isExpired}
            proposalsCount={proposals.length}
            onPropose={openProposal}
          />
        </aside>
      </div>

      <TenderDetailClient
        tender={tender}
        isOwner={isOwner}
        isLoggedIn={isLoggedIn}
        isClosed={isClosed}
        isExpired={isExpired}
        proposals={proposals}
        viewerProposal={viewerProposal}
        onPropose={openProposal}
      />

      <SubmitProposalModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        tenderId={tender.id}
        tenderTitle={tender.title}
        existing={viewerProposal}
      />
    </>
  );
}
