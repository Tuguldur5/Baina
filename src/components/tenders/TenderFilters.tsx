'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn, formatMNT } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';
import { TENDER_SORTS } from '@/lib/validators/tender';

/** Status is the most-used filter, so it gets chips instead of a dropdown. */
const STATUS_CHIPS = [
  { value: '', label: mn.tenders.filters.anyStatus },
  { value: 'open', label: mn.tenderStatus.open },
  { value: 'closed', label: mn.tenderStatus.closed },
  { value: 'awarded', label: mn.tenderStatus.awarded },
] as const;

interface FilterState {
  q: string;
  category: string;
  region: string;
  status: string;
  owner: string;
  min: string;
  max: string;
  sort: string;
}

/**
 * Tender filters driven by URL search params.
 *
 * Layout: one search field (with sort) → status chips → the rest of the
 * filters, collapsed behind "Илүү шүүлтүүр" on small screens. Every applied
 * filter is echoed back as a removable chip, so the current query is always
 * readable at a glance. Search is debounced (400ms); every change resets page.
 */
export function TenderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [values, setValues] = useState<FilterState>(() => ({
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    region: searchParams.get('region') ?? '',
    status: searchParams.get('status') ?? '',
    owner: searchParams.get('owner') ?? '',
    min: searchParams.get('min') ?? '',
    max: searchParams.get('max') ?? '',
    sort: searchParams.get('sort') ?? 'newest',
  }));
  const [showAdvanced, setShowAdvanced] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyParams = (updates: Record<string, string>, resetPage = true) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (resetPage) params.delete('page');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  /** Update local state first (so the control never lags), then the URL. */
  const setField = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    applyParams({ [key]: value });
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const current = searchParams.get('q') ?? '';
      if (values.q !== current) applyParams({ q: values.q });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.q]);

  const resetFilters = () => {
    setValues({
      q: '',
      category: '',
      region: '',
      status: '',
      owner: '',
      min: '',
      max: '',
      sort: 'newest',
    });
    setShowAdvanced(false);
    router.replace(pathname, { scroll: false });
  };

  const removeFilter = (key: Exclude<keyof FilterState, 'sort'>) => {
    setField(key, '');
  };

  const hasFilters = Boolean(
    searchParams.get('q') ||
      searchParams.get('category') ||
      searchParams.get('region') ||
      searchParams.get('status') ||
      searchParams.get('owner') ||
      searchParams.get('min') ||
      searchParams.get('max')
  );

  // Advanced (non-status) filters that are currently applied.
  const advancedCount = [
    values.category,
    values.region,
    values.owner,
    values.min,
    values.max,
  ].filter(Boolean).length;

  // Chips describing the applied query, all removable.
  const min = searchParams.get('min') ?? '';
  const max = searchParams.get('max') ?? '';
  const chips: Array<{ key: Exclude<keyof FilterState, 'sort'>; label: string }> = [];
  if (searchParams.get('q')) {
    chips.push({ key: 'q', label: `${mn.common.search}: ${searchParams.get('q')}` });
  }
  if (searchParams.get('category')) {
    chips.push({
      key: 'category',
      label: `${mn.tenders.filters.category}: ${searchParams.get('category')}`,
    });
  }
  if (searchParams.get('region')) {
    chips.push({
      key: 'region',
      label: `${mn.tenders.filters.region}: ${searchParams.get('region')}`,
    });
  }
  if (searchParams.get('owner')) {
    chips.push({
      key: 'owner',
      label: `${mn.tenders.filters.ownerType}: ${mn.roles[searchParams.get('owner') === 'company' ? 'company' : 'user']}`,
    });
  }
  if (searchParams.get('status')) {
    const status = searchParams.get('status') as 'open' | 'closed' | 'awarded';
    chips.push({
      key: 'status',
      label: `${mn.tenders.filters.status}: ${mn.tenderStatus[status] ?? status}`,
    });
  }
  if (min || max) {
    const label =
      min && max
        ? `${formatMNT(min)} – ${formatMNT(max)}`
        : min
          ? `${mn.tenders.filters.minBudget}: ${formatMNT(min)}`
          : `${mn.tenders.filters.maxBudget}: ${formatMNT(max)}`;
    chips.push({ key: min ? 'min' : 'max', label });
  }

  return (
    <section className="card overflow-hidden">
      {/* Search + sort */}
      <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="relative lg:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            aria-label={mn.common.search}
            placeholder={mn.tenders.searchPlaceholder}
            value={values.q}
            onChange={(event) => setValues((v) => ({ ...v, q: event.target.value }))}
            className="pl-9 pr-10"
          />
          {values.q && (
            <button
              type="button"
              onClick={() => setField('q', '')}
              aria-label={mn.tenders.filters.chipRemove(mn.common.search)}
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 lg:shrink-0">
          <label
            htmlFor="tender-sort"
            className="hidden shrink-0 text-xs font-medium text-muted sm:block"
          >
            {mn.tenders.filters.sort}
          </label>
          <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
            <Select
              id="tender-sort"
              value={values.sort}
              onChange={(event) => setField('sort', event.target.value)}
              options={TENDER_SORTS.map((item) => ({
                value: item,
                label: mn.tenders.sort[item],
              }))}
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              aria-label={mn.tenders.filters.reset}
              className="shrink-0 px-3"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline">{mn.tenders.filters.reset}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Status chips + advanced toggle */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/70 px-4 py-3 sm:px-5">
        {STATUS_CHIPS.map((chip) => {
          const active = values.status === chip.value;
          return (
            <button
              key={chip.value || 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => setField('status', chip.value)}
              className={cn(
                'inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-navy text-white dark:bg-white dark:text-navy'
                  : 'bg-surface-2 text-muted hover:text-text'
              )}
            >
              {chip.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          aria-expanded={showAdvanced}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-text transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {showAdvanced ? mn.tenders.filters.less : mn.tenders.filters.more}
          {advancedCount > 0 && (
            <span className="rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-navy">
              {advancedCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced filters: always open from md up */}
      <div
        className={cn(
          'grid gap-3 border-t border-border/70 bg-surface-2/40 p-4 sm:grid-cols-2 sm:p-5 md:grid-cols-3 lg:grid-cols-5',
          !showAdvanced && 'hidden md:grid'
        )}
      >
        <Select
          label={mn.tenders.filters.category}
          name="category"
          value={values.category}
          onChange={(event) => setField('category', event.target.value)}
          options={[
            { value: '', label: mn.categories.all },
            ...mn.categories.list.map((item) => ({ value: item, label: item })),
          ]}
        />
        <Select
          label={mn.tenders.filters.region}
          name="region"
          value={values.region}
          onChange={(event) => setField('region', event.target.value)}
          options={[
            { value: '', label: mn.regions.all },
            ...mn.regions.list.map((item) => ({ value: item, label: item })),
          ]}
        />
        <Select
          label={mn.tenders.filters.ownerType}
          name="owner"
          value={values.owner}
          onChange={(event) => setField('owner', event.target.value)}
          options={[
            { value: '', label: mn.tenders.filters.allOwners },
            { value: 'user', label: mn.roles.user },
            { value: 'company', label: mn.roles.company },
          ]}
        />
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:col-span-2 md:col-span-3 lg:col-span-2">
          <Input
            label={mn.tenders.filters.minBudget}
            name="min"
            inputMode="numeric"
            placeholder={mn.common.currencySymbol}
            value={values.min}
            onChange={(event) =>
              setValues((v) => ({
                ...v,
                min: event.target.value.replace(/[^0-9]/g, ''),
              }))
            }
            onBlur={(event) => applyParams({ min: event.target.value })}
          />
          <span
            aria-hidden="true"
            className="flex h-11 items-center justify-center text-sm text-muted"
          >
            –
          </span>
          <Input
            label={mn.tenders.filters.maxBudget}
            name="max"
            inputMode="numeric"
            placeholder={mn.common.currencySymbol}
            value={values.max}
            onChange={(event) =>
              setValues((v) => ({
                ...v,
                max: event.target.value.replace(/[^0-9]/g, ''),
              }))
            }
            onBlur={(event) => applyParams({ max: event.target.value })}
          />
        </div>
      </div>

      {/* Applied filters, each removable */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 px-4 py-3 sm:px-5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => removeFilter(chip.key)}
              aria-label={mn.tenders.filters.chipRemove(chip.label)}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-medium text-text ring-1 ring-inset ring-border transition-colors hover:ring-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {chip.label}
              <X className="h-3 w-3 text-muted" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
