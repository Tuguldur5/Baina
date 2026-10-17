import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { SITE_URL } from '@/lib/constants';
import { isAdminHost } from '@/lib/hosts';

/**
 * robots.txt is host-aware: the admin panel is not part of the public web and
 * disallows everything, while the public site keeps its normal rules. Read at
 * request time (headers()) instead of build time for exactly that reason.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = headers().get('host');

  if (isAdminHost(host)) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/auth'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
