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

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok || !data.ok) {
      alert('Şifre hatalı.')
      return
    }

    router.push('/admin/uzman-basvurulari')
  }

  return (
    <main className="min-h-screen bg-[#f6f1ea] px-6 py-20 text-[#171717]">
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
            className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none"
          />

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-black px-6 py-4 font-bold text-white disabled:opacity-60"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </button>
        </form>
      </div>
    </main>
  )
}