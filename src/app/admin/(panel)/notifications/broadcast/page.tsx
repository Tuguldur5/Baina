import type { Metadata } from 'next';
import { mn } from '@/lib/i18n/mn';
import { AdminSectionPlaceholder } from '@/components/admin/AdminSectionPlaceholder';

export const metadata: Metadata = { title: mn.admin.nav.broadcast };

/**
 * Placeholder route: the section is declared in src/lib/admin/nav.ts so every
 * rail / sidebar / tab / palette link resolves, and its content arrives in a
 * later step. See AdminSectionPlaceholder for why this is one file per section.
 */
export default function Page() {
  return (
    <AdminSectionPlaceholder
      title={mn.admin.nav.broadcast}
      breadcrumb={[mn.admin.nav.comms]}
    />
  );
}
