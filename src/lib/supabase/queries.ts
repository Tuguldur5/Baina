import { createClient } from '@/lib/supabase/server';
import {
  mapMaskedOwner,
  mapNotification,
  mapPrivateDetails,
  mapProfile,
  mapProposal,
  mapTender,
} from '@/lib/types/mappers';
import type {
  Notification,
  NotificationRow,
  Profile,
  ProfileRow,
  ProposalRow,
  ProposalWithBidder,
  PublicTenderRow,
  TenderPrivateDetails,
  TenderPrivateDetailsRow,
  TenderRow,
  TenderWithOwner,
} from '@/lib/types/index';
import type { UserRole } from '@/lib/constants';

/**
 * All public tender reads go through the `public_tenders` view (masked owner
 * name + proposals count). The real profile of an owner is only loaded when
 * RLS says the viewer is allowed to see it (owner or shortlisted bidder).
 */
const PUBLIC_COLUMNS =
  'id, title, description, category, budget, currency, region, status, deadline, created_by_user_id, winner_proposal_id, created_at, owner_role, owner_masked_name, owner_avatar_url, proposals_count';

function mapPublicRow(row: PublicTenderRow): TenderWithOwner {
  return {
    ...mapTender(row),
    owner: mapMaskedOwner(row),
    proposalsCount: Number(row.proposals_count ?? 0),
  };
}

/** Signed-in user's profile (or null when logged out / not found). */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return data ? mapProfile(data as ProfileRow) : null;
}

/** Public owner shape for the header (lighter than a full profile). */
export async function getHeaderUser(): Promise<{
  id: string;
  name: string;
  role: UserRole;
  companyName: string | null;
  avatarUrl: string | null;
} | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    companyName: profile.companyName,
    avatarUrl: profile.avatarUrl,
  };
}

/**
 * Replaces the masked owner name with the real one — only used when the
 * viewer IS the owner (they obviously know their own name) or when RLS
 * returned the owner's profile (shortlisted/accepted bidder).
 */
async function withRealOwnerIfPermitted(
  tender: TenderWithOwner,
  viewerId: string | null
): Promise<TenderWithOwner> {
  if (!tender.owner) return tender;
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, name, company_name, role, avatar_url')
    .eq('id', tender.createdByUserId)
    .maybeSingle();

  if (!data) return tender; // RLS denied — keep the masked name
  void viewerId;
  const profile = data as Pick<
    ProfileRow,
    'id' | 'name' | 'company_name' | 'role' | 'avatar_url'
  >;
  return {
    ...tender,
    owner: {
      id: profile.id,
      name: profile.company_name ?? profile.name,
      role: profile.role,
      companyName: profile.company_name,
      avatarUrl: profile.avatar_url,
    },
  };
}

/** Featured open tenders for the landing page (newest first). */
export async function getFeaturedTenders(limit = 6): Promise<TenderWithOwner[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('public_tenders')
    .select(PUBLIC_COLUMNS)
    .eq('status', 'open')
    .gt('deadline', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data ?? []) as PublicTenderRow[]).map(mapPublicRow);
}

export interface TenderQueryOptions {
  q?: string;
  category?: string;
  region?: string;
  status?: string;
  ownerType?: UserRole;
  min?: number;
  max?: number;
  sort?: 'newest' | 'deadline' | 'budgetHigh' | 'budgetLow';
  page: number;
  pageSize?: number;
}

/** Paginated tender list with filters; returns rows + total count. */
export async function getTenders({
  q,
  category,
  region,
  status,
  ownerType,
  min,
  max,
  sort = 'newest',
  page,
  pageSize = 12,
}: TenderQueryOptions): Promise<{ tenders: TenderWithOwner[]; total: number }> {
  const supabase = createClient();
  let query = supabase
    .from('public_tenders')
    .select(PUBLIC_COLUMNS, { count: 'exact' });

  if (q) {
    // Escape ilike wildcards in user input; keep the search parameterized.
    const escaped = q.replace(/[%_,()]/g, ' ').trim();
    if (escaped) {
      query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }
  }
  if (category) query = query.eq('category', category);
  if (region) query = query.eq('region', region);
  if (status) query = query.eq('status', status);
  if (ownerType) query = query.eq('owner_role', ownerType);
  if (typeof min === 'number') query = query.gte('budget', min);
  if (typeof max === 'number') query = query.lte('budget', max);

  switch (sort) {
    case 'deadline':
      query = query.order('deadline', { ascending: true });
      break;
    case 'budgetHigh':
      query = query.order('budget', { ascending: false });
      break;
    case 'budgetLow':
      query = query.order('budget', { ascending: true });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  const from = (page - 1) * pageSize;
  const { data, count } = await query.range(from, from + pageSize - 1);

  return {
    tenders: ((data ?? []) as PublicTenderRow[]).map(mapPublicRow),
    total: count ?? 0,
  };
}

export interface TenderDetailResult {
  tender: TenderWithOwner | null;
  proposals: ProposalWithBidder[];
  viewerProposal: ProposalRow | null;
  isOwner: boolean;
  /** Stage-2 confidential details — null when RLS denies access. */
  privateDetails: TenderPrivateDetails | null;
  proposalsCount: number;
}

/**
 * Tender detail with proposals and (RLS-guarded) confidential details.
 * - Owner sees all proposals with bidder profiles.
 * - Bidder sees only their own proposal.
 * - Logged-out viewers get an empty proposals list and no private details.
 */
export async function getTenderDetail(
  id: string,
  viewerId: string | null
): Promise<TenderDetailResult> {
  const supabase = createClient();

  const { data: tenderRow } = await supabase
    .from('public_tenders')
    .select(PUBLIC_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (!tenderRow) {
    return {
      tender: null,
      proposals: [],
      viewerProposal: null,
      isOwner: false,
      privateDetails: null,
      proposalsCount: 0,
    };
  }

  let tender = mapPublicRow(tenderRow as PublicTenderRow);
  const isOwner = viewerId === tender.createdByUserId;

  // Proposals visible to the current viewer (RLS-scoped).
  const { data: proposalRows } = await supabase
    .from('proposals')
    .select('*, bidder:profiles(id, name, role, company_name, avatar_url)')
    .eq('tender_id', id)
    .order('created_at', { ascending: false });

  const proposals = ((proposalRows ?? []) as (ProposalRow & {
    bidder: {
      id: string;
      name: string;
      role: UserRole;
      company_name: string | null;
      avatar_url: string | null;
    } | null;
  })[]).map((row) => ({
    ...mapProposal(row),
    bidder: row.bidder
      ? {
          id: row.bidder.id,
          name: row.bidder.company_name ?? row.bidder.name,
          role: row.bidder.role,
          companyName: row.bidder.company_name,
          avatarUrl: row.bidder.avatar_url,
        }
      : null,
  }));

  const viewerProposal =
    proposals.find((proposal) => proposal.bidderId === viewerId) ?? null;
  const viewerProposalRow =
    (proposalRows as ProposalRow[] | null)?.find(
      (row) => row.id === viewerProposal?.id
    ) ?? null;

  // Stage-2 confidential details: RLS returns a row only for the owner or a
  // shortlisted/accepted bidder — this is the actual access control.
  const { data: privateRow } = await supabase
    .from('tender_private_details')
    .select('*')
    .eq('tender_id', id)
    .maybeSingle();

  const privateDetails = privateRow
    ? mapPrivateDetails(privateRow as TenderPrivateDetailsRow)
    : null;

  if (privateDetails) {
    tender = await withRealOwnerIfPermitted(tender, viewerId);
  }

  return {
    tender,
    proposals,
    viewerProposal: viewerProposalRow,
    isOwner,
    privateDetails,
    proposalsCount: proposals.length,
  };
}

/** Signed-in user's tenders (dashboard tab) — owner sees their own real name. */
export async function getMyTenders(userId: string): Promise<TenderWithOwner[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('public_tenders')
    .select(PUBLIC_COLUMNS)
    .eq('created_by_user_id', userId)
    .order('created_at', { ascending: false });

  const rows = ((data ?? []) as PublicTenderRow[]).map(mapPublicRow);
  return Promise.all(rows.map((row) => withRealOwnerIfPermitted(row, userId)));
}

export interface MyProposalItem extends ProposalWithBidder {
  tender: {
    id: string;
    title: string;
    status: TenderRow['status'];
    deadline: string;
  } | null;
}

/** Signed-in user's proposals with their tenders (dashboard tab). */
export async function getMyProposals(userId: string): Promise<MyProposalItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('proposals')
    .select(
      '*, bidder:profiles(id, name, role, company_name, avatar_url), tender:tenders(id, title, status, deadline)'
    )
    .eq('bidder_id', userId)
    .order('created_at', { ascending: false });

  return ((data ?? []) as (ProposalRow & {
    bidder: {
      id: string;
      name: string;
      role: UserRole;
      company_name: string | null;
      avatar_url: string | null;
    } | null;
    tender: { id: string; title: string; status: TenderRow['status']; deadline: string } | null;
  })[]).map((row) => ({
    ...mapProposal(row),
    bidder: row.bidder
      ? {
          id: row.bidder.id,
          name: row.bidder.company_name ?? row.bidder.name,
          role: row.bidder.role,
          companyName: row.bidder.company_name,
          avatarUrl: row.bidder.avatar_url,
        }
      : null,
    tender: row.tender,
  }));
}

/** Own notifications, newest first (RLS: only own rows are returned). */
export async function getNotifications(
  userId: string,
  limit = 50
): Promise<Notification[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data ?? []) as NotificationRow[]).map(mapNotification);
}

/** Unread notification count for the header bell. */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) return 0;
  return count ?? 0;
}

/** Local `YYYY-MM-DD` key (the chart groups by the viewer's own calendar day). */
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

/**
 * Rolling daily counts, oldest first, including days with zero events — a bar
 * chart must show the gaps, otherwise the trend lies about the pace.
 */
function dailyTrend(isoDates: string[], days: number): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const iso of isoDates) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) continue;
    const key = dateKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dateKey(day);
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

/** One tally per status, defaulting missing statuses to 0. */
function tally<T extends string>(statuses: T[], rows: { status: string }[]) {
  const base = {} as Record<T, number>;
  for (const status of statuses) base[status] = 0;
  for (const row of rows) {
    const key = row.status as T;
    if (key in base) base[key] += 1;
  }
  return base;
}

/**
 * Everything the "Шинжилгээний самбар" (dashboard overview) needs, in three
 * queries instead of the five separate count round-trips the old stat cards
 * made: the viewer's own tenders, the proposals received on them, and the
 * viewer's own bids. All aggregation happens here on the server, so the page
 * ships a finished report instead of raw rows.
 */
export interface DashboardAnalytics {
  tenders: {
    total: number;
    open: number;
    closed: number;
    awarded: number;
    withProposals: number;
  };
  budget: { total: number; open: number; awarded: number };
  received: {
    total: number;
    pending: number;
    shortlisted: number;
    accepted: number;
    rejected: number;
  };
  bids: {
    total: number;
    pending: number;
    shortlisted: number;
    accepted: number;
    rejected: number;
  };
  /** Proposals received per day, last 14 days, oldest first. */
  trend: { date: string; count: number }[];
  trendTotal: number;
  topTenders: { id: string; title: string; proposals: number; budget: string }[];
  closingSoon: { id: string; title: string; deadline: string; proposals: number }[];
  noProposals: { id: string; title: string; deadline: string; budget: string }[];
  /** Share of own tenders that received at least one bid, 0-100. */
  responseRate: number;
  /** Average bids per own tender, one decimal. */
  avgProposals: number;
  /** Share of own bids that were accepted, 0-100. */
  winRate: number;
}

export async function getDashboardAnalytics(
  userId: string
): Promise<DashboardAnalytics> {
  const supabase = createClient();
  const now = new Date();

  const { data: tenderRows } = await supabase
    .from('public_tenders')
    .select('id, title, budget, status, deadline, proposals_count, created_at')
    .eq('created_by_user_id', userId);

  const tenders = (tenderRows ?? []) as {
    id: string;
    title: string;
    budget: string;
    status: TenderRow['status'];
    deadline: string;
    proposals_count: number;
    created_at: string;
  }[];
  const tenderIds = tenders.map((row) => row.id);

  const receivedRows = tenderIds.length
    ? ((await supabase
        .from('proposals')
        .select('id, status, created_at')
        .in('tender_id', tenderIds)).data ?? [])
    : [];

  const { data: bidRows } = await supabase
    .from('proposals')
    .select('id, status, created_at')
    .eq('bidder_id', userId);

  const received = receivedRows as { id: string; status: string; created_at: string }[];
  const bids = (bidRows ?? []) as { id: string; status: string; created_at: string }[];

  const tenderStatus = tally(['open', 'closed', 'awarded'], tenders);
  const receivedStatus = tally(
    ['pending', 'shortlisted', 'accepted', 'rejected'],
    received
  );
  const bidStatus = tally(['pending', 'shortlisted', 'accepted', 'rejected'], bids);

  const isOpen = (row: { status: string; deadline: string }) =>
    row.status === 'open' && new Date(row.deadline).getTime() > now.getTime();
  const sum = (rows: { budget: string }[]) =>
    rows.reduce((acc, row) => acc + Number(row.budget ?? 0), 0);

  const trend = dailyTrend(
    received.map((row) => row.created_at),
    14
  );

  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const open = tenders
    .filter(isOpen)
    .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));

  return {
    tenders: {
      total: tenders.length,
      ...tenderStatus,
      withProposals: tenders.filter((row) => Number(row.proposals_count ?? 0) > 0)
        .length,
    },
    budget: {
      total: sum(tenders),
      open: sum(tenders.filter(isOpen)),
      awarded: sum(tenders.filter((row) => row.status === 'awarded')),
    },
    received: { total: received.length, ...receivedStatus },
    bids: { total: bids.length, ...bidStatus },
    trend,
    trendTotal: trend.reduce((acc, day) => acc + day.count, 0),
    topTenders: [...tenders]
      .filter((row) => Number(row.proposals_count ?? 0) > 0)
      .sort((a, b) => Number(b.proposals_count) - Number(a.proposals_count))
      .slice(0, 5)
      .map((row) => ({
        id: row.id,
        title: row.title,
        proposals: Number(row.proposals_count ?? 0),
        budget: row.budget,
      })),
    closingSoon: open
      .filter((row) => Date.parse(row.deadline) <= inSevenDays.getTime())
      .slice(0, 5)
      .map((row) => ({
        id: row.id,
        title: row.title,
        deadline: row.deadline,
        proposals: Number(row.proposals_count ?? 0),
      })),
    noProposals: open
      .filter((row) => Number(row.proposals_count ?? 0) === 0)
      .slice(0, 5)
      .map((row) => ({
        id: row.id,
        title: row.title,
        deadline: row.deadline,
        budget: row.budget,
      })),
    responseRate: tenders.length
      ? Math.round(
          (tenders.filter((row) => Number(row.proposals_count ?? 0) > 0).length /
            tenders.length) *
            100
        )
      : 0,
    avgProposals: tenders.length
      ? Math.round((received.length / tenders.length) * 10) / 10
      : 0,
    winRate: bids.length ? Math.round((bidStatus.accepted / bids.length) * 100) : 0,
  };
}

/** Landing page trust numbers (real counts from the DB). */
export async function getPublicStats(): Promise<{
  openTenders: number;
  companies: number;
  proposals: number;
  openBudget: number;
}> {
  const supabase = createClient();

  const { count: openTenders } = await supabase
    .from('public_tenders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')
    .gt('deadline', new Date().toISOString());

  const { count: companies } = await supabase
    .from('public_tenders')
    .select('id', { count: 'exact', head: true })
    .eq('owner_role', 'company');

  const { data: budgetRows } = await supabase
    .from('public_tenders')
    .select('budget')
    .eq('status', 'open')
    .gt('deadline', new Date().toISOString());

  const { count: proposals } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true });

  const openBudget = (budgetRows ?? []).reduce(
    (sum, row) => sum + Number((row as { budget: string }).budget),
    0
  );

  return {
    openTenders: openTenders ?? 0,
    companies: companies ?? 0,
    proposals: proposals ?? 0,
    openBudget,
  };
}
