import type {
  ProposalStatus,
  SubmissionLanguage,
  TenderStatus,
  TenderType,
  UserRole,
} from '@/lib/constants';

/**
 * DB row types match PostgreSQL column names (snake_case, as returned by
 * supabase-js). Domain types are camelCase and used in components — convert
 * with the mappers in src/lib/types/mappers.ts.
 */

export interface ProfileRow {
  id: string;
  email: string | null;
  name: string;
  role: UserRole;
  company_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

/**
 * Structured PUBLIC (stage-1) tender data — the Oyu Tolgoi-style notice shape:
 * a tender can be short AND structured. Readable by everyone; nothing here is
 * confidential (confidential lives in `tender_private_details`).
 *
 * `eoi`   = Сонирхол илэрхийлэх урьдчилсан шат (preliminary stage)
 * `tender` = Үнийн санал авах (formal stage)
 */

/** Entry of `requirements`: `{ text, mandatory }` (jsonb on the row). */
export interface TenderRequirement {
  text: string;
  mandatory: boolean;
}

/** Entry of `evaluation_criteria`: `{ name, weight }`, weights sum to 100. */
export interface TenderEvaluationCriterion {
  name: string;
  weight: number;
}

export interface TenderRow {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  currency: string;
  region: string | null;
  status: TenderStatus;
  deadline: string;
  created_by_user_id: string;
  winner_proposal_id: string | null;
  created_at: string;
  /* Structured public fields (null/empty on rows created before they existed). */
  tender_type: TenderType | null;
  summary: string | null;
  scope_items: string[] | null;
  requirements: TenderRequirement[] | null;
  required_documents: string[] | null;
  evaluation_criteria: TenderEvaluationCriterion[] | null;
  local_preference: string | null;
  submission_language: SubmissionLanguage | null;
  contract_duration: string | null;
  qa_deadline: string | null;
  expected_award_date: string | null;
  has_attachments: boolean | null;
}

/**
 * Row shape of the public read model `public.public_tenders`: tender columns
 * plus the owner role, the MASKED owner name and the proposals count, so the
 * UI never needs the real (confidential) profile of the owner.
 */
export type PublicTenderRow = TenderRow & {
  owner_role: UserRole;
  owner_masked_name: string;
  owner_avatar_url: string | null;
  proposals_count: number;
};

export interface ProposalRow {
  id: string;
  tender_id: string;
  bidder_id: string;
  price_offer: string;
  proposal_text: string;
  /** Promised completion period in days (null on legacy rows). */
  duration_days: number | null;
  /** Bidder's own documents in the private `proposal-files` bucket. */
  attachments: TenderAttachment[];
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
}

/** Stage-2 confidential details (RLS: owner + shortlisted/accepted bidders). */
export interface TenderPrivateDetailsRow {
  tender_id: string;
  full_description: string;
  requirements: string | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  attachments: TenderAttachment[];
  created_at: string;
}

/** Entry of `tender_private_details.attachments` (jsonb array). */
export interface TenderAttachment {
  name: string;
  path: string;
  size?: number;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

/** Public profile shape used in UI. */
export interface Profile {
  id: string;
  email: string | null;
  name: string;
  role: UserRole;
  companyName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: string;
}

/** Owner info embedded in tender lists/details. */
export type TenderOwner = Pick<
  Profile,
  'id' | 'name' | 'role' | 'companyName' | 'avatarUrl'
>;

export interface Tender {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  currency: string;
  region: string | null;
  status: TenderStatus;
  deadline: string;
  createdByUserId: string;
  winnerProposalId: string | null;
  createdAt: string;
  /* Structured public fields — always arrays/nullable so old rows render fine. */
  tenderType: TenderType;
  summary: string | null;
  scopeItems: string[];
  /**
   * Eligibility requirements for BIDDERS (row column `requirements`).
   * Named `bidRequirements` in the domain/form layer because the confidential
   * tier has its own unrelated `requirements` text field.
   */
  bidRequirements: TenderRequirement[];
  requiredDocuments: string[];
  evaluationCriteria: TenderEvaluationCriterion[];
  localPreference: string | null;
  submissionLanguage: SubmissionLanguage;
  contractDuration: string | null;
  qaDeadline: string | null;
  expectedAwardDate: string | null;
  /** Whether confidential files exist (never their names). */
  hasAttachments: boolean;
}

export type TenderWithOwner = Tender & {
  owner: TenderOwner | null;
  /** Number of proposals (from the public read model). */
  proposalsCount: number;
};

/** Confidential stage-2 details as shown to the owner / shortlisted bidders. */
export interface TenderPrivateDetails {
  tenderId: string;
  fullDescription: string;
  requirements: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  attachments: TenderAttachment[];
}

/** Notification row as shown in the bell / dashboard. */
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface Proposal {
  id: string;
  tenderId: string;
  bidderId: string;
  priceOffer: string;
  proposalText: string;
  /** Promised completion period in days. */
  durationDays: number | null;
  /** Bidder's documents — only the owner and the bidder can fetch them. */
  attachments: TenderAttachment[];
  status: ProposalStatus;
  createdAt: string;
}

export type ProposalWithBidder = Proposal & {
  bidder: Pick<Profile, 'id' | 'name' | 'role' | 'companyName' | 'avatarUrl'> | null;
};

/** Typed result of a server action / API mutation. */
export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };
