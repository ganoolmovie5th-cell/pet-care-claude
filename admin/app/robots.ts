import type { MetadataRoute } from 'next';

// Blocks crawlers at fetch time; the noindex meta tag in layout.tsx only
// takes effect once a crawler has already rendered the page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
