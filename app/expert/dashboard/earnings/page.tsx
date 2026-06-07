'use client'

import { useEffect, useMemo, useState } from 'react'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
type PayoutStatus = 'unpaid' | 'scheduled' | 'paid' | 'blocked'
type PayoutFilter = 'all' | PayoutStatus

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
  ok: boolean
  earnings?: EarningPayment[]
  payments?: EarningPayment[]
  summary?: Partial<EarningsSummary>
  error?: string
}

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
  { label: 'Ödenmedi', value: 'unpaid' },
  { label: 'Planlandı', value: 'scheduled' },
  { label: 'Ödendi', value: 'paid' },
  { label: 'Blokeli', value: 'blocked' },
]

const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  pending: {
    label: 'Bekliyor',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  paid: {
    label: 'Ödendi',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  failed: {
    label: 'Başarısız',
    className: 'bg-red-50 text-red-700 ring-red-200',
  },
  cancelled: {
    label: 'İptal',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
  },
  refunded: {
    label: 'İade',
    className: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
}

const payoutStatusConfig: Record<PayoutStatus, { label: string; className: string }> = {
  unpaid: {
    label: 'Ödenmedi',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  scheduled: {
    label: 'Planlandı',
    className: 'bg-blue-50 text-blue-700 ring-blue-200',
  },
  paid: {
    label: 'Uzmana Ödendi',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  blocked: {
    label: 'Blokeli',
    className: 'bg-red-50 text-red-700 ring-red-200',
  },
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value || '').toLowerCase()

  if (
    status === 'pending' ||
    status === 'paid' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'refunded'
  ) {
    return status
  }

  return 'pending'
}

function normalizePayoutStatus(value: unknown): PayoutStatus {
  const status = String(value || '').toLowerCase()

  if (status === 'scheduled' || status === 'paid' || status === 'blocked') {
    return status
  }

  return 'unpaid'
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function normalizePayment(payment: Partial<EarningPayment>): EarningPayment {
  return {
    id: String(payment.id || crypto.randomUUID()),
    clientName: String(payment.clientName || 'Danışan'),
    clientEmail: payment.clientEmail || null,
    grossAmount: toNumber(payment.grossAmount),
    commissionAmount: toNumber(payment.commissionAmount),
    expertAmount: toNumber(payment.expertAmount),
    status: normalizePaymentStatus(payment.status),
    payoutStatus: normalizePayoutStatus(payment.payoutStatus),
    payoutPaidAt: payment.payoutPaidAt || null,
    createdAt: payment.createdAt || null,
  }
}

function buildFallbackSummary(payments: EarningPayment[]): EarningsSummary {
  const paidPayments = payments.filter((payment) => payment.status === 'paid')
  const currentMonthPaidPayments = paidPayments.filter((payment) =>
    isCurrentMonth(payment.createdAt)
  )
  const pendingPayouts = paidPayments.filter(
    (payment) => payment.payoutStatus !== 'paid'
  )
  const completedPayouts = paidPayments.filter(
    (payment) => payment.payoutStatus === 'paid'
  )

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
    totalCommission: toNumber(
      apiSummary.totalCommission ?? fallbackSummary.totalCommission
    ),
    totalNet: toNumber(apiSummary.totalNet ?? fallbackSummary.totalNet),
    currentMonthNet: toNumber(
      apiSummary.currentMonthNet ?? fallbackSummary.currentMonthNet
    ),
    pendingPayout: toNumber(
      apiSummary.pendingPayout ?? fallbackSummary.pendingPayout
    ),
    completedPayout: toNumber(
      apiSummary.completedPayout ?? fallbackSummary.completedPayout
    ),
  }
}

export default function ExpertEarningsPage() {
  const [payments, setPayments] = useState<EarningPayment[]>([])
  const [summary, setSummary] = useState<EarningsSummary>(EMPTY_SUMMARY)
  const [filter, setFilter] = useState<PayoutFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchEarnings() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/expert/earnings', {
        method: 'GET',
        cache: 'no-store',
      })

      const data = (await response.json()) as EarningsApiResponse

      if (!response.ok || !data.ok) {
        setPayments([])
        setSummary(EMPTY_SUMMARY)
        setError(data.error || 'Kazanç bilgileri alınamadı.')
        return
      }

      const rawPayments = data.earnings || data.payments || []
      const normalizedPayments = rawPayments.map(normalizePayment)
      const fallbackSummary = buildFallbackSummary(normalizedPayments)

      setPayments(normalizedPayments)
      setSummary(mergeSummary(data.summary, fallbackSummary))
    } catch {
      setPayments([])
      setSummary(EMPTY_SUMMARY)
      setError('Sunucuya bağlanırken hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEarnings()
  }, [])

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
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return payoutMatch && (!keyword || searchableText.includes(keyword))
    })
  }, [payments, filter, search])

  const hasPayments = payments.length > 0

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Uzman Paneli</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Kazançlar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Seans gelirlerinizi, Mindora komisyonunu, net kazancınızı ve payout
            durumlarınızı tek ekrandan takip edin.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchEarnings}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Yükleniyor...' : 'Yenile'}
        </button>
      </header>

      {error ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Kazanç verisi alınamadı.</p>
          <p className="mt-1 text-amber-800">{error}</p>
        </section>
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
          description="Henüz uzmana aktarılmayan"
        />
        <SummaryCard
          title="Tamamlanan Ödeme"
          value={formatMoney(summary.completedPayout)}
          description="Uzmana ödenmiş tutar"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Ödeme Geçmişi
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Seans bazlı brüt tutar, komisyon, net kazanç ve payout durumu.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Danışan, e-posta veya ödeme ara..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 lg:w-80"
          />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {payoutFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition ${
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <EmptyState
            title="Kazanç kayıtları yükleniyor"
            description="Ödeme ve payout bilgileri hazırlanıyor."
          />
        ) : !hasPayments ? (
          <EmptyState
            title="Henüz kazanç kaydı yok"
            description="Ödeme tamamlanmış seanslar oluştuğunda brüt tutar, komisyon, net kazanç ve payout durumu burada listelenecek."
          />
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            title="Bu filtrede kayıt bulunamadı"
            description="Arama metnini veya payout filtresini değiştirerek tekrar deneyin."
          />
        ) : (
          <EarningsTable payments={filteredPayments} />
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoBlock
            title="Brüt Ödeme"
            value={formatMoney(summary.totalGross)}
            description="Danışandan tahsil edilen toplam başarılı ödeme."
          />
          <InfoBlock
            title="Mindora Komisyonu"
            value={formatMoney(summary.totalCommission)}
            description="Başarılı ödemelerden ayrılan platform komisyonu."
          />
          <InfoBlock
            title="API Bağlantısı"
            value="/api/expert/earnings"
            description="Bu ekran canlı endpoint üzerinden güncel ödeme verisini çeker."
          />
        </div>
      </section>
    </div>
  )
}

function EarningsTable({ payments }: { payments: EarningPayment[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-5 py-4">Tarih</th>
            <th className="px-5 py-4">Danışan</th>
            <th className="px-5 py-4">Brüt</th>
            <th className="px-5 py-4">Komisyon</th>
            <th className="px-5 py-4">Net Kazanç</th>
            <th className="px-5 py-4">Ödeme</th>
            <th className="px-5 py-4">Payout</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {payments.map((payment) => (
            <tr key={payment.id} className="align-top transition hover:bg-slate-50">
              <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                {formatDate(payment.createdAt)}
              </td>
              <td className="px-5 py-4">
                <p className="font-semibold text-slate-950">{payment.clientName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {payment.clientEmail || '-'}
                </p>
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-950">
                {formatMoney(payment.grossAmount)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-emerald-700">
                {formatMoney(payment.commissionAmount)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-bold text-indigo-700">
                {formatMoney(payment.expertAmount)}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <PaymentBadge status={payment.status} />
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <PayoutBadge status={payment.payoutStatus} />
                {payment.payoutPaidAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDate(payment.payoutPaidAt)}
                  </p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function InfoBlock({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusConfig[status]

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function PayoutBadge({ status }: { status: PayoutStatus }) {
  const config = payoutStatusConfig[status]

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function formatMoney(value: number | null | undefined) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) return '-'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

function formatDate(date: string | null | undefined) {
  if (!date) return '-'

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  } catch {
    return '-'
  }
}

function isCurrentMonth(date: string | null | undefined) {
  if (!date) return false

  const target = new Date(date)

  if (Number.isNaN(target.getTime())) return false

  const now = new Date()

  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth()
  )
}

function sumMoney<T extends Record<K, number>, K extends keyof T>(
  items: T[],
  key: K
) {
  return items.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}
