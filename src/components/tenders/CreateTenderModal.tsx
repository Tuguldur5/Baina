'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TenderForm } from '@/components/tenders/TenderForm';
import { mn } from '@/lib/i18n/mn';

/**
 * Header/hero CTA modal. The multi-step form lives in `TenderForm`, which is
 * shared with the full page `/tenders/new` (used on mobile).
 */
export function CreateTenderModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mn.createTender.title}
      description={mn.createTender.subtitle}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {mn.common.cancel}
        </Button>
      }
    >
      <TenderForm onSuccess={() => onClose()} />
    </Modal>
  );
}
