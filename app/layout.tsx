import type { Metadata } from 'next'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'

export const metadata: Metadata = {
  title: 'Mindora',
  description: 'Mindora güvenli görüşme platformu',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}