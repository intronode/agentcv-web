import type { NextConfig } from 'next';

// Content-Security-Policy. Next.js injects inline hydration <script> and inline
// styles in production, so script/style need 'unsafe-inline' unless we move to a
// nonce-based policy (roadmap — would require reworking the Edge middleware).
// The high-value directives are still locked down: frame-ancestors/object-src
// none, base-uri/form-action self. Stored-XSS via user markdown is independently
// mitigated by react-markdown (HTML escaped, raw HTML not rendered). img-src
// allows https for owner avatars (e.g. Google profile images). See BUILD-REPORT.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
]
  .join('; ')
  .concat(';');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  // libSQL ships native bindings (libsql, @libsql/*-<platform>) — keep them out
  // of the server bundle so Next traces the real .node files at runtime.
  serverExternalPackages: ['@libsql/client', 'libsql'],
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      {
        source: '/configurations',
        destination: '/teams',
        permanent: true,
      },
      {
        source: '/configurations/:slug',
        destination: '/teams/:slug',
        permanent: true,
      },
      {
        source: '/trust',
        destination: '/harness-engineering',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
