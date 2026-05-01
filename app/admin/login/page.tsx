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
        setLoading(false)
        return
      }

      router.push('/admin/uzman-basvurulari')
    } catch {
      alert('Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f1ea] px-6 py-20 text-[#171717]">
      
      {/* 🔙 ANA SAYFA BUTONU */}
      <div className="mx-auto mb-6 max-w-md">
        <a
          href="/"
          className="inline-block rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-neutral-100"
        >
          ← Ana Sayfa
        </a>
      </div>

      {/* CARD */}
      <div className="mx-auto max-w-md rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-black/5">
        
        <h1 className="text-3xl font-black">Mindora Admin</h1>

        <p className="mt-2 text-neutral-600">
          Admin paneline erişmek için şifreni gir.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin şifresi"
            className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none focus:ring-2 focus:ring-black/20"
          />

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-black px-6 py-4 font-bold text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </button>

        </form>
      </div>
    </main>
  )
}