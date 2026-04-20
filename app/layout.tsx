import type { Metadata, Viewport } from 'next'
import { Montserrat, Playfair_Display } from 'next/font/google'
import './globals.css'
import 'maplibre-gl/dist/maplibre-gl.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'MVR Operations Hub', template: '%s | MVR Ops' },
  description: 'Internal operational platform for Miami Vacation Rentals',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MVR Ops' },
}

export const viewport: Viewport = {
  themeColor: '#1E2D40',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
