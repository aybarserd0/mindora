'use client'

import { FormEvent, useState } from 'react'

export default function ClientAccessForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; message: string }>({ status: 'idle', message: '' })

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setState({ status: 'loading', message: '' })
    try {
      const res = await fetch('/api/client/access-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) throw new Error('Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.')
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Bağlantı gönderilemedi.')
      setState({ status: 'done', message: data.message })
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Bağlantı gönderilemedi.' })
    }
  }

  if (state.status === 'done') {
    return (
      <div className="mt-6 rounded-2xl bg-pine-50 p-4 text-sm leading-6 text-pine-900" role="status">
        {state.message} Gelen kutunda görünmezse istenmeyen e-postalar klasörüne de bak.
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">E-posta adresin</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ornek@mail.com"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </label>
      <button
        type="submit"
        disabled={state.status === 'loading'}
        className="w-full rounded-full bg-pine-800 px-5 py-3.5 font-semibold text-white transition hover:bg-pine-900 disabled:opacity-60"
      >
        {state.status === 'loading' ? 'Gönderiliyor...' : 'Giriş bağlantısı gönder'}
      </button>
      {state.status === 'error' ? <p className="text-sm font-semibold text-rose-700">{state.message}</p> : null}
    </form>
  )
}
