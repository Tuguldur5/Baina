import type {
  Notification,
  NotificationRow,
  Profile,
  ProfileRow,
  Proposal,
  ProposalRow,
  PublicTenderRow,
  Tender,
  TenderOwner,
  TenderPrivateDetails,
  TenderPrivateDetailsRow,
  TenderRow,
} from '@/lib/types/index';

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    companyName: row.company_name,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    createdAt: row.created_at,
  };
}

export function mapTenderOwner(row: Partial<ProfileRow> | null): TenderOwner | null {
  if (!row || !row.id) return null;
  return {
    id: row.id,
    name: row.name ?? '',
    role: row.role ?? 'user',
    companyName: row.company_name ?? null,
    avatarUrl: row.avatar_url ?? null,
  };
}

export function mapTender(row: TenderRow): Tender {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    budget: row.budget,
    currency: row.currency,
    region: row.region ?? null,
    status: row.status,
    deadline: row.deadline,
    createdByUserId: row.created_by_user_id,
    winnerProposalId: row.winner_proposal_id,
    createdAt: row.created_at,
  };
}

/**
 * Maps a row of the `public.public_tenders` read model: the owner is built
 * from the MASKED name + role, so confidential profile data never reaches the
 * client for anonymous or non-shortlisted viewers.
 */
export function mapPublicTender(row: PublicTenderRow): Tender {
  return mapTender(row);
}

/** Owner shape derived from a `public_tenders` row (masked name). */
export function mapMaskedOwner(row: PublicTenderRow): TenderOwner {
  return {
    id: row.created_by_user_id,
    name: row.owner_masked_name,
    role: row.owner_role,
    companyName: null,
    avatarUrl: row.owner_avatar_url || null,
  };
}

export function mapPrivateDetails(
  row: TenderPrivateDetailsRow
): TenderPrivateDetails {
  return {
    tenderId: row.tender_id,
    fullDescription: row.full_description,
    requirements: row.requirements,
    address: row.address,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  };
}

export function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    read: row.read,
    createdAt: row.created_at,
  };
}

export function mapProposal(row: ProposalRow): Proposal {
  return {
    id: row.id,
    tenderId: row.tender_id,
    bidderId: row.bidder_id,
    priceOffer: row.price_offer,
    proposalText: row.proposal_text,
    durationDays: row.duration_days ?? null,
    attachments: row.attachments ?? [],
    status: row.status,
    createdAt: row.created_at,
  };
}
