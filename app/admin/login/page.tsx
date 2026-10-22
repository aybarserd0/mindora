'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        alert('Şifre hatalı.')
        return
      }

      router.push('/admin/uzman-basvurulari')
    } catch {
      alert('Bir hata oluştu. Lütfen tekrar dene.')
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

        <h1 className="text-center text-2xl font-bold text-slate-900">Mindora Admin</h1>

        <p className="mt-2 text-center text-slate-500">
          Admin paneline erişmek için şifreni gir.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin şifresi"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
          />

          <button
            disabled={loading}
            className="w-full rounded-full bg-pine-800 px-6 py-4 font-semibold text-white transition-all duration-200 ease-out hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Giriş yapılıyor...' : 'Admin Paneline Gir'}
          </button>
        </form>
      </div>
    </main>
  )
}
