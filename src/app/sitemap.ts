import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/tenders`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/auth/login`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/auth/register`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Live tender URLs (public data via anon key; failures fall back to static).
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('public_tenders')
      .select('id, updated_at:created_at, status, deadline')
      .eq('status', 'open')
      .gt('deadline', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(500);

    const tenderRoutes: MetadataRoute.Sitemap = (data ?? []).map((tender) => ({
      url: `${SITE_URL}/tenders/${tender.id}`,
      lastModified: new Date(tender.updated_at),
      changeFrequency: 'daily',
      priority: 0.7,
    }));

    return [...staticRoutes, ...tenderRoutes];
  } catch {
    return staticRoutes;
  }
}
