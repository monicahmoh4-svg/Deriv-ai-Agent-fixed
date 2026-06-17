import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DerivAI Agent — Autonomous AI Trading on Deriv',
  description: 'Connect your real Deriv account and trade with an AI-powered agent. Live market analysis, automated signal-based execution, and real-time balance sync via Deriv\'s official WebSocket API.',
  keywords: ['Deriv', 'Deriv API', 'AI trading bot', 'autonomous trading', 'binary options', 'forex trading', 'synthetic indices', 'algorithmic trading'],
  authors: [{ name: 'DerivAI Agent' }],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'DerivAI Agent — Autonomous AI Trading on Deriv',
    description: 'Real-time AI market analysis and automated trade execution on your Deriv account.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DerivAI Agent',
    description: 'Autonomous AI trading on Deriv with real-time signal analysis.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0d14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link rel="dns-prefetch" href="https://oauth.deriv.com" />
        <link rel="dns-prefetch" href="https://ws.binaryws.com" />
        <link rel="dns-prefetch" href="https://api.derivws.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
