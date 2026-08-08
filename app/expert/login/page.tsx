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
    <main className="min-h-screen bg-[#f6f1ea] px-6 py-20 text-[#171717]">
      <div className="mx-auto mb-8 flex max-w-md justify-center">
        <a
          href="/"
          className="inline-block rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-neutral-100"
        >
          ← Ana Sayfa
        </a>
      </div>

      <div className="mx-auto max-w-md rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-black/5">
        <div className="mb-6 flex justify-center">
          <img
            src="/logo.png"
            alt="Mindora"
            className="h-14 w-14 rounded-2xl object-cover shadow-sm"
          />
        </div>

        <h1 className="text-center text-3xl font-black">Uzman Girişi</h1>

        <p className="mt-2 text-center text-neutral-600">
          Onaylı uzman hesabınızın e-posta adresini girin, size güvenli bir giriş bağlantısı gönderelim.
        </p>

        {hasInvalidTokenError ? (
          <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Giriş bağlantınızın süresi dolmuş veya geçersiz. Lütfen yeni bir bağlantı isteyin.
          </p>
        ) : null}

        {sent ? (
          <p className="mt-6 rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800">
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
              className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none transition focus:bg-white focus:ring-2 focus:ring-black/20"
            />

            {error ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-black px-6 py-4 font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
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
