import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { NavigationProgress } from '@/components/NavigationProgress'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'CandorHire',
  description: 'Video tabanlı işe alım platformu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${manrope.variable} h-full antialiased`}>
      <body className="h-full">
        <NavigationProgress />
        <div className="min-h-screen w-full bg-white relative overflow-hidden flex flex-col text-foreground">
          {/* Pink Corner Dream Background */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(circle 600px at 0% 200px, #fce7f3, transparent),
                radial-gradient(circle 600px at 100% 200px, #fce7f3, transparent)
              `,
            }}
          />

          {/* Main Content */}
          <div className="relative z-10 flex-1 flex flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
