import { z } from 'zod';
import { mn } from '@/lib/i18n/mn';
import {
  PROPOSAL_FILES_MAX_COUNT,
  PROPOSAL_MAX_DURATION_DAYS,
  PROPOSAL_MIN_ATTACHMENTS,
  PROPOSAL_TEXT_MAX_LENGTH,
  PROPOSAL_TEXT_MIN_LENGTH,
} from '@/lib/constants';

const MAX_MONEY = 99_999_999_999_999;

/**
 * Money input: raw form strings and already-parsed numbers are both accepted
 * (react-hook-form hands the resolver OUTPUT to the server action, which then
 * re-validates the same schema server-side).
 */
const moneyField = z
  .union([z.string(), z.number()])
  .refine(
    (v) => Number.isFinite(Number(v)) && Number(v) > 0,
    mn.validation.pricePositive
  )
  .refine((v) => Number(v) <= MAX_MONEY, mn.validation.budgetMax)
  .transform((v) => Number(v));

/**
 * How long the bidder needs to finish the job, in days. Required: a tender
 * without a promised period cannot be compared against the others.
 */
const durationDaysField = z
  .union([z.string(), z.number()])
  .refine(
    (v) => Number.isInteger(Number(v)) && Number(v) > 0,
    mn.validation.durationPositive
  )
  .refine(
    (v) => Number(v) <= PROPOSAL_MAX_DURATION_DAYS,
    mn.validation.durationMax
  )
  .transform((v) => Number(v));

const proposalTextField = z
  .string()
  .trim()
  .min(PROPOSAL_TEXT_MIN_LENGTH, mn.validation.proposalTextMin)
  .max(PROPOSAL_TEXT_MAX_LENGTH, mn.validation.proposalTextMax);

/**
 * Files already uploaded to the `proposal-files` bucket. The upload happens in
 * the server action, so the client only ever gets an id list back — these rows
 * are what the action writes into `proposals.attachments`.
 */
export const proposalAttachmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  path: z.string().trim().min(1),
  size: z.number().int().nonnegative().optional(),
});
export type ProposalAttachmentInput = z.infer<typeof proposalAttachmentSchema>;

/**
 * Schema for the submit-proposal modal (client + server).
 *
 * The FILES travel as real FormData parts (they must be uploaded), so this
 * schema only covers the JSON fields. The attachment requirement is enforced
 * twice: here on the client via `attachmentsSatisfied`, and again on the server
 * against the received File list (`validateProposalFiles` in the action), because
 * a client-side check is never a guarantee.
 *
 * Form inputs are strings; output converts priceOffer/durationDays to numbers.
 */
export const submitProposalSchema = z.object({
  tenderId: z.string().uuid(mn.validation.required),
  priceOffer: moneyField,
  durationDays: durationDaysField,
  proposalText: proposalTextField,
});

/** Number of documents a proposal must carry (1..3) — see constants. */
export const attachmentsSatisfied = (count: number): boolean =>
  count >= PROPOSAL_MIN_ATTACHMENTS && count <= PROPOSAL_FILES_MAX_COUNT;
export type SubmitProposalInput = z.input<typeof submitProposalSchema>;
export type SubmitProposalData = z.output<typeof submitProposalSchema>;

/** Single proposal id (edit / withdraw / owner actions). */
export const proposalIdSchema = z.string().uuid(mn.validation.required);

/**
 * Bidder edits their own pending proposal — same rules as submitting, except
 * that attachments are carried over from the original bid (editing text,
 * price and period does not invalidate an already-uploaded document).
 */
export const updateProposalSchema = z.object({
  proposalId: z.string().uuid(mn.validation.required),
  priceOffer: moneyField,
  durationDays: durationDaysField,
  proposalText: proposalTextField,
});
export type UpdateProposalInput = z.input<typeof updateProposalSchema>;

/** Tender owner changes a proposal status (shortlist / reject). */
export const updateProposalStatusSchema = z.object({
  proposalId: z.string().uuid(mn.validation.required),
  status: z.enum(['shortlisted', 'rejected'], {
    errorMap: () => ({ message: mn.validation.required }),
  }),
});
export type UpdateProposalStatusInput = z.infer<typeof updateProposalStatusSchema>;
