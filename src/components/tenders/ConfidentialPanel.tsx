'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Download, Lock, LockOpen, Mail, MapPin, Phone, User } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { FileDownloadList } from '@/components/tenders/FileDownloadList';
import { TENDER_FILES_BUCKET } from '@/lib/constants';
import { mn } from '@/lib/i18n/mn';
import type { TenderPrivateDetails } from '@/lib/types/index';

/**
 * Two-tier information panel.
 * - Locked (stage 1): everyone sees a blurred placeholder + explanation.
 * - Unlocked (stage 2): the owner and shortlisted/accepted bidders see the
 *   confidential details (RLS decides whether a row is returned at all).
 */
export function ConfidentialPanel({
  details,
  canEdit = false,
}: {
  details: TenderPrivateDetails | null;
  /** The owner always sees the panel — used for the "unlocked" badge. */
  canEdit?: boolean;
}) {
  if (!details) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-card"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-50 text-warning-700">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-text">
              {mn.tenderDetail.lockedTitle}
              <Badge tone="warning">🔒</Badge>
            </h2>
            <p className="text-sm text-muted">{mn.tenderDetail.lockedText}</p>
          </div>
        </div>

        {/* Blurred placeholder lines — never the real content. */}
        <div
          aria-hidden="true"
          className="mt-5 select-none space-y-3 opacity-60 blur-[3px]"
        >
          <div className="h-3 w-11/12 rounded-full bg-surface-2" />
          <div className="h-3 w-10/12 rounded-full bg-surface-2" />
          <div className="h-3 w-8/12 rounded-full bg-surface-2" />
          <div className="h-3 w-9/12 rounded-full bg-surface-2" />
          <div className="h-3 w-6/12 rounded-full bg-surface-2" />
        </div>

        <p className="mt-5 rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted">
          {mn.tenderDetail.lockedHint}
        </p>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="overflow-hidden rounded-3xl border border-info-200 bg-surface p-6 shadow-card dark:border-info-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-info-50 text-info-700">
            <LockOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text">
              {mn.tenderDetail.fullInfoTitle}
            </h2>
            <p className="text-sm text-muted">{mn.createTender.privatePreviewNote}</p>
          </div>
        </div>
        <Badge tone="info">{canEdit ? mn.roles.company : mn.tenderDetail.shortlist}</Badge>
      </div>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mt-5 space-y-5"
        >
          <div>
            <h3 className="text-sm font-semibold text-text">
              {mn.tenders.labels.description}
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
              {details.fullDescription}
            </p>
          </div>

          {details.requirements && (
            <div>
              <h3 className="text-sm font-semibold text-text">
                {mn.createTender.fields.requirements}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                {details.requirements}
              </p>
            </div>
          )}

          {details.address && (
            <div className="flex items-start gap-2 text-sm text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" aria-hidden="true" />
              <span>{details.address}</span>
            </div>
          )}

          <div className="rounded-2xl bg-surface-2 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
              <User className="h-4 w-4 text-muted" aria-hidden="true" />
              {mn.tenderDetail.contactTitle}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {details.contactName && <li>{details.contactName}</li>}
              {details.contactPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-accent-600" aria-hidden="true" />
                  <a
                    href={`tel:${details.contactPhone}`}
                    className="transition-colors hover:text-primary-600"
                  >
                    {details.contactPhone}
                  </a>
                </li>
              )}
              {details.contactEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-info-600" aria-hidden="true" />
                  <a
                    href={`mailto:${details.contactEmail}`}
                    className="break-all transition-colors hover:text-primary-600"
                  >
                    {details.contactEmail}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {details.attachments.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
                <Download className="h-4 w-4 text-muted" aria-hidden="true" />
                {mn.tenderDetail.attachmentsTitle}
              </h3>
              <FileDownloadList
                attachments={details.attachments}
                bucket={TENDER_FILES_BUCKET}
                className="mt-3 space-y-2"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}
