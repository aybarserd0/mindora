'use client'

import Link from 'next/link'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type RetryState = 'idle' | 'loading' | 'error'

function OdemeBasarisizContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId') || ''
  const isSession = searchParams.get('seans') === '1'
  const refunded = searchParams.get('iade') === '1'
  const sessionToken = searchParams.get('token') || ''
  const newSlotHref = sessionToken ? `/client/dashboard/sessions?token=${encodeURIComponent(sessionToken)}&yeni=1` : null

  const [retryState, setRetryState] = useState<RetryState>('idle')
  const [retryError, setRetryError] = useState('')

  async function handleRetry() {
    if (!clientId) return

    setRetryState('loading')
    setRetryError('')

    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.ok || !data?.paymentPageUrl) {
        throw new Error(data?.error || 'Yeni ödeme bağlantısı oluşturulamadı.')
      }

      window.location.href = data.paymentPageUrl
    } catch (err) {
      setRetryState('error')
      setRetryError(
        err instanceof Error && err.message
          ? err.message
          : 'Yeni ödeme bağlantısı oluşturulamadı.'
      )
    }
  }

  if (isSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
        <section className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl ring-1 ring-slate-200/80">
          <h1 className="text-2xl font-semibold">{refunded ? 'Seçtiğin saat doldu' : 'Ödeme tamamlanmadı'}</h1>
          <p className="mt-3 leading-7 text-slate-600">
            {refunded
              ? 'Ödeme sırasında bu saat başka bir danışana verildi. Ödemen kartına iade edildi; bankana göre hesabına yansıması birkaç iş günü sürebilir.'
              : 'Kartından bir tutar çekilmedi ve randevu oluşturulmadı. Kart bilgilerini kontrol edip yeniden deneyebilirsin.'}
          </p>
          <div className="mt-7 space-y-3">
            {newSlotHref ? (
              <a href={newSlotHref} className="block rounded-full bg-pine-800 px-5 py-3.5 font-semibold text-white transition hover:bg-pine-900">
                Yeniden saat seç
              </a>
            ) : null}
            <Link href="/" className="block rounded-full border border-slate-200 px-5 py-3.5 font-semibold text-slate-700 transition hover:border-slate-300">
              Ana sayfaya dön
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-red-50 px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-4xl">
          ❌
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Ödeme Başarısız</h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Ödeme işlemi tamamlanamadı. Kartınızdan bir tutar çekildiyse
          bankanız bu tutarı genellikle otomatik olarak iade eder.
        </p>

        <div className="mt-6 rounded-2xl bg-red-50 p-4 text-left text-sm text-red-900">
          <p className="font-semibold">Ne yapmalısınız?</p>
          <p className="mt-1">
            Kart bilgilerinizi kontrol ederek aşağıdan tekrar deneyebilir veya
            farklı bir kart kullanabilirsiniz.
          </p>
        </div>

        {retryError ? (
          <p className="mt-4 rounded-2xl bg-red-100 p-3 text-sm font-semibold text-red-800">
            {retryError}
          </p>
        ) : null}

        <div className="mt-7 space-y-3">
          {clientId ? (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retryState === 'loading'}
              className="block w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retryState === 'loading' ? 'Ödeme bağlantısı hazırlanıyor...' : 'Ödemeyi Tekrar Dene'}
            </button>
          ) : null}

          <Link
            href="/"
            className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Ana Sayfaya Dön
          </Link>

          <Link
            href="/uzmanlar"
            className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Uzmanları Gör
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Kartınızdan çekim yapıldıysa ama bu ekranı görüyorsanız, ödeme kaydı
          admin panelinden kontrol edilmelidir.
        </p>
      </section>
    </main>
  )
}

export default function OdemeBasarisizPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-red-50 px-4 py-10 flex items-center justify-center">
          <p className="font-semibold text-red-800">Yükleniyor...</p>
        </main>
      }
    >
      <OdemeBasarisizContent />
    </Suspense>
  )
}
