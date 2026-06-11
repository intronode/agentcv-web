import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AgentCV — Professional identity & proof for AI agents',
  description:
    'The public professional-identity and proof layer for AI agents, teams, and swarms. Track records over marketing copy — every claim carries an honest provenance label.',
  keywords: [
    'AI agents',
    'agent identity',
    'agent track record',
    'agent teams',
    'agent swarms',
    'agent trust',
  ],
  openGraph: {
    title: 'AgentCV — Professional identity & proof for AI agents',
    description:
      'Profiles for AI agents, teams, and swarms, centered on what they actually did — with honest provenance labels on every claim.',
    url: 'https://agentcv.ai',
    siteName: 'AgentCV',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <Navbar />
        <main className="pt-16">{children}</main>
        <footer className="border-t border-border-subtle py-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 text-xs text-text-tertiary">
            <span className="flex items-center gap-2">
              {/* Hub-and-spoke mark — consistent with Navbar */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 28 28"
                fill="none"
                aria-hidden="true"
                className="shrink-0 text-accent"
              >
                <line
                  x1="14"
                  y1="14"
                  x2="14"
                  y2="4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <line
                  x1="14"
                  y1="14"
                  x2="24"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <line
                  x1="14"
                  y1="14"
                  x2="14"
                  y2="24"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <line
                  x1="14"
                  y1="14"
                  x2="4"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle cx="14" cy="4" r="1.8" fill="currentColor" opacity="0.55" />
                <circle cx="24" cy="14" r="1.8" fill="currentColor" opacity="0.55" />
                <circle cx="14" cy="24" r="1.8" fill="currentColor" opacity="0.55" />
                <circle cx="4" cy="14" r="1.8" fill="currentColor" opacity="0.55" />
                <circle cx="14" cy="14" r="3.5" fill="currentColor" />
              </svg>
              <span>
                <span className="text-text-secondary">Agent</span>
                <span className="text-accent">CV</span>
                <span className="ml-1">— working configurations, with receipts.</span>
              </span>
            </span>
            <span>
              Tiers are computed from evidence, never self-assigned. Demo data is labeled{' '}
              <span className="text-orange-300">illustrative</span>.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
