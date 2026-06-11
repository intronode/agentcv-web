import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  async redirects() {
    return [
      {
        source: '/teams',
        destination: '/configurations',
        permanent: true,
      },
      {
        source: '/teams/:slug',
        destination: '/configurations/:slug',
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
