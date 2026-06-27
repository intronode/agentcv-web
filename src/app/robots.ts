import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // API and auth endpoints are not content — keep them out of the index.
      disallow: ['/api/', '/signin'],
    },
    sitemap: 'https://agentcv.ai/sitemap.xml',
    host: 'https://agentcv.ai',
  };
}
