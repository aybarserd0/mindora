'use client'

import Link from 'next/link'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function Content() {
  const params = useSearchParams()
  const isSession = params.get('seans') === '1'
  const token = params.get('token') || ''
  const panelHref = token ? `/client/dashboard/sessions?token=${encodeURIComponent(token)}` : null

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl ring-1 ring-slate-200/80">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pine-50 text-pine-700">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-semibold">{isSession ? 'Seansın onaylandı' : 'Ödemen alındı'}</h1>
        <p className="mt-3 leading-7 text-slate-600">
          {isSession
            ? 'Ödemen alındı ve randevun psikoloğunun takvimine işlendi. Onay e-postası yolda.'
            : 'Ödemen başarıyla alındı. Psikoloğunla sohbet alanın açıldı; bağlantı e-postana gönderildi.'}
        </p>

        {isSession ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left text-sm leading-6 text-slate-700">
            <p className="font-semibold text-slate-900">Görüşme günü</p>
            <p className="mt-1">Seans saatinden 15 dakika önce sohbet ekranındaki “Görüntülü görüşmeye katıl” düğmesiyle odaya girebilirsin.</p>
          </div>
        ) : null}

        <div className="mt-7 space-y-3">
          {panelHref ? (
            <a href={panelHref} className="block rounded-full bg-pine-800 px-5 py-3.5 font-semibold text-white transition hover:bg-pine-900">
              Seanslarıma git
            </a>
          ) : null}
          <Link href="/" className="block rounded-full border border-slate-200 px-5 py-3.5 font-semibold text-slate-700 transition hover:border-slate-300">
            Ana sayfaya dön
          </Link>
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">Mindora acil durum hizmeti değildir. Acil bir durumda 112&apos;yi ara.</p>
      </section>
    </main>
  )
}

export default function OdemeBasariliPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  )
}
