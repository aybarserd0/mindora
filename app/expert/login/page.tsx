'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import ServicesAside from '@/components/marketing/ServicesAside'

function ExpertLoginContent() {
  const searchParams = useSearchParams()
  const hasInvalidTokenError = searchParams.get('error') === 'invalid_token'
  const returnTo = searchParams.get('returnTo') || ''

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/expert/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnTo }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Bir hata oluştu. Lütfen tekrar dene.')
        return
      }

      setSent(true)
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar dene.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:py-20">
        <ServicesAside
          tone="lilac"
          heading="Danışanlarına odaklan. Gerisi panelde."
          lead="Psikolog, diyetisyen ya da kişisel antrenör; takvimin, görüşmelerin, ödemelerin ve danışan mesajların tek yerde."
          items={[
            { title: 'Takvim ve görüşmeler', text: 'Müsait saatlerini belirle; danışanların saat seçip ödemeyi kendisi tamamlar.' },
            { title: 'Plan ve program paylaşımı', text: 'Beslenme planlarını ve antrenman programlarını danışanınla dosya olarak paylaş.' },
            { title: 'Kazançların şeffaf', text: 'Her görüşmenin ücreti, platform payı ve sana aktarılacak tutar panelde görünür.' },
          ]}
        />

        <div className="flex flex-col justify-center rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200/80 sm:p-10">
          <h1 className="text-3xl font-semibold text-slate-900">Uzman girişi</h1>

          <p className="mt-3 leading-7 text-slate-600">
            Onaylı uzman hesabının e-posta adresini yaz, sana güvenli bir giriş bağlantısı gönderelim. Şifre yok.
          </p>

          {hasInvalidTokenError ? (
            <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Giriş bağlantının süresi dolmuş veya geçersiz. Lütfen yeni bir bağlantı iste.
            </p>
          ) : null}

          {sent ? (
            <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-800">
              E-posta adresin sistemde kayıtlı ve onaylıysa, birkaç dakika içinde giriş bağlantısı
              e-postana gelecek.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">E-posta adresi</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="uzman@ornek.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                />
              </label>

              {error ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </p>
              ) : null}

              <button
                disabled={loading}
                className="w-full rounded-full bg-pine-800 px-6 py-4 font-semibold text-white transition-all duration-200 ease-out hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Gönderiliyor...' : 'Giriş bağlantısı gönder'}
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-900">Henüz Mindora uzmanı değil misin?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/uzman-basvuru" className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:border-lilac-500 hover:text-lilac-900">Psikolog</Link>
              <Link href="/uzman-basvuru?meslek=diyetisyen" className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:border-lilac-500 hover:text-lilac-900">Diyetisyen</Link>
              <Link href="/uzman-basvuru?meslek=antrenor" className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:border-lilac-500 hover:text-lilac-900">Kişisel antrenör</Link>
            </div>
            <p className="mt-5 text-xs text-slate-500">
              Danışan mısın? <Link href="/danisan-girisi" className="font-semibold text-pine-800 underline">Danışan girişine</Link> geç.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function ExpertLoginPage() {
  return (
    <Suspense fallback={null}>
      <ExpertLoginContent />
    </Suspense>
  )
}
