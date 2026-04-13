import type { Metadata, Viewport } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from './providers'
import { ConditionalLayout } from '@/components/layout/ConditionalLayout'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'CoverAI — Smarter Insurance', template: '%s | CoverAI' },
  description: 'India\'s most intelligent insurance platform. Compare, analyse, and buy the right policy with AI — in minutes.',
  keywords: ['insurance', 'health insurance', 'term life', 'policy comparison', 'AI insurance'],
  authors: [{ name: 'CoverAI' }],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'CoverAI — Smarter Insurance',
    description: 'Compare & buy the best insurance plans with AI-powered recommendations.',
    type: 'website',
    locale: 'en_IN',
  },
}

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${dmSans.variable} ${dmMono.variable} bg-bg-base text-tx-primary antialiased`}>
        <Providers>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </Providers>
      </body>
    </html>
  )
}