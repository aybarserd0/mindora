'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'unknown'
type PayoutStatus = 'unpaid' | 'scheduled' | 'paid' | 'blocked' | 'unknown'
type PayoutFilter = 'all' | 'unpaid' | 'scheduled' | 'paid' | 'blocked'

type EarningPayment = {
  id: string
  clientName: string
  clientEmail: string | null
  grossAmount: number
  commissionAmount: number
  expertAmount: number
  status: PaymentStatus
  payoutStatus: PayoutStatus
  payoutPaidAt: string | null
  createdAt: string | null
}

type EarningsSummary = {
  paidCount: number
  totalGross: number
  totalCommission: number
  totalNet: number
  currentMonthNet: number
  pendingPayout: number
  completedPayout: number
}

type EarningsApiResponse = {
  ok?: boolean
  earnings?: Partial<EarningPayment>[]
  payments?: Partial<EarningPayment>[]
  summary?: Partial<EarningsSummary>
  error?: string
}

type NoticeState = {
  title: string
  description: string
  tone: 'warning' | 'success' | 'default'
} | null

const EMPTY_SUMMARY: EarningsSummary = {
  paidCount: 0,
  totalGross: 0,
  totalCommission: 0,
  totalNet: 0,
  currentMonthNet: 0,
  pendingPayout: 0,
  completedPayout: 0,
}

const payoutFilters: Array<{ label: string; value: PayoutFilter }> = [
  { label: 'Tümü', value: 'all' },
  { label: 'Bekleyen', value: 'unpaid' },
  { label: 'Planlanan', value: 'scheduled' },
  { label: 'Ödenen', value: 'paid' },
  { label: 'Blokeli', value: 'blocked' },
]

const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: 'Bekliyor', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  paid: { label: 'Başarılı', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  failed: { label: 'Başarısız', className: 'bg-red-50 text-red-700 ring-red-200' },
  cancelled: { label: 'İptal Edildi', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  refunded: { label: 'İade Edildi', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  unknown: { label: 'Bilinmiyor', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

const payoutStatusConfig: Record<PayoutStatus, { label: string; className: string }> = {
  unpaid: { label: 'Beklemede', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  scheduled: { label: 'Planlandı', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  paid: { label: 'Ödendi', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  blocked: { label: 'Blokeli', className: 'bg-red-50 text-red-700 ring-red-200' },
  unknown: { label: 'Bilinmiyor', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value || '').toLowerCase().trim()

  if (
    status === 'pending' ||
    status === 'paid' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'refunded'
  ) {
    return status
  }

  return 'unknown'
}

function normalizePayoutStatus(value: unknown): PayoutStatus {
  const status = String(value || '').toLowerCase().trim()

  if (status === 'unpaid' || status === 'scheduled' || status === 'paid' || status === 'blocked') {
    return status
  }

  return 'unpaid'
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function safeText(value: unknown, fallback = '') {
  const normalized = String(value || '').trim()
  return normalized || fallback
}

function fallbackId(payment: Partial<EarningPayment>, index: number) {
  return [payment.id, payment.clientName, payment.clientEmail, payment.createdAt, index]
    .filter(Boolean)
    .join('-')
}

function normalizePayment(payment: Partial<EarningPayment>, index: number): EarningPayment {
  return {
    id: safeText(payment.id, fallbackId(payment, index) || `earning-${index}`),
    clientName: safeText(payment.clientName, 'Danışan'),
    clientEmail: safeText(payment.clientEmail) || null,
    grossAmount: toNumber(payment.grossAmount),
    commissionAmount: toNumber(payment.commissionAmount),
    expertAmount: toNumber(payment.expertAmount),
    status: normalizePaymentStatus(payment.status),
    payoutStatus: normalizePayoutStatus(payment.payoutStatus),
    payoutPaidAt: safeText(payment.payoutPaidAt) || null,
    createdAt: safeText(payment.createdAt) || null,
  }
}

function isCurrentMonth(date: string | null | undefined) {
  if (!date) return false

  const target = new Date(date)
  if (Number.isNaN(target.getTime())) return false

  const now = new Date()
  return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth()
}

function sumMoney<T extends Record<K, number>, K extends keyof T>(items: T[], key: K) {
  return items.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}

function buildFallbackSummary(payments: EarningPayment[]): EarningsSummary {
  const paidPayments = payments.filter((payment) => payment.status === 'paid')
  const currentMonthPaidPayments = paidPayments.filter((payment) => isCurrentMonth(payment.createdAt))
  const pendingPayouts = paidPayments.filter((payment) => payment.payoutStatus !== 'paid')
  const completedPayouts = paidPayments.filter((payment) => payment.payoutStatus === 'paid')

  return {
    paidCount: paidPayments.length,
    totalGross: sumMoney(paidPayments, 'grossAmount'),
    totalCommission: sumMoney(paidPayments, 'commissionAmount'),
    totalNet: sumMoney(paidPayments, 'expertAmount'),
    currentMonthNet: sumMoney(currentMonthPaidPayments, 'expertAmount'),
    pendingPayout: sumMoney(pendingPayouts, 'expertAmount'),
    completedPayout: sumMoney(completedPayouts, 'expertAmount'),
  }
}

function mergeSummary(
  apiSummary: Partial<EarningsSummary> | undefined,
  fallbackSummary: EarningsSummary
): EarningsSummary {
  if (!apiSummary) return fallbackSummary

  return {
    paidCount: toNumber(apiSummary.paidCount ?? fallbackSummary.paidCount),
    totalGross: toNumber(apiSummary.totalGross ?? fallbackSummary.totalGross),
    totalCommission: toNumber(apiSummary.totalCommission ?? fallbackSummary.totalCommission),
    totalNet: toNumber(apiSummary.totalNet ?? fallbackSummary.totalNet),
    currentMonthNet: toNumber(apiSummary.currentMonthNet ?? fallbackSummary.currentMonthNet),
    pendingPayout: toNumber(apiSummary.pendingPayout ?? fallbackSummary.pendingPayout),
    completedPayout: toNumber(apiSummary.completedPayout ?? fallbackSummary.completedPayout),
  }
}

function formatMoney(value: number | null | undefined) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) return '₺0'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

function formatDate(date: string | null | undefined) {
  if (!date) return '-'

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '-'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Kazanç bilgileri şu anda görüntülenemiyor. Bağlantınızı kontrol edip tekrar deneyin.'
}

function sortPayments(payments: EarningPayment[]) {
  return [...payments].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bTime - aTime
  })
}

export default function ExpertEarningsPage() {
  const [payments, setPayments] = useState<EarningPayment[]>([])
  const [summary, setSummary] = useState<EarningsSummary>(EMPTY_SUMMARY)
  const [filter, setFilter] = useState<PayoutFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState<NoticeState>(null)

  const fetchEarnings = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    try {
      if (mode === 'initial') {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setNotice(null)

      const response = await fetch('/api/expert/earnings', {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })

      const data = (await response.json().catch(() => ({}))) as Partial<EarningsApiResponse>

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || 'Kazanç bilgileri şu anda alınamadı.')
      }

      const rawPayments = data.earnings || data.payments || []
      const normalizedPayments = sortPayments(rawPayments.map(normalizePayment))
      const fallbackSummary = buildFallbackSummary(normalizedPayments)

      setPayments(normalizedPayments)
      setSummary(mergeSummary(data.summary, fallbackSummary))
    } catch (error) {
      setPayments([])
      setSummary(EMPTY_SUMMARY)
      setNotice({
        title: 'Kazanç bilgileri alınamadı',
        description: getSafeErrorMessage(error),
        tone: 'warning',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchEarnings('initial')
  }, [fetchEarnings])

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return payments.filter((payment) => {
      const payoutMatch = filter === 'all' || payment.payoutStatus === filter
      const searchableText = [
        payment.id,
        payment.clientName,
        payment.clientEmail,
        payment.status,
        payment.payoutStatus,
        formatMoney(payment.grossAmount),
        formatMoney(payment.expertAmount),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return payoutMatch && (!keyword || searchableText.includes(keyword))
    })
  }, [payments, filter, search])

  const hasPayments = payments.length > 0
  const commissionRate = summary.totalGross > 0 ? Math.round((summary.totalCommission / summary.totalGross) * 100) : 30

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Mindora Uzman Paneli
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Kazançlar
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Görüşme gelirlerinizi, platform kesintisini, net kazancınızı ve aktarım
                durumunuzu güvenli şekilde tek ekrandan takip edin.
              </p>
            </div>

            <div className="grid gap-3 sm:flex sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchEarnings('refresh')}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? 'Yükleniyor...' : 'Yenile'}
              </button>
              <Link
                href="/expert/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                Dashboard
              </Link>
              <Link
                href="/expert/dashboard/sessions"
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                Görüşmeleri Gör
              </Link>
            </div>
          </div>
        </header>

        {notice ? (
          <NoticeCard
            title={notice.title}
            description={notice.description}
            tone={notice.tone}
            onRetry={() => void fetchEarnings('refresh')}
          />
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Toplam Net Kazanç"
            value={formatMoney(summary.totalNet)}
            description={`${summary.paidCount} başarılı ödeme`}
          />
          <SummaryCard
            title="Bu Ay Kazanç"
            value={formatMoney(summary.currentMonthNet)}
            description="İçinde bulunduğumuz ay"
          />
          <SummaryCard
            title="Bekleyen Ödeme"
            value={formatMoney(summary.pendingPayout)}
            description="Henüz aktarılmayan tutar"
          />
          <SummaryCard
            title="Aktarılan Tutar"
            value={formatMoney(summary.completedPayout)}
            description="Uzmana ödenen toplam"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <InfoBlock
            title="Brüt Ödeme"
            value={formatMoney(summary.totalGross)}
            description="Danışanlardan tahsil edilen başarılı ödemeler."
          />
          <InfoBlock
            title="Mindora Kesintisi"
            value={formatMoney(summary.totalCommission)}
            description={`Ortalama platform hizmet bedeli: %${commissionRate}.`}
          />
          <InfoBlock
            title="Net Kazanç"
            value={formatMoney(summary.totalNet)}
            description="Kesintiler sonrası uzman hesabına yansıyacak tutar."
          />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Ödeme Geçmişi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Görüşme bazlı brüt tutar, kesinti, net kazanç ve aktarım durumunu görüntüleyin.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Danışan veya ödeme ara..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 lg:w-80"
            />
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {payoutFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-2xl px-4 py-3 text-sm font-black ring-1 transition hover:-translate-y-0.5 ${
                  filter === item.value
                    ? 'bg-slate-950 text-white ring-slate-950'
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            title="Kazanç Kayıtları"
            description={loading ? 'Kayıtlar hazırlanıyor.' : `${filteredPayments.length} kayıt görüntüleniyor.`}
          />

          {loading ? (
            <EmptyState
              title="Kazanç kayıtları yükleniyor"
              description="Ödeme ve aktarım bilgileri hazırlanıyor."
            />
          ) : !hasPayments ? (
            <EmptyState
              title="Henüz kazanç kaydı yok"
              description="Ödeme tamamlanmış görüşmeler oluştuğunda brüt tutar, kesinti, net kazanç ve aktarım durumu burada listelenecek."
            />
          ) : filteredPayments.length === 0 ? (
            <EmptyState
              title="Bu filtrede kayıt bulunamadı"
              description="Arama metnini veya ödeme filtresini değiştirerek tekrar deneyin."
            />
          ) : (
            <>
              <EarningsCards payments={filteredPayments} />
              <EarningsTable payments={filteredPayments} />
            </>
          )}
        </section>
      </section>
    </main>
  )
}

function EarningsTable({ payments }: { payments: EarningPayment[] }) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <TableHead>Tarih</TableHead>
            <TableHead>Danışan</TableHead>
            <TableHead>Brüt</TableHead>
            <TableHead>Kesinti</TableHead>
            <TableHead>Net Kazanç</TableHead>
            <TableHead>Ödeme</TableHead>
            <TableHead>Aktarım</TableHead>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {payments.map((payment) => (
            <tr key={payment.id} className="align-top transition hover:bg-slate-50">
              <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-700">
                {formatDate(payment.createdAt)}
              </td>
              <td className="px-5 py-4">
                <p className="font-black text-slate-950">{payment.clientName}</p>
                <p className="mt-1 text-xs text-slate-500">{payment.clientEmail || '-'}</p>
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-950">
                {formatMoney(payment.grossAmount)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-700">
                {formatMoney(payment.commissionAmount)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-black text-indigo-700">
                {formatMoney(payment.expertAmount)}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <PaymentBadge status={payment.status} />
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <PayoutBadge status={payment.payoutStatus} />
                {payment.payoutPaidAt ? (
                  <p className="mt-2 text-xs text-slate-500">{formatDate(payment.payoutPaidAt)}</p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EarningsCards({ payments }: { payments: EarningPayment[] }) {
  return (
    <div className="grid gap-4 p-4 lg:hidden">
      {payments.map((payment) => (
        <article key={payment.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-slate-950">{payment.clientName}</p>
              <p className="mt-1 text-xs text-slate-500">{payment.clientEmail || '-'}</p>
              <p className="mt-2 text-xs font-bold text-slate-500">{formatDate(payment.createdAt)}</p>
            </div>
            <PaymentBadge status={payment.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <MiniMetric label="Brüt" value={formatMoney(payment.grossAmount)} />
            <MiniMetric label="Kesinti" value={formatMoney(payment.commissionAmount)} />
            <MiniMetric label="Net" value={formatMoney(payment.expertAmount)} emphasized />
            <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <p className="text-xs font-bold text-slate-500">Aktarım</p>
              <div className="mt-2"><PayoutBadge status={payment.payoutStatus} /></div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  )
}

function InfoBlock({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function MiniMetric({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-1 font-black ${emphasized ? 'text-indigo-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-7">
        <p className="text-sm font-black text-slate-800">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-5 sm:px-6">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  )
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="px-5 py-4 font-black">{children}</th>
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusConfig[status] || paymentStatusConfig.unknown

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}>
      {config.label}
    </span>
  )
}

function PayoutBadge({ status }: { status: PayoutStatus }) {
  const config = payoutStatusConfig[status] || payoutStatusConfig.unknown

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}>
      {config.label}
    </span>
  )
}

function NoticeCard({
  title,
  description,
  tone = 'default',
  onRetry,
}: {
  title: string
  description: string
  tone?: 'default' | 'warning' | 'success'
  onRetry?: () => void
}) {
  const className =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : 'border-slate-200 bg-white text-slate-700'

  return (
    <section className={`rounded-3xl border p-5 shadow-sm ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
          >
            Tekrar Dene
          </button>
        ) : null}
      </div>
    </section>
  )
}
