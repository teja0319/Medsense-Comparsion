import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Medsense Dashboard',
  description: 'MongoDB read-only parsing dashboard',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light">
      <body className="font-sans antialiased bg-slate-50 text-slate-900 min-h-screen relative overflow-x-hidden selection:bg-primary/20 selection:text-primary">
        {/* Ambient Glowing Background Orbs (Light Mode) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10" aria-hidden="true">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] opacity-60" />
          <div className="absolute bottom-[10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-indigo-500/5 blur-[100px] opacity-40" />
        </div>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
