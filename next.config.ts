import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // libSQL ships native bindings (libsql, @libsql/*-<platform>) — keep them out
  // of the server bundle so Next traces the real .node files at runtime.
  serverExternalPackages: ['@libsql/client', 'libsql'],
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
