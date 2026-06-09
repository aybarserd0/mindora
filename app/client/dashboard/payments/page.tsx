'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'canceled'
  | 'refunded'
  | 'unknown'
  | string

type NormalizedPaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'unknown'

type ApiClientPayment = {
  id: string
  expertId?: string | null
  expertName?: string | null
  expertTitle?: string | null
  conversationId?: string | null
  sessionId?: string | null
  amount?: number | null
  grossAmount?: number | null
  totalAmount?: number | null
  currency?: string | null
  status?: PaymentStatus | null
  iyzicoPaymentId?: string | null
  paymentPageUrl?: string | null
  receiptUrl?: string | null
  paidAt?: string | null
  refundedAt?: string | null
  createdAt?: string | null
  chatHref?: string | null
  sessionHref?: string | null
}

type ClientPaymentsResponse = {
  ok?: boolean
  payments?: ApiClientPayment[]
  summary?: Partial<PaymentSummary>
  error?: string
}

type UiPayment = {
  id: string
  expertName: string
  expertTitle: string
  conversationId: string | null
  sessionId: string | null
  amount: number
  currency: string
  status: NormalizedPaymentStatus
  iyzicoPaymentId: string | null
  paymentPageUrl: string | null
  receiptUrl: string | null
  paidAt: string | null
  refundedAt: string | null
  createdAt: string | null
  createdTime: number
  chatHref: string
  sessionHref: string
}

type PaymentSummary = {
  totalPaid: number
  totalPending: number
  totalRefunded: number
  paidCount: number
  pendingCount: number
  failedCount: number
  refundedCount: number
}

type PaymentFilter = 'all' | 'paid' | 'pending' | 'failed' | 'refunded'

const EMPTY_SUMMARY: PaymentSummary = {
  totalPaid: 0,
  totalPending: 0,
  totalRefunded: 0,
  paidCount: 0,
  pendingCount: 0,
  failedCount: 0,
  refundedCount: 0,
}

const filters: Array<{ label: string; value: PaymentFilter }> = [
  { label: 'Tümü', value: 'all' },
  { label: 'Başarılı', value: 'paid' },
  { label: 'Bekleyen', value: 'pending' },
  { label: 'Başarısız', value: 'failed' },
  { label: 'İade', value: 'refunded' },
]

const statusConfig: Record<NormalizedPaymentStatus, { label: string; className: string }> = {
  pending: {
    label: 'Bekliyor',
    className: 'bg-amber-50 text-amber-700 ring-amber-100',
  },
  paid: {
    label: 'Başarılı',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
  failed: {
    label: 'Başarısız',
    className: 'bg-rose-50 text-rose-700 ring-rose-100',
  },
  cancelled: {
    label: 'İptal',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
  },
  refunded: {
    label: 'İade',
    className: 'bg-sky-50 text-sky-700 ring-sky-100',
  },
  unknown: {
    label: 'Belirlenmedi',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
}

function normalizeStatus(value: string | null | undefined): NormalizedPaymentStatus {
  const normalized = String(value || '').trim().toLowerCase()

  if (
    normalized === 'pending' ||
    normalized === 'paid' ||
    normalized === 'failed' ||
    normalized === 'refunded'
  ) {
    return normalized
  }

  if (normalized === 'cancelled' || normalized === 'canceled') {
    return 'cancelled'
  }

  return 'unknown'
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function getDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function getTime(value?: string | null) {
  return getDate(value)?.getTime() || 0
}

function formatDateTime(value?: string | null) {
  const date = getDate(value)
  if (!date) return 'Tarih bekleniyor'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatMoney(value: number | null | undefined, currency = 'TRY') {
  const amount = Number(value)

  if (!Number.isFinite(amount)) return '₺0'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
    maximumFractionDigits: 0,
  }).format(amount)
}

function buildTokenUrl(path: string | null | undefined, token: string) {
  if (!path) return '#'
  if (!token) return path

  try {
    const isAbsolute = /^https?:\/\//i.test(path)
    const url = isAbsolute ? new URL(path) : new URL(path, 'https://mindora.local')

    if (!url.searchParams.get('token')) {
      url.searchParams.set('token', token)
    }

    if (isAbsolute) return url.toString()

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    if (path.includes('token=')) return path

    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}token=${encodeURIComponent(token)}`
  }
}

function fallbackId(payment: ApiClientPayment, index: number) {
  return [
    payment.id,
    payment.iyzicoPaymentId,
    payment.conversationId,
    payment.createdAt,
    index,
  ]
    .filter(Boolean)
    .join('-')
}

function toUiPayment(payment: ApiClientPayment, index: number, token: string): UiPayment {
  const status = normalizeStatus(payment.status)
  const amount = toNumber(payment.amount ?? payment.grossAmount ?? payment.totalAmount)
  const createdAt = payment.createdAt || payment.paidAt || payment.refundedAt || null

  const rawChatHref =
    payment.chatHref ||
    (payment.conversationId ? `/client/chat/${encodeURIComponent(payment.conversationId)}` : null)

  const rawSessionHref =
    payment.sessionHref ||
    (payment.sessionId ? `/client/session/${encodeURIComponent(payment.sessionId)}` : null)

  return {
    id: String(payment.id || fallbackId(payment, index) || `payment-${index}`),
    expertName: payment.expertName?.trim() || 'Uzman eşleştirme sürecinde',
    expertTitle: payment.expertTitle?.trim() || 'Mindora Uzmanı',
    conversationId: payment.conversationId || null,
    sessionId: payment.sessionId || null,
    amount,
    currency: payment.currency || 'TRY',
    status,
    iyzicoPaymentId: payment.iyzicoPaymentId || null,
    paymentPageUrl: payment.paymentPageUrl || null,
    receiptUrl: payment.receiptUrl || null,
    paidAt: payment.paidAt || null,
    refundedAt: payment.refundedAt || null,
    createdAt,
    createdTime: getTime(createdAt),
    chatHref: buildTokenUrl(rawChatHref, token),
    sessionHref: buildTokenUrl(rawSessionHref, token),
  }
}

function buildFallbackSummary(payments: UiPayment[]): PaymentSummary {
  const paid = payments.filter((payment) => payment.status === 'paid')
  const pending = payments.filter((payment) => payment.status === 'pending')
  const failed = payments.filter((payment) => payment.status === 'failed')
  const refunded = payments.filter((payment) => payment.status === 'refunded')

  return {
    totalPaid: paid.reduce((sum, payment) => sum + payment.amount, 0),
    totalPending: pending.reduce((sum, payment) => sum + payment.amount, 0),
    totalRefunded: refunded.reduce((sum, payment) => sum + payment.amount, 0),
    paidCount: paid.length,
    pendingCount: pending.length,
    failedCount: failed.length,
    refundedCount: refunded.length,
  }
}

function mergeSummary(apiSummary: Partial<PaymentSummary> | undefined, fallback: PaymentSummary) {
  if (!apiSummary) return fallback

  return {
    totalPaid: toNumber(apiSummary.totalPaid ?? fallback.totalPaid),
    totalPending: toNumber(apiSummary.totalPending ?? fallback.totalPending),
    totalRefunded: toNumber(apiSummary.totalRefunded ?? fallback.totalRefunded),
    paidCount: toNumber(apiSummary.paidCount ?? fallback.paidCount),
    pendingCount: toNumber(apiSummary.pendingCount ?? fallback.pendingCount),
    failedCount: toNumber(apiSummary.failedCount ?? fallback.failedCount),
    refundedCount: toNumber(apiSummary.refundedCount ?? fallback.refundedCount),
  }
}

function ClientPaymentsContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [payments, setPayments] = useState<UiPayment[]>([])
  const [summary, setSummary] = useState<PaymentSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [softNotice, setSoftNotice] = useState('')
  const [filter, setFilter] = useState<PaymentFilter>('all')
  const [search, setSearch] = useState('')

  const fetchPayments = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      if (!token) {
        setSoftNotice('Güvenli erişim bağlantısı bulunamadı. Size iletilen danışan paneli bağlantısını kullanabilirsiniz.')
        setPayments([])
        setSummary(EMPTY_SUMMARY)
        setLoading(false)
        setRefreshing(false)
        return
      }

      try {
        if (mode === 'initial') {
          setLoading(true)
        } else {
          setRefreshing(true)
        }

        setSoftNotice('')

        const response = await fetch(`/api/client/payments?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        })

        const data = (await response.json().catch(() => ({}))) as ClientPaymentsResponse

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || 'Henüz ödeme kaydı bulunmuyor.')
        }

        const normalized = (data.payments || []).map((payment, index) =>
          toUiPayment(payment, index, token)
        )

        const fallback = buildFallbackSummary(normalized)

        setPayments(normalized)
        setSummary(mergeSummary(data.summary, fallback))
      } catch (err) {
        setPayments([])
        setSummary(EMPTY_SUMMARY)
        setSoftNotice(
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Henüz ödeme kaydı bulunmuyor.'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token]
  )

  useEffect(() => {
    void fetchPayments('initial')
  }, [fetchPayments])

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return payments
      .filter((payment) => {
        if (filter === 'all') return true
        if (filter === 'failed') return payment.status === 'failed' || payment.status === 'cancelled'
        return payment.status === filter
      })
      .filter((payment) => {
        const statusLabel = statusConfig[payment.status]?.label || ''
        const text = [
          payment.id,
          payment.expertName,
          payment.expertTitle,
          payment.iyzicoPaymentId,
          payment.status,
          statusLabel,
          formatMoney(payment.amount, payment.currency),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return !keyword || text.includes(keyword)
      })
      .sort((a, b) => b.createdTime - a.createdTime)
  }, [payments, filter, search])

  return (
    <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Mindora Danışan Paneli
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Ödemelerim
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Seans ödemelerinizi, ödeme durumlarını ve geçmiş ödeme kayıtlarınızı
                tek ekrandan takip edin.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchPayments('refresh')}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || refreshing ? 'Yükleniyor...' : 'Yenile'}
              </button>
              <Link
                href={buildTokenUrl('/client/dashboard', token)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
              >
                Dashboard
              </Link>
              <Link
                href={buildTokenUrl('/client/dashboard/sessions', token)}
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
              >
                Seanslarım
              </Link>
            </div>
          </div>
        </header>

        {softNotice ? (
          <NoticeCard
            title="Henüz ödeme kaydı bulunmuyor"
            description="İlk görüşme ödemeniz tamamlandığında ödeme geçmişiniz, durum bilgisi ve ilgili seans bağlantıları burada görüntülenecektir."
            detail={softNotice}
            onRetry={() => void fetchPayments('refresh')}
          />
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Başarılı Ödeme"
            value={formatMoney(summary.totalPaid)}
            description={`${summary.paidCount} ödeme tamamlandı`}
          />
          <SummaryCard
            title="Bekleyen Ödeme"
            value={formatMoney(summary.totalPending)}
            description={`${summary.pendingCount} kayıt bekliyor`}
          />
          <SummaryCard
            title="İade Edilen"
            value={formatMoney(summary.totalRefunded)}
            description={`${summary.refundedCount} iade kaydı`}
          />
          <SummaryCard
            title="Başarısız"
            value={String(summary.failedCount)}
            description="Tamamlanamayan ödeme"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <InfoBlock
            title="Güvenli ödeme altyapısı"
            description="Ödemeler Mindora ödeme akışı üzerinden takip edilir. Başarılı ödeme sonrası chat ve seans erişiminiz açılır."
          />
          <InfoBlock
            title="Ödeme sonrası erişim"
            description="Ödeme tamamlandığında ilgili görüşme ve mesajlaşma bağlantıları panelinizde görünür hale gelir."
          />
          <InfoBlock
            title="İade ve başarısız kayıtlar"
            description="İade, iptal veya başarısız ödeme kayıtları geçmiş bölümünde durum etiketiyle listelenir."
          />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Filtrele ve Ara</h2>
              <p className="mt-1 text-sm text-slate-500">
                Uzman adı, ödeme ID, tutar veya durum bilgisine göre arama yapın.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ödeme ara..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 lg:w-80"
            />
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-2xl px-4 py-3 text-sm font-black ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
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
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Ödeme Geçmişi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tüm ödeme kayıtlarınız ve ödeme durumlarınız.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {loading ? 'Yükleniyor' : `${filteredPayments.length} kayıt`}
            </span>
          </div>

          {loading ? (
            <EmptyState title="Ödemeler yükleniyor" description="Ödeme geçmişiniz hazırlanıyor." />
          ) : filteredPayments.length > 0 ? (
            <PaymentsTable payments={filteredPayments} />
          ) : (
            <EmptyState
              title="Ödeme kaydı bulunamadı"
              description="Ödeme işlemleriniz tamamlandığında tutar, tarih, durum ve ilgili seans bağlantıları burada listelenecektir."
            />
          )}
        </section>
      </div>
    </section>
  )
}

function PaymentsTable({ payments }: { payments: UiPayment[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-5 py-4 font-black">Tarih</th>
            <th className="px-5 py-4 font-black">Uzman</th>
            <th className="px-5 py-4 font-black">Tutar</th>
            <th className="px-5 py-4 font-black">Durum</th>
            <th className="px-5 py-4 font-black">Ödeme ID</th>
            <th className="px-5 py-4 text-right font-black">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {payments.map((payment) => (
            <tr key={payment.id} className="align-top transition hover:bg-slate-50">
              <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-700">
                {formatDateTime(payment.createdAt)}
              </td>
              <td className="px-5 py-4">
                <p className="font-black text-slate-950">{payment.expertName}</p>
                <p className="mt-1 text-xs text-slate-500">{payment.expertTitle}</p>
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-black text-indigo-700">
                {formatMoney(payment.amount, payment.currency)}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <PaymentBadge status={payment.status} />
                {payment.refundedAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    İade: {formatDateTime(payment.refundedAt)}
                  </p>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-xs font-bold text-slate-500">
                {payment.iyzicoPaymentId || payment.id}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-right">
                <div className="flex justify-end gap-2">
                  {payment.chatHref !== '#' ? (
                    <Link
                      href={payment.chatHref}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
                    >
                      Chat
                    </Link>
                  ) : null}

                  {payment.sessionHref !== '#' ? (
                    <Link
                      href={payment.sessionHref}
                      className="rounded-2xl bg-indigo-600 px-3 py-2 text-xs font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
                    >
                      Seans
                    </Link>
                  ) : null}

                  {payment.receiptUrl ? (
                    <a
                      href={payment.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
                    >
                      Dekont
                    </a>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentBadge({ status }: { status: NormalizedPaymentStatus }) {
  const config = statusConfig[status] || statusConfig.unknown

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}>
      {config.label}
    </span>
  )
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  )
}

function InfoBlock({ title, description }: { title: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  )
}

function NoticeCard({
  title,
  description,
  detail,
  onRetry,
}: {
  title: string
  description: string
  detail?: string
  onRetry: () => void
}) {
  return (
    <section className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 text-indigo-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black">{title}</p>
          <p className="mt-1 text-sm leading-6 text-indigo-800">{description}</p>
          {detail ? <p className="mt-1 text-xs font-semibold text-indigo-500">{detail}</p> : null}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-800 ring-1 ring-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-md"
        >
          Yenile
        </button>
      </div>
    </section>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8">
        <p className="text-sm font-black text-slate-800">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  )
}

export default function ClientDashboardPaymentsPage() {
  return (
    <Suspense
      fallback={
        <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Ödemeler yükleniyor...</p>
          </div>
        </section>
      }
    >
      <ClientPaymentsContent />
    </Suspense>
  )
}
