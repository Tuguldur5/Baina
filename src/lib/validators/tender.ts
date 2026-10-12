import { z } from 'zod';
import { mn } from '@/lib/i18n/mn';
import {
  REGIONS,
  TENDER_DESCRIPTION_MAX_LENGTH,
  TENDER_DESCRIPTION_MIN_LENGTH,
  TENDER_STATUSES,
  USER_ROLES,
} from '@/lib/constants';

/** numeric(14,2) upper bound. */
const MAX_MONEY = 99_999_999_999_999;

const CATEGORY_VALUES = mn.categories.list as unknown as [string, ...string[]];
const REGION_VALUES = REGIONS as unknown as [string, ...string[]];

export const TENDER_SORTS = ['newest', 'deadline', 'budgetHigh', 'budgetLow'] as const;
export type TenderSort = (typeof TENDER_SORTS)[number];

/** Public (stage-1) fields — visible to everyone. */
export const createTenderSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, mn.validation.titleMin)
      .max(150, mn.validation.titleMax),
    // Stage-1 (public) description: room for scope, work experience and
    // requirements, but still scannable on a card. Contact details, addresses
    // and attachments stay in the confidential stage-2 tier.
    description: z
      .string()
      .trim()
      .min(TENDER_DESCRIPTION_MIN_LENGTH, mn.validation.descriptionMin)
      .max(TENDER_DESCRIPTION_MAX_LENGTH, mn.validation.descriptionMax),
    category: z.enum(CATEGORY_VALUES, {
      errorMap: () => ({ message: mn.validation.categoryRequired }),
    }),
    region: z.enum(REGION_VALUES, {
      errorMap: () => ({ message: mn.validation.regionRequired }),
    }),
    // Accepts a raw form string OR an already-parsed number (server re-validation).
    budget: z
      .union([z.string(), z.number()])
      .refine(
        (v) => Number.isFinite(Number(v)) && Number(v) > 0,
        mn.validation.budgetPositive
      )
      .refine((v) => Number(v) <= MAX_MONEY, mn.validation.budgetMax)
      .transform((v) => Number(v)),
    // "YYYY-MM-DDTHH:mm" from <input type="datetime-local"> -> ISO string
    deadline: z
      .string()
      .trim()
      .min(1, mn.validation.deadlineFuture)
      .refine(
        (v) => !Number.isNaN(Date.parse(v)) && Date.parse(v) > Date.now(),
        mn.validation.deadlineFuture
      )
      .transform((v) => new Date(v).toISOString()),
  });
export type CreateTenderInput = z.input<typeof createTenderSchema>;
export type CreateTenderData = z.output<typeof createTenderSchema>;

/** Confidential (stage-2) fields — owner + shortlisted bidders only. */
export const privateDetailsSchema = z.object({
  fullDescription: z
    .string()
    .trim()
    .min(20, mn.validation.fullDescriptionMin)
    .max(20000, mn.validation.fullDescriptionMax),
  requirements: z.string().trim().max(10000).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  contactName: z.string().trim().max(150).optional().or(z.literal('')),
  contactPhone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[0-9]{8}$/.test(v), mn.validation.phone)
    .optional()
    .or(z.literal('')),
  contactEmail: z
    .string()
    .trim()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, mn.validation.email)
    .optional()
    .or(z.literal('')),
});
export type PrivateDetailsInput = z.input<typeof privateDetailsSchema>;

/** Everything the create form submits (public + confidential). */
export const createTenderFullSchema = z.object({
  ...createTenderSchema.shape,
  ...privateDetailsSchema.shape,
});
export type CreateTenderFullInput = z.input<typeof createTenderFullSchema>;
export type CreateTenderFullData = z.output<typeof createTenderFullSchema>;

/** Tender owner closes their tender. */
export const closeTenderSchema = z.object({
  tenderId: z.string().uuid(mn.validation.required),
});

export const awardProposalSchema = z.object({
  tenderId: z.string().uuid(mn.validation.required),
  proposalId: z.string().uuid(mn.validation.required),
});

export const shortlistProposalSchema = z.object({
  tenderId: z.string().uuid(mn.validation.required),
  proposalId: z.string().uuid(mn.validation.required),
});

/** Filters driven by URL search params on /tenders. */
export const tenderFiltersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  region: z.enum(REGION_VALUES).optional(),
  status: z.enum(TENDER_STATUSES).optional(),
  owner: z.enum(USER_ROLES).optional(),
  min: z.coerce.number().nonnegative().optional(),
  max: z.coerce.number().nonnegative().optional(),
  sort: z.enum(TENDER_SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
});
export type TenderFiltersInput = z.infer<typeof tenderFiltersSchema>;
