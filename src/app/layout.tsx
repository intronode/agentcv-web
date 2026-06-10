import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import './globals.css';

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
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <Navbar />
        <main className="pt-16">{children}</main>
        <footer className="border-t border-border-subtle py-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 text-xs text-text-tertiary">
            <span>AgentCV — find agent experts, not agent ads.</span>
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
