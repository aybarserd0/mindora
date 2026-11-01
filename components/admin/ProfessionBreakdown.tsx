'use client'

import { useEffect, useState } from 'react'
import { PROFESSION_CONFIG } from '@/lib/professions'
import type { ProfessionStats } from '@/lib/admin/profession-summary'

const money = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)

/** Admin sayfalarında psikolog / diyetisyen / antrenör kırılımı */
export default function ProfessionBreakdown({ variant = 'overview' }: { variant?: 'overview' | 'finance' }) {
  const [rows, setRows] = useState<ProfessionStats[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/professions-summary', { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return
        if (!ok || !data?.ok) setError(data?.error || 'Meslek özeti alınamadı.')
        else setRows(data.professions as ProfessionStats[])
      })
      .catch(() => !cancelled && setError('Meslek özeti alınamadı.'))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Hizmetlere göre</h2>
          <p className="text-sm text-slate-500">Psikolog, diyetisyen ve kişisel antrenör kırılımı</p>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm font-semibold text-rose-700">{error}</p> : null}
      {!rows && !error ? <p className="mt-4 text-sm text-slate-500">Yükleniyor…</p> : null}

      {rows ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {rows.map((r) => (
            <div key={r.profession} className="rounded-xl border border-slate-200 bg-slate-50 p-4" data-testid={`profession-${r.profession}`}>
              <p className="font-semibold text-slate-900">{PROFESSION_CONFIG[r.profession].plural}</p>
              {variant === 'overview' ? (
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <dt className="text-slate-500">Onaylı uzman</dt>
                  <dd className="text-right font-semibold">{r.expertsApproved}</dd>
                  <dt className="text-slate-500">Bekleyen başvuru</dt>
                  <dd className="text-right font-semibold">{r.expertsPending}</dd>
                  <dt className="text-slate-500">Danışan başvurusu</dt>
                  <dd className="text-right font-semibold">{r.applicationsTotal}</dd>
                  <dt className="text-slate-500">Bu ay</dt>
                  <dd className="text-right font-semibold">{r.applicationsThisMonth}</dd>
                  <dt className="text-slate-500">Eşleşen</dt>
                  <dd className="text-right font-semibold">{r.applicationsMatched}</dd>
                  <dt className="text-slate-500">Ödenen görüşme</dt>
                  <dd className="text-right font-semibold">{r.paidCount}</dd>
                </dl>
              ) : (
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <dt className="text-slate-500">Ödenen görüşme</dt>
                  <dd className="text-right font-semibold">{r.paidCount}</dd>
                  <dt className="text-slate-500">Brüt ciro</dt>
                  <dd className="text-right font-semibold">{money(r.grossRevenue)}</dd>
                  <dt className="text-slate-500">Mindora payı</dt>
                  <dd className="text-right font-semibold">{money(r.platformRevenue)}</dd>
                  <dt className="text-slate-500">Uzmanlara</dt>
                  <dd className="text-right font-semibold">{money(r.expertRevenue)}</dd>
                  <dt className="text-slate-500">İade</dt>
                  <dd className="text-right font-semibold">{r.refundedCount}</dd>
                </dl>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
