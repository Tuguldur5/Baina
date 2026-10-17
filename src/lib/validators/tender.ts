import { z } from 'zod';
import { mn } from '@/lib/i18n/mn';
import {
  CONTRACT_DURATION_MAX_LENGTH,
  EVALUATION_CRITERIA_MAX,
  EVALUATION_CRITERION_NAME_MAX,
  EVALUATION_WEIGHT_TOTAL,
  LOCAL_PREFERENCE_MAX_LENGTH,
  REGIONS,
  REQUIRED_DOCUMENT_MAX_LENGTH,
  REQUIRED_DOCUMENTS_MAX,
  REQUIREMENTS_MAX,
  REQUIREMENT_MAX_LENGTH,
  SCOPE_ITEMS_MAX,
  SCOPE_ITEM_MAX_LENGTH,
  SUBMISSION_LANGUAGES,
  TENDER_DESCRIPTION_MAX_LENGTH,
  TENDER_DESCRIPTION_MIN_LENGTH,
  TENDER_STATUSES,
  TENDER_SUMMARY_MAX_LENGTH,
  TENDER_TYPES,
  USER_ROLES,
} from '@/lib/constants';

/** numeric(14,2) upper bound. */
const MAX_MONEY = 99_999_999_999_999;

const CATEGORY_VALUES = mn.categories.list as unknown as [string, ...string[]];
const REGION_VALUES = REGIONS as unknown as [string, ...string[]];

export const TENDER_SORTS = ['newest', 'deadline', 'budgetHigh', 'budgetLow'] as const;
export type TenderSort = (typeof TENDER_SORTS)[number];

/**
 * Public (stage-1) fields — visible to everyone.
 *
 * Kept as a plain field map so the full create schema below can spread the
 * same fields (ZodEffects has no `.shape`).
 */
const tenderPublicFields = {
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

    /* --------------------------------------------------------------------- */
    /* Structured public (stage-1) fields — Oyu Tolgoi-style notice shape.    */
    /* Everything below is readable by anyone; confidential data belongs in   */
    /* `privateDetailsSchema`. Old clients may omit it all (defaults apply).  */
    /* --------------------------------------------------------------------- */

    // eoi = Сонирхол илэрхийлэх урьдчилсан шат, tender = Үнийн санал авах
    tenderType: z.enum(TENDER_TYPES, {
      errorMap: () => ({ message: mn.validation.required }),
    }).default('tender'),

    // The invitation / intro paragraph (the card keeps `description`).
    summary: z
      .string()
      .trim()
      .max(TENDER_SUMMARY_MAX_LENGTH, mn.validation.summaryMax)
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v : null)),

    scopeItems: z
      .array(
        z
          .string()
          .trim()
          .min(1, mn.validation.scopeItemRequired)
          .max(SCOPE_ITEM_MAX_LENGTH, mn.validation.scopeItemMax)
      )
      .max(SCOPE_ITEMS_MAX, mn.validation.scopeItemsMax)
      .default([]),

    // Public eligibility requirements. Named `bidRequirements` because the
    // confidential `requirements` text below would otherwise collide in the
    // merged create/edit schema.
    bidRequirements: z
      .array(
        z.object({
          text: z
            .string()
            .trim()
            .min(1, mn.validation.scopeItemRequired)
            .max(REQUIREMENT_MAX_LENGTH, mn.validation.requirementMax),
          mandatory: z.boolean().default(false),
        })
      )
      .max(REQUIREMENTS_MAX, mn.validation.requirementsMax)
      .default([]),

    requiredDocuments: z
      .array(
        z
          .string()
          .trim()
          .min(1, mn.validation.scopeItemRequired)
          .max(REQUIRED_DOCUMENT_MAX_LENGTH, mn.validation.documentMax)
      )
      .max(REQUIRED_DOCUMENTS_MAX, mn.validation.documentsMax)
      .default([]),

    // Weights must add up to 100 when at least one criterion exists — the DB
    // enforces the same rule (public.tenders_evaluation_ok).
    evaluationCriteria: z
      .array(
        z.object({
          name: z
            .string()
            .trim()
            .min(1, mn.validation.scopeItemRequired)
            .max(EVALUATION_CRITERION_NAME_MAX, mn.validation.criterionNameMax),
          weight: z.coerce
            .number()
            .int(mn.validation.criterionWeightRange)
            .min(1, mn.validation.criterionWeightRange)
            .max(100, mn.validation.criterionWeightRange),
        })
      )
      .max(EVALUATION_CRITERIA_MAX, mn.validation.criteriaMax)
      .default([])
      .superRefine((items, ctx) => {
        if (items.length === 0) return;
        const sum = items.reduce((total, item) => total + item.weight, 0);
        if (sum !== EVALUATION_WEIGHT_TOTAL) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: mn.validation.criteriaWeightSum,
          });
        }
      }),

    localPreference: z
      .string()
      .trim()
      .max(LOCAL_PREFERENCE_MAX_LENGTH, mn.validation.localPreferenceMax)
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v : null)),

    submissionLanguage: z.enum(SUBMISSION_LANGUAGES, {
      errorMap: () => ({ message: mn.validation.required }),
    }).default('mn'),

    contractDuration: z
      .string()
      .trim()
      .max(CONTRACT_DURATION_MAX_LENGTH, mn.validation.contractDurationMax)
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v : null)),

    // Optional question window: <input type="datetime-local"> -> ISO (nullable).
    qaDeadline: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), mn.validation.deadlineFuture)
      .transform((v) => (v ? new Date(v).toISOString() : null)),

    // Optional expected award date: 'YYYY-MM-DD' -> same shape for the date column.
    expectedAwardDate: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), mn.validation.deadlineFuture)
      .transform((v) => (v ? new Date(v).toISOString().slice(0, 10) : null)),
  };

/** Cross-field rules that need more than one field at a time. */
function refinePublicDates(
  data: { deadline: string; qaDeadline: string | null; expectedAwardDate: string | null },
  ctx: z.RefinementCtx
) {
  if (data.qaDeadline && Date.parse(data.qaDeadline) >= Date.parse(data.deadline)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['qaDeadline'],
      message: mn.validation.qaDeadlinePast,
    });
  }
  // Both sides are ISO strings, so a lexicographic compare is a date compare.
  if (data.expectedAwardDate && data.expectedAwardDate >= data.deadline.slice(0, 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expectedAwardDate'],
      message: mn.validation.awardDateAfterDeadline,
    });
  }
}

/** Public (stage-1) fields — visible to everyone. */
export const createTenderSchema = z
  .object(tenderPublicFields)
  .superRefine(refinePublicDates);

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
export const createTenderFullSchema = z
  .object({
    ...tenderPublicFields,
    ...privateDetailsSchema.shape,
  })
  .superRefine(refinePublicDates);
export type CreateTenderFullInput = z.input<typeof createTenderFullSchema>;
export type CreateTenderFullData = z.output<typeof createTenderFullSchema>;

/**
 * The edit form submits the same shape as create. Which fields may actually
 * change is decided by the SERVER (see `updateTender` in actions/tenders.ts):
 * a tender that is closed/awarded or already has a shortlisted proposal keeps
 * its scope, so the action refuses scope-changing edits.
 */
export const updateTenderSchema = createTenderFullSchema;
export type UpdateTenderInput = z.input<typeof updateTenderSchema>;

export const updateTenderIdSchema = z.object({
  tenderId: z.string().uuid(mn.validation.required),
});

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
