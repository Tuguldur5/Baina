'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createTenderFullSchema,
  updateTenderSchema,
  closeTenderSchema,
  awardProposalSchema,
  shortlistProposalSchema,
  type CreateTenderFullInput,
} from '@/lib/validators/tender';
import {
  submitProposalSchema,
  updateProposalSchema,
  proposalIdSchema,
} from '@/lib/validators/proposal';
import {
  TENDER_FILES_BUCKET,
  TENDER_FILE_ACCEPTED_MIME_TYPES,
  TENDER_FILE_MAX_SIZE_BYTES,
  TENDER_FILES_MAX_COUNT,
  PROPOSAL_FILES_BUCKET,
  PROPOSAL_FILE_ACCEPTED_MIME_TYPES,
  PROPOSAL_FILE_MAX_SIZE_BYTES,
  PROPOSAL_FILES_MAX_COUNT,
  PROPOSAL_MIN_ATTACHMENTS,
} from '@/lib/constants';
import { mn } from '@/lib/i18n/mn';
import type { ActionResult, TenderAttachment } from '@/lib/types/index';

/**
 * Tender & proposal server actions.
 * Every action: re-validates input with Zod, checks the session, enforces
 * ownership / business rules (defense-in-depth on top of RLS) and returns a
 * typed ActionResult with Mongolian error messages. Parameterized queries only.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstError(error: { errors: { message: string }[] }): string {
  return error.errors[0]?.message ?? mn.errors.genericText;
}

/**
 * Suspended accounts are refused by the INSERT policies themselves
 * (db/admin.sql §12), and Postgres reports that as a raw policy error. Read
 * the caller's own profile status (RLS allows the own row) and return a clear
 * Mongolian notice instead of the engine message.
 */
async function insertErrorMessage(
  supabase: ReturnType<typeof createClient>,
  dbError: { message?: string } | null,
  fallback: string
): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .maybeSingle();

  if ((profile as { status?: string } | null)?.status === 'suspended') {
    return mn.errors.suspended;
  }
  return dbError?.message ?? fallback;
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(-80);
  return base || 'file';
}

function validateFiles(files: File[]): string | null {
  if (files.length > TENDER_FILES_MAX_COUNT) return mn.validation.filesMax;
  for (const file of files) {
    if (file.size > TENDER_FILE_MAX_SIZE_BYTES) return mn.validation.fileTooBig;
    if (
      !(TENDER_FILE_ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)
    ) {
      return mn.validation.fileInvalidType;
    }
  }
  return null;
}

/** Server-side twin of the proposal attachment rules (never trust the client). */
function validateProposalFiles(files: File[]): string | null {
  if (files.length < PROPOSAL_MIN_ATTACHMENTS) {
    return mn.validation.proposalAttachmentsMin;
  }
  if (files.length > PROPOSAL_FILES_MAX_COUNT) {
    return mn.validation.proposalFilesMax;
  }
  for (const file of files) {
    if (file.size > PROPOSAL_FILE_MAX_SIZE_BYTES) return mn.validation.fileTooBig;
    if (
      !(PROPOSAL_FILE_ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)
    ) {
      return mn.validation.fileInvalidType;
    }
  }
  return null;
}

function revalidateTender(id?: string) {
  revalidatePath('/');
  revalidatePath('/tenders');
  revalidatePath('/dashboard');
  if (id) revalidatePath(`/tenders/${id}`);
}

/**
 * Create a tender with its confidential details and attachments.
 * Accepts a FormData built by the form:
 *   - "payload": JSON of the validated create-tender input
 *   - "files":   optional attachment File list (max 5, 10MB each)
 * Compensating cleanup: if any step fails the tender row is removed again.
 */
export async function createTender(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const rawPayload = formData.get('payload');
  const parsed = createTenderFullSchema.safeParse(
    typeof rawPayload === 'string' ? JSON.parse(rawPayload) : null
  );
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const files = formData
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const fileError = validateFiles(files);
  if (fileError) {
    return { ok: false, error: fileError };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const data = parsed.data;

  // 1) public tender row
  const { data: tender, error: tenderError } = await supabase
    .from('tenders')
    .insert({
      title: data.title,
      description: data.description,
      category: data.category,
      region: data.region,
      budget: data.budget,
      currency: 'MNT',
      deadline: data.deadline,
      created_by_user_id: user.id,
      // Structured public (stage-1) fields. `has_attachments` only reveals
      // WHETHER confidential files exist — never their names.
      tender_type: data.tenderType,
      summary: data.summary,
      scope_items: data.scopeItems,
      requirements: data.bidRequirements,
      required_documents: data.requiredDocuments,
      evaluation_criteria: data.evaluationCriteria,
      local_preference: data.localPreference,
      submission_language: data.submissionLanguage,
      contract_duration: data.contractDuration,
      qa_deadline: data.qaDeadline,
      expected_award_date: data.expectedAwardDate,
      has_attachments: files.length > 0,
    })
    .select('id')
    .single();

  if (tenderError || !tender) {
    return {
      ok: false,
      error: await insertErrorMessage(supabase, tenderError, mn.errors.genericText),
    };
  }

  // 2) confidential stage-2 details (RLS: owner only)
  const { error: privateError } = await supabase
    .from('tender_private_details')
    .insert({
      tender_id: tender.id,
      full_description: data.fullDescription,
      requirements: data.requirements || null,
      address: data.address || null,
      contact_name: data.contactName || null,
      contact_phone: data.contactPhone || null,
      contact_email: data.contactEmail || null,
      attachments: [],
    });

  if (privateError) {
    await supabase.from('tenders').delete().eq('id', tender.id);
    return { ok: false, error: privateError.message };
  }

  // 3) attachments -> private `tender-files` bucket (path: <tenderId>/<file>)
  const uploaded: TenderAttachment[] = [];
  for (const file of files) {
    const path = `${tender.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(TENDER_FILES_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      await supabase.from('tenders').delete().eq('id', tender.id); // cascades
      return { ok: false, error: uploadError.message };
    }
    uploaded.push({ name: file.name, path, size: file.size });
  }

  if (uploaded.length > 0) {
    const { error: updateError } = await supabase
      .from('tender_private_details')
      .update({ attachments: uploaded })
      .eq('tender_id', tender.id);

    if (updateError) {
      await supabase.from('tenders').delete().eq('id', tender.id);
      return { ok: false, error: updateError.message };
    }
  }

  revalidateTender(tender.id);
  return { ok: true, data: { id: tender.id } };
}

/**
 * Submit a proposal on someone else's open tender.
 *
 * Accepts a FormData built by the modal:
 *   - "payload": JSON of { tenderId, priceOffer, durationDays, proposalText }
 *   - "files":   the bidder's documents (at least 1, at most 3, 10MB each),
 *                stored in the PRIVATE `proposal-files` bucket under
 *                <tenderId>/<bidderId>/<file> so no other party — bidders
 *                included, and the platform operator included — can read them.
 */
export async function submitProposal(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const rawPayload = formData.get('payload');
  if (typeof rawPayload !== 'string') {
    return { ok: false, error: mn.errors.genericText };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return { ok: false, error: mn.errors.genericText };
  }

  const files = formData
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const parsed = submitProposalSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  // The payload carries the attachments the client believes it uploaded. The
  // real files are what we just received, so the count must agree and the
  // server decides what actually lands in the bucket.
  const serverFileError = validateProposalFiles(files);
  if (serverFileError) {
    return { ok: false, error: serverFileError };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  // Load the tender to enforce business rules server-side.
  const { data: tender, error: tenderError } = await supabase
    .from('tenders')
    .select('id, status, deadline, created_by_user_id')
    .eq('id', parsed.data.tenderId)
    .single();

  if (tenderError || !tender) {
    return { ok: false, error: mn.errors.notFoundResource };
  }
  if (tender.created_by_user_id === user.id) {
    return { ok: false, error: mn.submitProposal.ownTender };
  }
  if (tender.status !== 'open') {
    return { ok: false, error: mn.submitProposal.notOpen };
  }
  if (new Date(tender.deadline).getTime() <= Date.now()) {
    return { ok: false, error: mn.submitProposal.expired };
  }

  // One proposal per bidder per tender (also UNIQUE constraint in DB).
  const { data: existing } = await supabase
    .from('proposals')
    .select('id')
    .eq('tender_id', parsed.data.tenderId)
    .eq('bidder_id', user.id)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: mn.submitProposal.alreadyExists };
  }

  // The proposal row is created first so a failed upload leaves nothing behind
  // (the row is removed again below).
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      tender_id: parsed.data.tenderId,
      bidder_id: user.id,
      price_offer: parsed.data.priceOffer,
      duration_days: parsed.data.durationDays,
      proposal_text: parsed.data.proposalText,
      attachments: [],
    })
    .select('id')
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: await insertErrorMessage(supabase, error, mn.errors.genericText),
    };
  }

  // Documents -> private `proposal-files` bucket.
  const uploaded: TenderAttachment[] = [];
  for (const file of files) {
    const path = `${parsed.data.tenderId}/${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(PROPOSAL_FILES_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      if (uploaded.length > 0) {
        await supabase.storage
          .from(PROPOSAL_FILES_BUCKET)
          .remove(uploaded.map((item) => item.path));
      }
      await supabase.from('proposals').delete().eq('id', data.id);
      return { ok: false, error: uploadError.message };
    }
    uploaded.push({ name: file.name, path, size: file.size });
  }

  const { error: attachError } = await supabase
    .from('proposals')
    .update({ attachments: uploaded })
    .eq('id', data.id)
    .eq('bidder_id', user.id);

  if (attachError) {
    await supabase.storage
      .from(PROPOSAL_FILES_BUCKET)
      .remove(uploaded.map((item) => item.path));
    await supabase.from('proposals').delete().eq('id', data.id);
    return { ok: false, error: attachError.message };
  }

  revalidateTender(parsed.data.tenderId);
  return { ok: true, data: { id: data.id } };
}

/** Bidder edits their own proposal (only while pending + tender open). */
export async function updateProposal(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateProposalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, tender_id, bidder_id, status, tenders(status, deadline)')
    .eq('id', parsed.data.proposalId)
    .maybeSingle();

  const tenderRef = (proposal as unknown as {
    tenders?: { status: string; deadline: string } | { status: string; deadline: string }[];
  } | null)?.tenders;
  const tender = Array.isArray(tenderRef) ? tenderRef[0] : tenderRef;

  if (!proposal || proposal.bidder_id !== user.id) {
    return { ok: false, error: mn.errors.forbidden };
  }
  if (proposal.status !== 'pending') {
    return { ok: false, error: mn.tenderDetail.noAccess };
  }
  if (!tender || tender.status !== 'open') {
    return { ok: false, error: mn.submitProposal.notOpen };
  }
  if (new Date(tender.deadline).getTime() <= Date.now()) {
    return { ok: false, error: mn.submitProposal.expired };
  }

  // Attachments are deliberately NOT editable here: replacing a document would
  // orphan the old object in the private bucket. Editing price, period and text
  // keeps the originally submitted paperwork valid.
  const { error } = await supabase
    .from('proposals')
    .update({
      price_offer: parsed.data.priceOffer,
      duration_days: parsed.data.durationDays,
      proposal_text: parsed.data.proposalText,
    })
    .eq('id', parsed.data.proposalId)
    .eq('bidder_id', user.id)
    .eq('status', 'pending');

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTender(proposal.tender_id);
  return { ok: true, data: { id: parsed.data.proposalId } };
}

/** Bidder withdraws their own pending proposal. */
export async function withdrawProposal(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = proposalIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, tender_id, bidder_id, status')
    .eq('id', parsed.data)
    .maybeSingle();

  if (!proposal || proposal.bidder_id !== user.id) {
    return { ok: false, error: mn.errors.forbidden };
  }
  if (proposal.status !== 'pending') {
    return { ok: false, error: mn.tenderDetail.noAccess };
  }

  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', parsed.data)
    .eq('bidder_id', user.id)
    .eq('status', 'pending');

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTender(proposal.tender_id);
  return { ok: true, data: { id: parsed.data } };
}

/** Owner closes their own tender. */
export async function closeTender(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = closeTenderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  // RLS restricts updates to the owner; explicit check for a clear message.
  const { data: tender } = await supabase
    .from('tenders')
    .select('id, created_by_user_id')
    .eq('id', parsed.data.tenderId)
    .maybeSingle();
  if (!tender || tender.created_by_user_id !== user.id) {
    return { ok: false, error: mn.errors.forbidden };
  }

  const { error } = await supabase
    .from('tenders')
    .update({ status: 'closed' })
    .eq('id', parsed.data.tenderId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTender(parsed.data.tenderId);
  return { ok: true, data: { id: parsed.data.tenderId } };
}

/**
 * Owner shortlists a proposal — delegated to the atomic SECURITY DEFINER RPC
 * `shortlist_proposal` (checks ownership inside the database).
 */
export async function shortlistProposal(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = shortlistProposalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const { error } = await supabase.rpc('shortlist_proposal', {
    p_proposal_id: parsed.data.proposalId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTender(parsed.data.tenderId);
  return { ok: true, data: { id: parsed.data.proposalId } };
}

/**
 * Owner awards a proposal — delegated to the atomic SECURITY DEFINER RPC
 * `award_proposal` (winner accepted, tender awarded, others rejected).
 */
export async function awardProposal(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = awardProposalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const { error } = await supabase.rpc('award_proposal', {
    p_proposal_id: parsed.data.proposalId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTender(parsed.data.tenderId);
  return { ok: true, data: { id: parsed.data.tenderId } };
}

/**
 * Owner edits their tender (public fields + confidential details).
 *
 * FormData: "tenderId" + "payload" (JSON of the create shape). Attachments are
 * deliberately NOT editable — replacing a document would orphan the object in
 * the private bucket (same rule as proposal editing).
 *
 * Refused when:
 *   - the viewer is not the owner (RLS would refuse too, this is for the message)
 *   - the tender is closed/awarded or its deadline has passed
 *   - a proposal is already shortlisted or accepted AND the edit would change
 *     the SCOPE of the competition (a bidder decided on one scope; silently
 *     rewriting it would make their bid meaningless)
 */
export async function updateTender(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const tenderId = String(formData.get('tenderId') ?? '');
  const rawPayload = formData.get('payload');
  if (!UUID_RE.test(tenderId)) {
    return { ok: false, error: mn.errors.notFoundResource };
  }

  const parsed = updateTenderSchema.safeParse(
    typeof rawPayload === 'string' ? JSON.parse(rawPayload) : null
  );
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const { data: tender } = await supabase
    .from('tenders')
    .select(
      'id, created_by_user_id, status, deadline, tender_type, summary, scope_items, requirements, required_documents, evaluation_criteria, local_preference, submission_language, contract_duration, qa_deadline, expected_award_date'
    )
    .eq('id', tenderId)
    .maybeSingle();

  if (!tender || tender.created_by_user_id !== user.id) {
    return { ok: false, error: mn.errors.forbidden };
  }
  if (tender.status !== 'open' || new Date(tender.deadline).getTime() <= Date.now()) {
    return { ok: false, error: mn.tenderDetail.editOnlyOpen };
  }

  const data = parsed.data;

  // Scope-changing edits are locked once the owner has already advanced a bid.
  const { data: decided } = await supabase
    .from('proposals')
    .select('id')
    .eq('tender_id', tenderId)
    .in('status', ['shortlisted', 'accepted'])
    .limit(1);
  const scopeLocked = (decided ?? []).length > 0;

  const scopeChanged =
    JSON.stringify(tender.scope_items ?? []) !== JSON.stringify(data.scopeItems) ||
    JSON.stringify(tender.requirements ?? []) !== JSON.stringify(data.bidRequirements) ||
    JSON.stringify(tender.required_documents ?? []) !==
      JSON.stringify(data.requiredDocuments) ||
    JSON.stringify(tender.evaluation_criteria ?? []) !==
      JSON.stringify(data.evaluationCriteria) ||
    tender.deadline !== data.deadline ||
    tender.tender_type !== data.tenderType;

  if (scopeLocked && scopeChanged) {
    return { ok: false, error: mn.tenderDetail.editScopeLocked };
  }

  const { error: updateError } = await supabase
    .from('tenders')
    .update({
      title: data.title,
      description: data.description,
      category: data.category,
      region: data.region,
      budget: data.budget,
      deadline: data.deadline,
      tender_type: data.tenderType,
      summary: data.summary,
      scope_items: data.scopeItems,
      requirements: data.bidRequirements,
      required_documents: data.requiredDocuments,
      evaluation_criteria: data.evaluationCriteria,
      local_preference: data.localPreference,
      submission_language: data.submissionLanguage,
      contract_duration: data.contractDuration,
      qa_deadline: data.qaDeadline,
      expected_award_date: data.expectedAwardDate,
    })
    .eq('id', tenderId)
    .eq('created_by_user_id', user.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const { error: privateError } = await supabase
    .from('tender_private_details')
    .update({
      full_description: data.fullDescription,
      requirements: data.requirements || null,
      address: data.address || null,
      contact_name: data.contactName || null,
      contact_phone: data.contactPhone || null,
      contact_email: data.contactEmail || null,
    })
    .eq('tender_id', tenderId);

  if (privateError) {
    return { ok: false, error: privateError.message };
  }

  revalidateTender(tenderId);
  return { ok: true, data: { id: tenderId } };
}

/** Owner rejects a single proposal (without awarding the tender). */
export async function rejectProposal(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = shortlistProposalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, tender_id, tenders(created_by_user_id)')
    .eq('id', parsed.data.proposalId)
    .maybeSingle();

  const ownerRef = (proposal as unknown as {
    tenders?:
      | { created_by_user_id: string }
      | { created_by_user_id: string }[];
  } | null)?.tenders;
  const owner = Array.isArray(ownerRef) ? ownerRef[0] : ownerRef;

  if (!proposal || owner?.created_by_user_id !== user.id) {
    return { ok: false, error: mn.errors.forbidden };
  }

  const { error } = await supabase
    .from('proposals')
    .update({ status: 'rejected' })
    .eq('id', parsed.data.proposalId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTender(parsed.data.tenderId);
  return { ok: true, data: { id: parsed.data.proposalId } };
}
