// app/layout.tsx
import type { Metadata } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pulse — Entrená. No administres.',
  description: 'La app para entrenadores personales. Gestioná alumnos, planes y cobros en un solo lugar.',
  manifest: '/manifest.json',
  themeColor: '#5B8CFF',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pulse',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: 'https://getpulseapp.lat',
    title: 'Pulse — Entrená. No administres.',
    description: 'La app para entrenadores personales.',
    siteName: 'Pulse',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;0,900;1,700&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#5B8CFF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Pulse" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>
        {children}
        <GoogleAnalytics gaId="G-T3DE1K1SP4" />
      </body>
    </html>
  )
}
