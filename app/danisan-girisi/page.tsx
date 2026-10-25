import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import ClientAccessForm from './ClientAccessForm'

export const metadata: Metadata = {
  title: 'Danışan girişi',
  description: 'Mindora danışan paneline giriş bağlantını e-postana yeniden gönder.',
  alternates: { canonical: '/danisan-girisi' },
  robots: { index: false, follow: true },
}

export default function ClientAccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <section className="mx-auto flex max-w-7xl justify-center px-5 py-16 lg:py-24">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200/80">
          <h1 className="text-2xl font-semibold">Danışan girişi</h1>
          <p className="mt-3 leading-7 text-slate-600">
            Mindora&apos;da şifre yok. Başvururken kullandığın e-posta adresini yaz, panel bağlantını hemen gönderelim.
          </p>
          <ClientAccessForm />
          <p className="mt-6 text-xs leading-5 text-slate-500">
            Henüz başvurmadıysan <Link href="/eslesme" className="font-semibold text-pine-800 underline">ücretsiz ön eşleşme</Link> ile başlayabilirsin.
            Psikologlar <Link href="/expert/login" className="font-semibold text-pine-800 underline">uzman girişini</Link> kullanmalı.
          </p>
        </div>
      </section>
    </main>
  )
}
