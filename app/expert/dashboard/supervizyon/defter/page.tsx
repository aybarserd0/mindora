'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/components/supervision/ui'

type Entry = {
  id: string
  session_date: string
  duration_minutes: number
  approach: string | null
  status: string
  verification_code: string
  supervisor_profiles: { experts: { name: string | null; title: string | null } }
}

// Yazdırılabilir saat defteri. Tarayıcının "PDF olarak kaydet" seçeneğiyle PDF'e çevrilir.
export default function LogbookPrintPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    void (async () => {
      const [logRes, sessionRes] = await Promise.all([
        fetch('/api/supervision/log', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/api/expert/session', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      ])
      setEntries(((logRes?.entries || []) as Entry[]).filter((e) => e.status === 'confirmed'))
      setName(sessionRes?.name || '')
    })()
  }, [])

  if (!entries) return <div className="p-8 text-sm text-slate-500">Hazırlanıyor…</div>

  const totalMinutes = entries.reduce((sum, e) => sum + Number(e.duration_minutes), 0)
  const verifyBase = typeof window !== 'undefined' ? `${window.location.origin}/dogrula/` : '/dogrula/'

  return (
    <div className="mx-auto max-w-3xl bg-white px-8 py-10 text-slate-900 print:max-w-none print:p-0">
      <div className="flex items-start justify-between gap-6 print:hidden">
        <p className="text-sm text-slate-500">Yazdır penceresinde hedef olarak “PDF olarak kaydet”i seçebilirsin.</p>
        <button type="button" onClick={() => window.print()} className="rounded-full bg-pine-800 px-5 py-2.5 text-sm font-semibold text-white">
          Yazdır
        </button>
      </div>

      <header className="mt-8 border-b-2 border-slate-900 pb-5 print:mt-0">
        <p className="font-display text-sm font-semibold text-pine-800">mindora</p>
        <h1 className="mt-2 text-3xl font-semibold">Süpervizyon saat defteri</h1>
        <p className="mt-2 text-slate-600">
          {name ? `${name}, ` : ''}{formatDate(new Date().toISOString())} itibarıyla
        </p>
      </header>

      <p className="mt-6 text-lg">
        Toplam <strong>{(totalMinutes / 60).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} saat</strong>, {entries.length} onaylı seans.
      </p>

      <table className="mt-6 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="py-2 pr-3 font-semibold">Tarih</th>
            <th className="py-2 pr-3 font-semibold">Süpervizör</th>
            <th className="py-2 pr-3 font-semibold">Ekol</th>
            <th className="py-2 pr-3 font-semibold">Süre</th>
            <th className="py-2 font-semibold">Doğrulama kodu</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-slate-200">
              <td className="py-2 pr-3">{formatDate(e.session_date)}</td>
              <td className="py-2 pr-3">{e.supervisor_profiles?.experts?.name || '-'}</td>
              <td className="py-2 pr-3">{e.approach || '-'}</td>
              <td className="py-2 pr-3">{e.duration_minutes} dk</td>
              <td className="py-2 font-medium tabular-nums">{e.verification_code}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-10 space-y-2 text-xs leading-5 text-slate-500">
        <p>Her kaydın doğruluğu {verifyBase}KOD adresinden kontrol edilebilir.</p>
        <p>
          Bu belge, listelenen süpervizyon seanslarının Mindora platformu üzerinden yapıldığını ve süpervizör
          tarafından onaylandığını gösterir. Bir sertifika, yeterlilik ya da akreditasyon belgesi değildir.
        </p>
      </footer>
    </div>
  )
}
