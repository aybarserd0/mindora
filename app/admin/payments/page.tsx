'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminHeader from '@/components/AdminHeader'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'

type Payment = {
  id: string
  client_id: string | null
  expert_id: string | null
  amount: number
  commission_amount: number
  expert_amount: number
  iyzico_token: string | null
  iyzico_payment_id: string | null
  iyzico_conversation_id: string | null
  status: PaymentStatus
  created_at: string
  client_applications?: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
  } | null
  experts?: {
    id: string
    name: string | null
    email: string | null
  } | null
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

function getStatusLabel(status: PaymentStatus) {
  switch (status) {
    case 'pending':
      return 'Bekliyor'
    case 'paid':
      return 'Ödendi'
    case 'failed':
      return 'Başarısız'
    case 'cancelled':
      return 'İptal'
    case 'refunded':
      return 'İade'
    default:
      return status
  }
}

function getStatusStyle(status: PaymentStatus) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 ring-yellow-200'
    case 'paid':
      return 'bg-green-100 text-green-800 ring-green-200'
    case 'failed':
      return 'bg-red-100 text-red-800 ring-red-200'
    case 'cancelled':
      return 'bg-gray-100 text-gray-700 ring-gray-200'
    case 'refunded':
      return 'bg-blue-100 text-blue-800 ring-blue-200'
    default:
      return 'bg-gray-100 text-gray-700 ring-gray-200'
  }
}

function safeText(value: string | null | undefined) {
  return value && value.trim() ? value : '-'
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | PaymentStatus>('all')
  const [search, setSearch] = useState('')

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return payments.filter((payment) => {
      const statusMatch = filter === 'all' || payment.status === filter

      const text = [
        payment.id,
        payment.iyzico_payment_id,
        payment.iyzico_conversation_id,
        payment.client_applications?.name,
        payment.client_applications?.email,
        payment.client_applications?.phone,
        payment.experts?.name,
        payment.experts?.email,
        payment.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const searchMatch = !keyword || text.includes(keyword)

      return statusMatch && searchMatch
    })
  }, [payments, filter, search])

  const summary = useMemo(() => {
    const paidPayments = payments.filter((payment) => payment.status === 'paid')
    const pendingPayments = payments.filter((payment) => payment.status === 'pending')
    const failedPayments = payments.filter((payment) => payment.status === 'failed')

    return {
      totalCount: payments.length,
      paidCount: paidPayments.length,
      pendingCount: pendingPayments.length,
      failedCount: failedPayments.length,
      paidAmount: paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      paidCommission: paidPayments.reduce(
        (sum, payment) => sum + Number(payment.commission_amount || 0),
        0
      ),
      paidExpertAmount: paidPayments.reduce(
        (sum, payment) => sum + Number(payment.expert_amount || 0),
        0
      ),
      pendingAmount: pendingPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      ),
    }
  }, [payments])

  async function fetchPayments() {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('/api/admin/payments', { cache: 'no-store' })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Ödemeler alınamadı.')
        return
      }

      setPayments(data.payments || [])
    } catch {
      setError('Sunucuya bağlanırken hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-6 py-10 text-[#171717]">
      <div className="mx-auto max-w-6xl">
        <AdminHeader />

        <section className="rounded-[2rem] border border-[#e5d9cc] bg-white/70 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8a7662]">
                Finans Yönetimi
              </p>

              <h1 className="mt-2 text-3xl font-black text-[#2b2118]">
                Ödemeler
              </h1>

              <p className="mt-2 max-w-2xl text-[#6b5c4d]">
                Danışan ödemelerini, Mindora komisyonunu, uzman paylarını ve
                ödeme durumlarını tek panelden takip et.
              </p>
            </div>

            <button
              onClick={fetchPayments}
              disabled={loading}
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black text-[#2b2118] transition hover:bg-[#f0e8df] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Yenile
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                Ödenen Toplam
              </p>
              <p className="mt-2 text-2xl font-black text-[#2b2118]">
                {formatMoney(summary.paidAmount)}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6b5c4d]">
                Başarılı ödeme sayısı: {summary.paidCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                Mindora Komisyonu
              </p>
              <p className="mt-2 text-2xl font-black text-green-700">
                {formatMoney(summary.paidCommission)}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6b5c4d]">
                Sadece paid ödemeler
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                Uzman Payı
              </p>
              <p className="mt-2 text-2xl font-black text-purple-700">
                {formatMoney(summary.paidExpertAmount)}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6b5c4d]">
                Aktarılması gereken toplam
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                Bekleyen
              </p>
              <p className="mt-2 text-2xl font-black text-yellow-700">
                {formatMoney(summary.pendingAmount)}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6b5c4d]">
                Pending ödeme sayısı: {summary.pendingCount}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {(['all', 'pending', 'paid', 'failed', 'cancelled', 'refunded'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold ring-1 ring-black/5 transition ${
                    filter === status
                      ? 'bg-black text-white'
                      : 'bg-white text-[#3c3128] hover:bg-[#f0e8df]'
                  }`}
                >
                  {status === 'all' ? 'Tümü' : getStatusLabel(status)}
                </button>
              )
            )}
          </div>

          <div className="mt-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Danışan, uzman, e-posta, payment id veya iyzico id ara..."
              className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-[#2b2118] outline-none transition placeholder:text-[#9b8b7c] focus:border-black/30"
            />
          </div>
        </section>

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">Ödemeler yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl bg-red-50 p-8 text-center shadow-sm ring-1 ring-red-100">
            <p className="font-bold text-red-700">{error}</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">
              Bu filtre veya arama için ödeme kaydı bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-3xl border border-[#e5d9cc] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#faf7f2] text-xs uppercase tracking-[0.16em] text-[#8a7662]">
                  <tr>
                    <th className="px-5 py-4">Durum</th>
                    <th className="px-5 py-4">Danışan</th>
                    <th className="px-5 py-4">Uzman</th>
                    <th className="px-5 py-4">Tutar</th>
                    <th className="px-5 py-4">Komisyon</th>
                    <th className="px-5 py-4">Uzman Payı</th>
                    <th className="px-5 py-4">Tarih</th>
                    <th className="px-5 py-4">iyzico</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eee3d8]">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="align-top transition hover:bg-[#faf7f2]">
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${getStatusStyle(
                            payment.status
                          )}`}
                        >
                          {getStatusLabel(payment.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-[#2b2118]">
                          {safeText(payment.client_applications?.name)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#6b5c4d]">
                          {safeText(payment.client_applications?.email)}
                        </p>
                        <p className="mt-1 text-xs text-[#8a7662]">
                          {safeText(payment.client_applications?.phone)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-[#2b2118]">
                          {safeText(payment.experts?.name)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#6b5c4d]">
                          {safeText(payment.experts?.email)}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-black text-[#2b2118]">
                        {formatMoney(payment.amount)}
                      </td>

                      <td className="px-5 py-4 font-black text-green-700">
                        {formatMoney(payment.commission_amount)}
                      </td>

                      <td className="px-5 py-4 font-black text-purple-700">
                        {formatMoney(payment.expert_amount)}
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-[#6b5c4d]">
                        {formatDate(payment.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold text-[#2b2118]">
                          Payment ID:
                        </p>
                        <p className="max-w-[220px] break-all text-xs text-[#6b5c4d]">
                          {payment.id}
                        </p>

                        <p className="mt-2 text-xs font-semibold text-[#2b2118]">
                          iyzico:
                        </p>
                        <p className="max-w-[220px] break-all text-xs text-[#6b5c4d]">
                          {safeText(payment.iyzico_payment_id)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-white/70 p-4 text-xs font-semibold text-[#6b5c4d] ring-1 ring-black/5">
          Toplam kayıt: {summary.totalCount} • Başarılı: {summary.paidCount} •
          Bekleyen: {summary.pendingCount} • Başarısız: {summary.failedCount}
        </div>
      </div>
    </main>
  )
}