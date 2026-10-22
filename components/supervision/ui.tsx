// Süpervizyon ekranlarının ortak küçük parçaları
import type { ReactNode } from 'react'

export function PageIntro({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
      {children ? <p className="mt-2 leading-7 text-slate-600">{children}</p> : null}
    </div>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 ${className}`}>{children}</section>
}

export function Notice({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'warn' | 'bad'; children: ReactNode }) {
  const tones = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    bad: 'border-rose-200 bg-rose-50 text-rose-900',
  }
  return <div className={`rounded-xl border px-4 py-3 text-sm leading-6 ${tones[tone]}`}>{children}</div>
}

export function StatusPill({ tone, children }: { tone: 'neutral' | 'good' | 'warn' | 'bad' | 'accent'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700',
    good: 'bg-emerald-100 text-emerald-800',
    warn: 'bg-amber-100 text-amber-900',
    bad: 'bg-rose-100 text-rose-800',
    accent: 'bg-lilac-100 text-lilac-800',
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[0.95rem] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-pine-600 focus:ring-2 focus:ring-pine-100'

export const primaryButton =
  'inline-flex items-center justify-center rounded-full bg-pine-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-50'

export const secondaryButton =
  'inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50'

export const dangerButton =
  'inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-50'

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(iso))
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(iso))
}

export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(value))
}
