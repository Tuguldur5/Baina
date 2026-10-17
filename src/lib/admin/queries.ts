import { createClient } from '@/lib/supabase/server';

/**
 * Read model for the admin panel.
 *
 * Every query here goes through a surface that `db/admin.sql` already exposes
 * and that `public.is_admin()` gates at the DATABASE level:
 *
 *   - `admin_stats()`           SECURITY DEFINER, aggregates only
 *   - `admin_profiles_meta`     view, MASKED email, NO phone column
 *   - `admin_proposals_meta`    view, NO price_offer / proposal_text
 *   - `audit_logs`              admin-readable, append-only
 *   - `reports` / `tenders`     admin-readable via the admin RLS policies
 *
 * Deliberately NOT queried anywhere in the panel (they are unreachable by
 * design, see db/admin.sql §9-11 and SECURITY.md):
 *   tender_private_details, proposals (base table), notifications of other
 *   users, storage buckets, and any phone number.
 *
 * Every function returns a safe empty value when the session lacks admin
 * rights (RLS yields 0 rows / the RPC raises) so a page renders an EmptyState
 * instead of throwing.
 */

export type AdminStatsTotals = {
  users: number;
  activeUsers: number;
  suspendedUsers: number;
  tenders: number;
  openTenders: number;
  awardedTenders: number;
  openBudget: number;
  proposals: number;
  openReports: number;
  companies: number;
};

export type AdminStatsPoint = {
  day: string;
  users: number;
  tenders: number;
  proposals: number;
};

export type AdminStats = {
  totals: AdminStatsTotals;
  series: AdminStatsPoint[];
  tenderStatus: Array<{ status: string; count: number }>;
  proposalStatus: Array<{ status: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
  regions: Array<{ region: string; count: number }>;
  ownerSplit: { user: number; company: number };
};

const EMPTY_STATS: AdminStats = {
  totals: {
    users: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    tenders: 0,
    openTenders: 0,
    awardedTenders: 0,
    openBudget: 0,
    proposals: 0,
    openReports: 0,
    companies: 0,
  },
  series: [],
  tenderStatus: [],
  proposalStatus: [],
  topCategories: [],
  regions: [],
  ownerSplit: { user: 0, company: 0 },
};

/** Aggregates for the overview. Never throws — an error yields zeros. */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('admin_stats');

  if (error || !data || typeof data !== 'object') return EMPTY_STATS;

  const raw = data as Partial<AdminStats>;
  return {
    totals: { ...EMPTY_STATS.totals, ...(raw.totals ?? {}) },
    series: Array.isArray(raw.series) ? raw.series : [],
    tenderStatus: Array.isArray(raw.tenderStatus) ? raw.tenderStatus : [],
    proposalStatus: Array.isArray(raw.proposalStatus) ? raw.proposalStatus : [],
    topCategories: Array.isArray(raw.topCategories) ? raw.topCategories : [],
    regions: Array.isArray(raw.regions) ? raw.regions : [],
    ownerSplit: raw.ownerSplit ?? { user: 0, company: 0 },
  };
}

export type AdminProfileMeta = {
  id: string;
  name: string;
  email_masked: string | null;
  role: string;
  status: string;
  company_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  tenders_count: number;
  proposals_count: number;
};

/**
 * Which slice of the user list to read. Filtering happens in the QUERY, not in
 * the browser: `admin_profiles_meta` is a view gated by `is_admin()`, so an
 * unprivileged session simply gets zero rows back.
 */
export type AdminProfileFilter = 'all' | 'user' | 'company' | 'admin';

export async function getAdminProfiles(
  limit = 50,
  filter: AdminProfileFilter = 'all'
): Promise<AdminProfileMeta[]> {
  const supabase = createClient();
  let query = supabase
    .from('admin_profiles_meta')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filter === 'admin') query = query.eq('is_admin', true);
  else if (filter === 'user') query = query.eq('role', 'user');
  else if (filter === 'company') query = query.eq('role', 'company');

  const { data, error } = await query;

  if (error || !data) return [];
  return data as AdminProfileMeta[];
}

export type AuditLogRow = {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export async function getAuditLog(limit = 50): Promise<AuditLogRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, admin_id, action, entity_type, entity_id, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as AuditLogRow[];
}

/** Latest audit entries for the right-hand activity panel (spec A4). */
export async function getRecentActivity(limit = 8): Promise<AuditLogRow[]> {
  return getAuditLog(limit);
}

export type AdminReportRow = {
  id: string;
  reporter_id: string;
  /** 'tender' | 'user' | 'proposal' — enforced by a CHECK constraint. */
  entity_type: string;
  entity_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};

export async function getReports(limit = 50): Promise<AdminReportRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('reports')
    .select('id, reporter_id, entity_type, entity_id, reason, details, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as AdminReportRow[];
}

export type AdminTenderRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  budget: string;
  region: string | null;
  deadline: string;
  created_by_user_id: string;
  created_at: string;
};

export async function getAdminTenders(limit = 50): Promise<AdminTenderRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tenders')
    .select('id, title, category, status, budget, region, deadline, created_by_user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as AdminTenderRow[];
}

/**
 * Counts for the sidebar pills and the overview banner. Derived from
 * `admin_stats()` so the panel issues one aggregate query per page.
 */
export async function getAdminCounts(): Promise<{
  openReports: number;
  newErrors: number;
  suspendedUsers: number;
}> {
  const stats = await getAdminStats();
  return {
    openReports: stats.totals.openReports,
    // No error-tracking table exists yet, so this is genuinely 0 (never faked).
    newErrors: 0,
    suspendedUsers: stats.totals.suspendedUsers,
  };
}
