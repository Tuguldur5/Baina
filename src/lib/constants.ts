/**
 * App-wide constants (not user-facing text; user-facing strings live in src/lib/i18n/mn.ts).
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** Tender list page size. */
export const ITEMS_PER_PAGE = 12;

/**
 * Stage-1 (public) tender description bounds.
 *
 * Single source of truth: the Zod validator, the create form's `maxLength` and
 * the `tenders_description_short_check` DB constraint all have to agree — when
 * only the validator and the DB were raised to 2000 the form still stopped the
 * user at 600, so the larger limit was unreachable from the UI.
 */
export const TENDER_DESCRIPTION_MIN_LENGTH = 20;
export const TENDER_DESCRIPTION_MAX_LENGTH = 2000;

/** Avatar upload constraints (validated on client AND server). */
export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const AVATAR_ACCEPTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;
export const AVATAR_STORAGE_BUCKET = 'avatars';
export const AVATAR_STORAGE_FOLDER = 'avatars';

/** Tender attachment constraints (validated on client AND server). */
export const TENDER_FILES_BUCKET = 'tender-files';
export const TENDER_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const TENDER_FILES_MAX_COUNT = 5;
export const TENDER_FILE_ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
] as const;

/**
 * Proposal attachment constraints (validated on client AND server).
 * Files live in the PRIVATE `proposal-files` bucket, path
 * `<tender_id>/<bidder_id>/<file>` — sealed from the platform operator and
 * from every other bidder (see db/storage.sql).
 */
export const PROPOSAL_FILES_BUCKET = 'proposal-files';
export const PROPOSAL_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const PROPOSAL_FILES_MAX_COUNT = 3;
export const PROPOSAL_FILE_ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
] as const;

/**
 * Minimum bar for a proposal. A two-line "Би хийж чадна" bid wastes the poster's
 * time, so the bidder must submit a real price, a real completion period and at
 * least one document (offer, licence, portfolio, CV...).
 */
export const PROPOSAL_TEXT_MIN_LENGTH = 50;
export const PROPOSAL_TEXT_MAX_LENGTH = 3000;
export const PROPOSAL_MIN_ATTACHMENTS = 1;
export const PROPOSAL_MAX_DURATION_DAYS = 3650;

/** Password policy. */
export const PASSWORD_MIN_LENGTH = 8;

/** Layout. */
export const HEADER_HEIGHT_PX = 64;
export const MOBILE_BREAKPOINT_PX = 768;
export const MIN_TOUCH_TARGET_PX = 44;

/** Domain enums (mirror DB check constraints). */
export const USER_ROLES = ['user', 'company'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const TENDER_STATUSES = ['open', 'closed', 'awarded'] as const;
export type TenderStatus = (typeof TENDER_STATUSES)[number];

export const PROPOSAL_STATUSES = ['pending', 'shortlisted', 'accepted', 'rejected'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** Regions offered in tender filters/forms (mirror the seed values). */
export const REGIONS = [
  'Улаанбаатар',
  'Дархан-Уул',
  'Орхон',
  'Хөвсгөл',
  'Өмнөговь',
  'Бусад аймаг',
] as const;
export type Region = (typeof REGIONS)[number];

/** Notification types created by the DB triggers (see db/schema.sql). */
export const NOTIFICATION_TYPES = [
  'proposal_received',
  'proposal_shortlisted',
  'proposal_accepted',
  'proposal_rejected',
  'tender_closed',
  'welcome',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const SUPPORTED_CURRENCIES = ['MNT'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Rate limits (in-memory LRU in middleware; replace with Upstash Redis in production).
 */
export const RATE_LIMITS = {
  api: { limit: 60, windowMs: 60_000 },
  auth: { limit: 5, windowMs: 60_000 },
} as const;
