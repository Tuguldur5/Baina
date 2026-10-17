import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  ChevronRight,
  FileText,
  FolderTree,
  Gauge,
  HeartPulse,
  Home,
  Layers,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  Sliders,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { mn } from '@/lib/i18n/mn';

/**
 * Single source of truth for admin navigation.
 *
 * Everything that navigates — the icon rail (A2), the accordion sidebar (A3),
 * the page tab strip (A4) and the command composer (A5) — reads this tree, so a
 * route only ever has to be added in one place. The order of `groups` is the
 * order the rail renders its icons, and `rail` picks which of them the rail
 * links to.
 *
 * All hrefs are HOST-RELATIVE: on the admin host the middleware rewrites `/x`
 * to `/admin/x`, so links must never contain the `/admin` prefix (see
 * src/lib/hosts.ts `adminHref`).
 */

export type AdminLeaf = {
  /** Host-relative href. */
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AdminGroup = {
  /** Stable id — used as the localStorage accordion key. */
  key: string;
  label: string;
  icon: LucideIcon;
  /** Section the group belongs to. */
  section: 'platform' | 'system';
  children: AdminLeaf[];
};

/** Quick items above the tree (Freebuff's "New chat / Daily / Wallet"). */
export const ADMIN_QUICK: AdminLeaf[] = [
  { href: '/', label: mn.admin.nav.overview, icon: LayoutDashboard },
  { href: '/reports', label: mn.admin.nav.reports, icon: AlertTriangle },
];

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    key: 'tenders',
    label: mn.admin.nav.tenders,
    icon: Layers,
    section: 'platform',
    children: [
      { href: '/tenders', label: mn.admin.nav.tendersAll, icon: FileText },
      { href: '/proposals', label: mn.admin.nav.proposals, icon: ScrollText },
      { href: '/categories', label: mn.admin.nav.categories, icon: FolderTree },
    ],
  },
  {
    key: 'users',
    label: mn.admin.nav.users,
    icon: Users,
    section: 'platform',
    children: [
      { href: '/users', label: mn.admin.nav.usersAll, icon: Users },
      { href: '/companies', label: mn.admin.nav.companies, icon: Building2 },
      { href: '/users?filter=admin', label: mn.admin.nav.admins, icon: ShieldCheck },
    ],
  },
  {
    key: 'moderation',
    label: mn.admin.nav.moderation,
    icon: ShieldCheck,
    section: 'platform',
    children: [
      { href: '/reports', label: mn.admin.nav.reports, icon: AlertTriangle },
      { href: '/audit-log', label: mn.admin.nav.auditLog, icon: ScrollText },
    ],
  },
  {
    key: 'comms',
    label: mn.admin.nav.comms,
    icon: MessageSquare,
    section: 'platform',
    children: [
      { href: '/notifications/broadcast', label: mn.admin.nav.broadcast, icon: Send },
      { href: '/notifications/announcements', label: mn.admin.nav.announcements, icon: Megaphone },
      { href: '/chatbot', label: mn.admin.nav.chatbot, icon: Bell },
    ],
  },
  {
    key: 'system',
    label: mn.admin.nav.system,
    icon: Activity,
    section: 'system',
    children: [
      { href: '/system/errors', label: mn.admin.nav.errors, icon: AlertTriangle },
      { href: '/system/performance', label: mn.admin.nav.performance, icon: Gauge },
      { href: '/system/analytics', label: mn.admin.nav.analytics, icon: BarChart3 },
      { href: '/system/health', label: mn.admin.nav.health, icon: HeartPulse },
    ],
  },
  {
    key: 'settings',
    label: mn.admin.nav.settings,
    icon: Settings,
    section: 'system',
    children: [
      { href: '/settings/general', label: mn.admin.nav.general, icon: Sliders },
      { href: '/settings/mode', label: mn.admin.nav.mode, icon: Gauge },
      { href: '/security', label: mn.admin.nav.security, icon: ShieldCheck },
    ],
  },
];

/**
 * Rail entries. Each maps to a group `key` so clicking a rail icon navigates to
 * that group's first page AND expands it in the sidebar (spec A2).
 *
 * `dashboard` is special: it is the pinned home route, not a group.
 */
export const ADMIN_RAIL: Array<{
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  /** Group to auto-expand, when the entry opens one. */
  groupKey?: string;
}> = [
  { key: 'dashboard', label: mn.admin.rail.dashboard, icon: Home, href: '/' },
  { key: 'tenders', label: mn.admin.rail.tenders, icon: Layers, href: '/tenders', groupKey: 'tenders' },
  { key: 'users', label: mn.admin.rail.users, icon: Users, href: '/users', groupKey: 'users' },
  {
    key: 'moderation',
    label: mn.admin.rail.moderation,
    icon: ShieldCheck,
    href: '/reports',
    groupKey: 'moderation',
  },
  {
    key: 'comms',
    label: mn.admin.rail.comms,
    icon: MessageSquare,
    href: '/notifications/broadcast',
    groupKey: 'comms',
  },
  { key: 'system', label: mn.admin.rail.system, icon: Activity, href: '/system/errors', groupKey: 'system' },
  {
    key: 'settings',
    label: mn.admin.rail.settings,
    icon: Settings,
    href: '/settings/general',
    groupKey: 'settings',
  },
];

/** Flattened leaf list — used by the command palette and the tab strip. */
export const ADMIN_LEAVES: AdminLeaf[] = ADMIN_GROUPS.flatMap((group) => group.children);

/**
 * Route title lookup for the tab strip and breadcrumbs.
 * Longest-prefix match wins so `/system/errors` beats `/system`.
 */
export function adminPageTitle(pathname: string): string {
  const clean = pathname.split('?')[0] ?? '/';
  if (clean === '/' || clean === '') return mn.admin.nav.overview;

  let best: { href: string; label: string } | null = null;
  for (const leaf of [...ADMIN_QUICK, ...ADMIN_LEAVES]) {
    const base = leaf.href.split('?')[0] ?? leaf.href;
    if (base === '/') continue;
    if (clean === base || clean.startsWith(`${base}/`)) {
      if (!best || base.length > best.href.length) best = { href: base, label: leaf.label };
    }
  }
  return best?.label ?? mn.admin.title;
}

/** Group that owns a pathname (drives auto-expand + the parent active dot). */
export function adminGroupFor(pathname: string): AdminGroup | null {
  const clean = pathname.split('?')[0] ?? '/';
  let match: AdminGroup | null = null;
  let matchLen = -1;
  for (const group of ADMIN_GROUPS) {
    for (const leaf of group.children) {
      const base = leaf.href.split('?')[0] ?? leaf.href;
      if ((clean === base || clean.startsWith(`${base}/`)) && base.length > matchLen) {
        match = group;
        matchLen = base.length;
      }
    }
  }
  return match;
}

/** Chevron used by the accordion rows (kept here so A3 imports one module). */
export const ADMIN_CHEVRON = ChevronRight;
