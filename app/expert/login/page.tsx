'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

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
    <main className="min-h-screen bg-slate-50 px-6 py-20 text-slate-900">
      <div className="mx-auto mb-8 flex max-w-md justify-center">
        <a
          href="/"
          className="inline-block rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900"
        >
          ← Ana Sayfa
        </a>
      </div>

      <div className="mx-auto max-w-md rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <img
            src="/logo.png"
            alt="Mindora"
            className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200"
          />
        </div>

        <h1 className="text-center text-2xl font-bold text-slate-900">Uzman Girişi</h1>

        <p className="mt-2 text-center text-slate-500">
          Onaylı uzman hesabınızın e-posta adresini girin, size güvenli bir giriş bağlantısı gönderelim.
        </p>

        {hasInvalidTokenError ? (
          <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Giriş bağlantınızın süresi dolmuş veya geçersiz. Lütfen yeni bir bağlantı isteyin.
          </p>
        ) : null}

        {sent ? (
          <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-800">
            E-posta adresiniz sistemde kayıtlı ve onaylıysa, birkaç dakika içinde giriş bağlantısı
            e-postanıza gelecektir.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="uzman@ornek.com"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
            />

            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              disabled={loading}
              className="w-full rounded-full bg-pine-800 px-6 py-4 font-semibold text-white transition-all duration-200 ease-out hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Gönderiliyor...' : 'Giriş Bağlantısı Gönder'}
            </button>
          </form>
        )}
      </div>
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
