'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { mn } from '@/lib/i18n/mn';
import type { TenderAttachment } from '@/lib/types/index';

/** How long a download link stays valid (seconds). Signed URLs are the only
 *  way into the private buckets — see db/storage.sql. */
const SIGNED_URL_TTL_SECONDS = 300;

/**
 * Attachment list with signed-URL downloads, shared by the confidential tender
 * panel and the proposal list. Works for any private bucket: pass the bucket
 * name and the rows, and no storage detail leaks into the parents.
 */
export function FileDownloadList({
  attachments,
  bucket,
  className,
}: {
  attachments: TenderAttachment[];
  /** Private storage bucket the rows point into. */
  bucket: string;
  className?: string;
}) {
  const toast = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (path: string, name: string) => {
    setDownloading(path);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      toast.error(mn.tenderDetail.downloadError);
      setDownloading(null);
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = data.signedUrl;
    anchor.rel = 'noopener';
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setDownloading(null);
  };

  return (
    <ul className={className ?? 'space-y-2'}>
      {attachments.map((attachment) => (
        <li
          key={attachment.path}
          className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm text-text">
            <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="truncate">{attachment.name}</span>
            {typeof attachment.size === 'number' && attachment.size > 0 && (
              <span className="shrink-0 text-xs text-muted">
                {(attachment.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => void download(attachment.path, attachment.name)}
            disabled={downloading === attachment.path}
            className="flex min-h-tap shrink-0 items-center gap-1.5 rounded-full bg-primary-500 px-4 text-xs font-semibold text-navy transition-colors hover:bg-primary-600 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {mn.tenderDetail.download}
          </button>
        </li>
      ))}
    </ul>
  );
}
