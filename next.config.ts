import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
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
