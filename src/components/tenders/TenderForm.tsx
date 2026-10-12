'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eye, FileText, Lock, Paperclip, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  createTenderFullSchema,
  type CreateTenderFullInput,
} from '@/lib/validators/tender';
import { createTender } from '@/lib/actions/tenders';
import { formatDate, formatMNT } from '@/lib/utils';
import {
  TENDER_DESCRIPTION_MAX_LENGTH,
  TENDER_FILE_ACCEPTED_MIME_TYPES,
  TENDER_FILE_MAX_SIZE_BYTES,
  TENDER_FILES_MAX_COUNT,
} from '@/lib/constants';
import { mn } from '@/lib/i18n/mn';

/** Minimum datetime-local value: now + 1h (client-side hint). */
function defaultDeadline(): string {
  const now = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const PUBLIC_FIELDS = ['title', 'description', 'category', 'region', 'budget', 'deadline'] as const;
const PRIVATE_FIELDS = [
  'fullDescription',
  'requirements',
  'address',
  'contactName',
  'contactPhone',
  'contactEmail',
] as const;

/**
 * 3-step create-tender form (public info → confidential info → preview).
 * Used both on the full page `/tenders/new` and inside the header modal.
 */
export function TenderForm({
  onSuccess,
}: {
  /** Called after a successful create (e.g. close the modal). */
  onSuccess?: (id: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateTenderFullInput>({
    resolver: zodResolver(createTenderFullSchema),
    mode: 'onTouched',
    defaultValues: {
      title: '',
      description: '',
      category: '',
      region: '',
      budget: '',
      deadline: '',
      fullDescription: '',
      requirements: '',
      address: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
    },
  });

  const values = getValues();
  const descriptionLength = (values.description ?? '').length;

  const goNext = async () => {
    const valid = await trigger([...PUBLIC_FIELDS]);
    if (valid) setStep(1);
  };

  const goPreview = async () => {
    const valid = await trigger([...PRIVATE_FIELDS]);
    if (valid) setStep(2);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    setFileError(null);

    for (const file of incoming) {
      if (file.size > TENDER_FILE_MAX_SIZE_BYTES) {
        setFileError(mn.validation.fileTooBig);
        return;
      }
      if (
        !(TENDER_FILE_ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)
      ) {
        setFileError(mn.validation.fileInvalidType);
        return;
      }
    }

    setFiles((current) => {
      const merged = [...current, ...incoming].slice(0, TENDER_FILES_MAX_COUNT);
      if (current.length + incoming.length > TENDER_FILES_MAX_COUNT) {
        setFileError(mn.validation.filesMax);
      }
      return merged;
    });
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data: CreateTenderFullInput) => {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(data));
    for (const file of files) formData.append('files', file);

    const result = await createTender(formData);
    if (result.ok) {
      toast.success(mn.createTender.success);
      setStep(0);
      setFiles([]);
      if (onSuccess) {
        onSuccess(result.data.id);
      } else {
        router.push(`/tenders/${result.data.id}`);
        router.refresh();
      }
    } else {
      toast.error(result.error);
      setError('root', { message: result.error });
    }
  };

  const stepLabels = mn.createTender.steps;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Step indicator */}
      <ol className="flex flex-wrap items-center gap-2" aria-label={mn.createTender.title}>
        {stepLabels.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => index < step && setStep(index)}
              disabled={index > step}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                index === step
                  ? 'bg-primary-500 text-navy'
                  : index < step
                    ? 'bg-accent-50 text-accent-700 hover:bg-accent-100'
                    : 'bg-surface-2 text-muted'
              }`}
            >
              {index < step ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <span>{index + 1}</span>
              )}
              {label}
            </button>
            {index < stepLabels.length - 1 && (
              <span className="h-px w-4 bg-border" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted">
        {mn.createTender.step(step + 1, stepLabels.length)}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {/* ---------------------------------------------------------- Step 1 */}
          {step === 0 && (
            <div className="space-y-4">
              <Input
                label={mn.createTender.fields.title}
                placeholder={mn.createTender.fields.titlePlaceholder}
                error={errors.title?.message}
                disabled={isSubmitting}
                {...register('title')}
              />

              <div>
                <Textarea
                  label={mn.createTender.fields.descriptionShort}
                  placeholder={mn.createTender.fields.descriptionPlaceholder}
                  rows={4}
                  maxLength={TENDER_DESCRIPTION_MAX_LENGTH}
                  error={errors.description?.message}
                  disabled={isSubmitting}
                  {...register('description')}
                />
                <p
                  className={`mt-1 text-right text-xs ${
                    descriptionLength > TENDER_DESCRIPTION_MAX_LENGTH
                      ? 'text-danger-600'
                      : 'text-muted'
                  }`}
                >
                  {descriptionLength}/{TENDER_DESCRIPTION_MAX_LENGTH}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label={mn.createTender.fields.category}
                  placeholder={mn.createTender.fields.category}
                  options={mn.categories.list.map((category) => ({
                    value: category,
                    label: category,
                  }))}
                  error={errors.category?.message}
                  disabled={isSubmitting}
                  {...register('category')}
                />
                <Select
                  label={mn.createTender.fields.region}
                  placeholder={mn.createTender.fields.region}
                  options={mn.regions.list.map((region) => ({
                    value: region,
                    label: region,
                  }))}
                  error={errors.region?.message}
                  disabled={isSubmitting}
                  {...register('region')}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label={mn.createTender.fields.budget}
                  placeholder={mn.createTender.fields.budgetPlaceholder}
                  inputMode="numeric"
                  error={errors.budget?.message}
                  disabled={isSubmitting}
                  {...register('budget')}
                />
                <Input
                  label={mn.createTender.fields.deadline}
                  type="datetime-local"
                  min={defaultDeadline()}
                  error={errors.deadline?.message}
                  disabled={isSubmitting}
                  {...register('deadline')}
                />
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------- Step 2 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-info-200 bg-info-50 px-4 py-3 text-xs text-info-700">
                <Lock className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                {mn.createTender.privatePreviewNote}
              </div>

              <Textarea
                label={mn.createTender.fields.fullDescription}
                placeholder={mn.createTender.fields.fullDescriptionPlaceholder}
                rows={6}
                error={errors.fullDescription?.message}
                disabled={isSubmitting}
                {...register('fullDescription')}
              />
              <Textarea
                label={mn.createTender.fields.requirements}
                placeholder={mn.createTender.fields.requirementsPlaceholder}
                rows={4}
                error={errors.requirements?.message}
                disabled={isSubmitting}
                {...register('requirements')}
              />
              <Input
                label={mn.createTender.fields.address}
                placeholder={mn.createTender.fields.addressPlaceholder}
                error={errors.address?.message}
                disabled={isSubmitting}
                {...register('address')}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label={mn.createTender.fields.contactName}
                  error={errors.contactName?.message}
                  disabled={isSubmitting}
                  {...register('contactName')}
                />
                <Input
                  label={mn.createTender.fields.contactPhone}
                  inputMode="numeric"
                  placeholder="99112233"
                  error={errors.contactPhone?.message}
                  disabled={isSubmitting}
                  {...register('contactPhone')}
                />
                <Input
                  label={mn.createTender.fields.contactEmail}
                  type="email"
                  error={errors.contactEmail?.message}
                  disabled={isSubmitting}
                  {...register('contactEmail')}
                />
              </div>

              {/* Attachments */}
              <div className="rounded-2xl border border-border p-4">
                <label
                  htmlFor="tender-files"
                  className="flex items-center gap-2 text-sm font-medium text-text"
                >
                  <Paperclip className="h-4 w-4 text-muted" aria-hidden="true" />
                  {mn.createTender.fields.attachments}
                </label>
                <p className="mt-1 text-xs text-muted">
                  {mn.createTender.fields.attachmentsHint}
                </p>

                <input
                  id="tender-files"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={TENDER_FILE_ACCEPTED_MIME_TYPES.join(',')}
                  disabled={isSubmitting}
                  onChange={(event) => addFiles(event.target.files)}
                  className="mt-3 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-text hover:file:bg-primary-50 hover:file:text-primary-700"
                />

                {fileError && (
                  <p className="mt-2 text-xs text-danger-600">{fileError}</p>
                )}

                {files.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {files.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-sm text-text">
                          <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                          <span className="truncate">{file.name}</span>
                          <span className="shrink-0 text-xs text-muted">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          aria-label={`${mn.common.delete}: ${file.name}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-danger-600 transition-colors hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------- Step 3 */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Public preview */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary-600" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-text">
                    {mn.createTender.publicPreviewTitle}
                  </h3>
                  <Badge tone="neutral">{mn.createTender.publicPreviewNote}</Badge>
                </div>
                <div className="card space-y-2 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{values.category}</Badge>
                    <Badge tone="neutral">{values.region}</Badge>
                  </div>
                  <p className="font-semibold text-text">{values.title}</p>
                  <p className="whitespace-pre-wrap text-sm text-muted">
                    {values.description}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {formatMNT(Number(values.budget ?? 0))}
                    </span>
                    <span className="text-muted">
                      {mn.tenders.labels.deadline}:{' '}
                      {values.deadline ? formatDate(values.deadline) : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    🔒 {mn.tenders.labels.owner}: {mn.createTender.lockedPreview}
                  </p>
                </div>
              </div>

              {/* Private preview */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-info-600" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-text">
                    {mn.createTender.privatePreviewTitle}
                  </h3>
                  <Badge tone="info">{mn.createTender.privatePreviewNote}</Badge>
                </div>
                <div className="card space-y-3 border-info-200 p-5 dark:border-info-900">
                  <p className="whitespace-pre-wrap text-sm text-muted">
                    {values.fullDescription}
                  </p>
                  {values.requirements && (
                    <div>
                      <p className="text-xs font-semibold text-text">
                        {mn.createTender.fields.requirements}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                        {values.requirements}
                      </p>
                    </div>
                  )}
                  <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    {values.address && (
                      <div>
                        <dt className="text-xs text-muted">
                          {mn.createTender.fields.address}
                        </dt>
                        <dd className="text-text">{values.address}</dd>
                      </div>
                    )}
                    {values.contactName && (
                      <div>
                        <dt className="text-xs text-muted">
                          {mn.createTender.fields.contactName}
                        </dt>
                        <dd className="text-text">{values.contactName}</dd>
                      </div>
                    )}
                    {values.contactPhone && (
                      <div>
                        <dt className="text-xs text-muted">
                          {mn.createTender.fields.contactPhone}
                        </dt>
                        <dd className="text-text">{values.contactPhone}</dd>
                      </div>
                    )}
                    {values.contactEmail && (
                      <div>
                        <dt className="text-xs text-muted">
                          {mn.createTender.fields.contactEmail}
                        </dt>
                        <dd className="break-all text-text">{values.contactEmail}</dd>
                      </div>
                    )}
                  </dl>
                  {files.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {files.map((file, index) => (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-muted"
                        >
                          <Paperclip className="h-3 w-3" aria-hidden="true" />
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-accent-50 px-4 py-3 text-xs text-accent-800">
                {mn.auth.shell.artText}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {errors.root?.message && (
        <p className="text-sm text-danger-600">{errors.root.message}</p>
      )}

      {/* Navigation */}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {step > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {mn.createTender.back}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {onSuccess && (
            <Link
              href="/dashboard?tab=tenders"
              className="text-center text-sm text-muted hover:text-text sm:self-center"
            >
              {mn.dashboard.tabs.myTenders}
            </Link>
          )}

          {step === 0 && (
            <Button type="button" onClick={() => void goNext()} className="w-full sm:w-auto">
              {mn.createTender.next}
            </Button>
          )}
          {step === 1 && (
            <Button type="button" onClick={() => void goPreview()} className="w-full sm:w-auto">
              <Eye className="h-4 w-4" aria-hidden="true" />
              {mn.createTender.next}
            </Button>
          )}
          {step === 2 && (
            <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
              <Upload className="h-4 w-4" aria-hidden="true" />
              {mn.createTender.submit}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
