'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Check, FileText, Paperclip, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import {
  attachmentsSatisfied,
  submitProposalSchema,
  updateProposalSchema,
} from '@/lib/validators/proposal';
import { submitProposal, updateProposal } from '@/lib/actions/tenders';
import {
  PROPOSAL_FILES_MAX_COUNT,
  PROPOSAL_FILE_ACCEPTED_MIME_TYPES,
  PROPOSAL_FILE_MAX_SIZE_BYTES,
  PROPOSAL_TEXT_MAX_LENGTH,
  PROPOSAL_TEXT_MIN_LENGTH,
} from '@/lib/constants';
import { mn } from '@/lib/i18n/mn';
import type { ProposalRow } from '@/lib/types/index';

interface FormValues {
  priceOffer: string;
  durationDays: string;
  proposalText: string;
}

/** One document the bidder attached to the bid. */
interface PickedFile {
  file: File;
  id: string;
}

/**
 * Submit a proposal — or EDIT the viewer's own pending proposal when
 * `existing` is provided (edit only happens while the tender is still open).
 *
 * The bid must clear a minimum bar (see PROPOSAL_* in src/lib/constants.ts):
 * a price, a promised completion period, a real work plan, and at least one
 * document. That is what stops a one-line junk bid from reaching the poster.
 * The same rules are re-checked in the server action.
 */
export function SubmitProposalModal({
  open,
  onClose,
  tenderId,
  tenderTitle,
  existing = null,
}: {
  open: boolean;
  onClose: () => void;
  tenderId: string;
  tenderTitle: string;
  existing?: ProposalRow | null;
}) {
  const toast = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { priceOffer: '', durationDays: '', proposalText: '' },
  });

  // Prefill when the modal opens (new proposal vs. edit).
  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setFileError(null);
    setPicked([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setValue('priceOffer', existing ? String(existing.price_offer) : '');
    setValue('durationDays', existing?.duration_days ? String(existing.duration_days) : '');
    setValue('proposalText', existing?.proposal_text ?? '');
  }, [open, existing, setValue]);

  const textLength = (watch('proposalText') ?? '').trim().length;
  const textShort = textLength > 0 && textLength < PROPOSAL_TEXT_MIN_LENGTH;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    setFileError(null);

    for (const file of incoming) {
      if (file.size > PROPOSAL_FILE_MAX_SIZE_BYTES) {
        setFileError(mn.validation.fileTooBig);
        return;
      }
      if (
        !(PROPOSAL_FILE_ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)
      ) {
        setFileError(mn.validation.fileInvalidType);
        return;
      }
    }

    setPicked((current) => {
      const merged = [
        ...current,
        ...incoming.map((file, index) => ({
          file,
          id: `${file.name}-${file.size}-${index}-${current.length}`,
        })),
      ].slice(0, PROPOSAL_FILES_MAX_COUNT);
      if (current.length + incoming.length > PROPOSAL_FILES_MAX_COUNT) {
        setFileError(mn.validation.proposalFilesMax);
      }
      return merged;
    });
  };

  const removePicked = (id: string) => {
    setPicked((current) => current.filter((item) => item.id !== id));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const showIssue = (
    issues: { path: (string | number)[]; message: string }[],
    formSetError: typeof setError
  ) => {
    const issue = issues[0];
    if (issue) {
      formSetError(issue.path[0] as keyof FormValues, { message: issue.message });
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);

    if (existing) {
      const payload = {
        proposalId: existing.id,
        priceOffer: values.priceOffer,
        durationDays: values.durationDays,
        proposalText: values.proposalText,
      };
      const parsed = updateProposalSchema.safeParse(payload);
      if (!parsed.success) {
        showIssue(parsed.error.issues, setError);
        return;
      }
      const result = await updateProposal(payload);
      if (result.ok) {
        toast.success(mn.submitProposal.successUpdate);
        onClose();
      } else {
        setSubmitError(result.error);
        toast.error(result.error);
      }
      return;
    }

    // Attachments are required, so the check happens before the round-trip.
    if (!attachmentsSatisfied(picked.length)) {
      setFileError(mn.submitProposal.fields.attachmentsRequired);
      return;
    }

    const payload = {
      tenderId,
      priceOffer: values.priceOffer,
      durationDays: values.durationDays,
      proposalText: values.proposalText,
    };
    const parsed = submitProposalSchema.safeParse(payload);
    if (!parsed.success) {
      showIssue(parsed.error.issues, setError);
      return;
    }

    const formData = new FormData();
    formData.append('payload', JSON.stringify(parsed.data));
    for (const item of picked) formData.append('files', item.file);

    const result = await submitProposal(formData);
    if (result.ok) {
      toast.success(mn.submitProposal.success);
      onClose();
    } else {
      setSubmitError(result.error);
      toast.error(result.error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? mn.tenderDetail.editProposal : mn.submitProposal.title}
      description={tenderTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {mn.common.cancel}
          </Button>
          <Button
            type="submit"
            form="submit-proposal-form"
            loading={isSubmitting}
            className="min-w-[9rem]"
          >
            {existing ? mn.submitProposal.update : mn.submitProposal.submit}
          </Button>
        </>
      }
    >
      <form
        id="submit-proposal-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {!existing && (
          <div className="rounded-2xl bg-surface-2 p-4">
            <p className="text-sm font-semibold text-text">
              {mn.submitProposal.requirementsTitle}
            </p>
            <ul className="mt-2 space-y-1.5">
              {mn.submitProposal.requirements.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-5 text-muted">
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={mn.submitProposal.fields.price}
            placeholder={mn.submitProposal.fields.pricePlaceholder}
            inputMode="numeric"
            error={errors.priceOffer?.message}
            disabled={isSubmitting}
            {...register('priceOffer')}
          />
          <Input
            label={mn.submitProposal.fields.duration}
            placeholder={mn.submitProposal.fields.durationPlaceholder}
            inputMode="numeric"
            error={errors.durationDays?.message}
            disabled={isSubmitting}
            {...register('durationDays')}
          />
        </div>

        <div>
          <Textarea
            label={mn.submitProposal.fields.text}
            placeholder={mn.submitProposal.fields.textPlaceholder}
            rows={6}
            maxLength={PROPOSAL_TEXT_MAX_LENGTH}
            error={errors.proposalText?.message}
            disabled={isSubmitting}
            {...register('proposalText')}
          />
          <p
            className={`mt-1 text-right text-xs ${
              textShort ? 'text-warning-700 dark:text-warning-400' : 'text-muted'
            }`}
          >
            {textLength}/{PROPOSAL_TEXT_MIN_LENGTH}
          </p>
        </div>

        {existing ? (
          existing.attachments.length > 0 && (
            <div className="rounded-2xl border border-border p-4">
              <p className="text-sm font-medium text-text">
                {mn.submitProposal.fields.attachmentsExisting}
              </p>
              <ul className="mt-2 space-y-1.5">
                {existing.attachments.map((attachment) => (
                  <li
                    key={attachment.path}
                    className="flex items-center gap-2 text-sm text-muted"
                  >
                    <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{attachment.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-border p-4">
            <label
              htmlFor="proposal-files"
              className="flex items-center gap-2 text-sm font-medium text-text"
            >
              <Paperclip className="h-4 w-4 text-muted" aria-hidden="true" />
              {mn.submitProposal.fields.attachments}
            </label>
            <p className="mt-1 text-xs text-muted">
              {mn.submitProposal.fields.attachmentsHint}
            </p>

            <input
              id="proposal-files"
              ref={fileInputRef}
              type="file"
              multiple
              accept={PROPOSAL_FILE_ACCEPTED_MIME_TYPES.join(',')}
              disabled={isSubmitting}
              onChange={(event) => addFiles(event.target.files)}
              className="mt-3 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-text hover:file:bg-primary-50 hover:file:text-primary-700"
            />

            {fileError && (
              <p className="mt-2 text-xs text-danger-600">{fileError}</p>
            )}

            {picked.length > 0 && (
              <ul className="mt-3 space-y-2">
                {picked.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm text-text">
                      <FileText
                        className="h-4 w-4 shrink-0 text-muted"
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.file.name}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removePicked(item.id)}
                      aria-label={`${mn.common.delete}: ${item.file.name}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-danger-600 transition-colors hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {submitError && <p className="text-sm text-danger-600">{submitError}</p>}
      </form>
    </Modal>
  );
}
