'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminHeader from '@/components/AdminHeader'

type ClientStatus =
  | 'new'
  | 'reviewing'
  | 'matched'
  | 'contacted'
  | 'completed'
  | 'cancelled'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'

type LatestPayment = {
  id: string
  status: PaymentStatus
  amount: number
  commission_amount: number
  expert_amount: number
  payment_page_url: string | null
  iyzico_payment_id: string | null
  expert_payout_status: string | null
  expert_payout_paid_at: string | null
  created_at: string
}

type Client = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  age: string | null
  topic: string | null
  duration: string | null
  previous_support: string | null
  start_time: string | null
  preference: string | null
  availability: string | null
  note: string | null
  status: ClientStatus
  matched_expert_id: string | null
  created_at: string
  latest_payment: LatestPayment | null
}

type Expert = {
  id: string
  name: string
  title: string | null
  areas: string | null
  status: 'pending' | 'approved' | 'rejected' | 'passive'
}

function getStatusLabel(status: ClientStatus) {
  switch (status) {
    case 'new':
      return 'Yeni'
    case 'reviewing':
      return 'İncelemede'
    case 'matched':
      return 'Eşleşti'
    case 'contacted':
      return 'İletişime Geçildi'
    case 'completed':
      return 'Tamamlandı'
    case 'cancelled':
      return 'İptal'
  }
}

function getStatusStyle(status: ClientStatus) {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-700 ring-blue-200'
    case 'reviewing':
      return 'bg-yellow-100 text-yellow-700 ring-yellow-200'
    case 'matched':
      return 'bg-purple-100 text-purple-700 ring-purple-200'
    case 'contacted':
      return 'bg-indigo-100 text-indigo-700 ring-indigo-200'
    case 'completed':
      return 'bg-green-100 text-green-700 ring-green-200'
    case 'cancelled':
      return 'bg-red-100 text-red-700 ring-red-200'
  }
}

function getPaymentLabel(status: PaymentStatus) {
  switch (status) {
    case 'pending':
      return 'Ödeme Bekliyor'
    case 'paid':
      return 'Ödendi'
    case 'failed':
      return 'Başarısız'
    case 'cancelled':
      return 'İptal'
    case 'refunded':
      return 'İade'
  }
}

function getPaymentStyle(status: PaymentStatus) {
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
  }
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

function safeText(value: string | null | undefined) {
  return value && value.trim() ? value : '-'
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

export default function DanisanBasvurulariPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [experts, setExperts] = useState<Expert[]>([])
  const [selectedExperts, setSelectedExperts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null)
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | ClientStatus>('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const approvedExperts = useMemo(
    () => experts.filter((expert) => expert.status === 'approved'),
    [experts]
  )

  const counts = useMemo(() => {
    return {
      all: clients.length,
      new: clients.filter((client) => client.status === 'new').length,
      reviewing: clients.filter((client) => client.status === 'reviewing').length,
      matched: clients.filter((client) => client.status === 'matched').length,
      contacted: clients.filter((client) => client.status === 'contacted').length,
      completed: clients.filter((client) => client.status === 'completed').length,
      cancelled: clients.filter((client) => client.status === 'cancelled').length,
    }
  }, [clients])

  const paymentSummary = useMemo(() => {
    const payments = clients
      .map((client) => client.latest_payment)
      .filter(Boolean) as LatestPayment[]

    const paidPayments = payments.filter((payment) => payment.status === 'paid')
    const pendingPayments = payments.filter((payment) => payment.status === 'pending')

    return {
      count: payments.length,
      paidCount: paidPayments.length,
      pendingCount: pendingPayments.length,
      paidAmount: paidPayments.reduce((sum, payment) => sum + payment.amount, 0),
      paidCommission: paidPayments.reduce(
        (sum, payment) => sum + payment.commission_amount,
        0
      ),
      paidExpertAmount: paidPayments.reduce(
        (sum, payment) => sum + payment.expert_amount,
        0
      ),
    }
  }, [clients])

  function getExpertName(expertId: string | null) {
    if (!expertId) return '-'
    const expert = experts.find((item) => item.id === expertId)
    return expert ? expert.name : expertId
  }

  const filteredClients = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return clients.filter((client) => {
      const statusMatch = filter === 'all' || client.status === filter

      const text = [
        client.name,
        client.phone,
        client.email,
        client.age,
        client.topic,
        client.duration,
        client.preference,
        client.availability,
        client.note,
        getExpertName(client.matched_expert_id),
        client.latest_payment?.status,
        client.latest_payment?.iyzico_payment_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const searchMatch = !keyword || text.includes(keyword)

      return statusMatch && searchMatch
    })
  }, [clients, filter, search, experts])

  async function fetchData() {
    try {
      setLoading(true)
      setError('')

      const [clientsRes, expertsRes] = await Promise.all([
        fetch('/api/admin/clients', { cache: 'no-store' }),
        fetch('/api/admin/experts', { cache: 'no-store' }),
      ])

      const clientsData = await clientsRes.json()
      const expertsData = await expertsRes.json()

      if (!clientsRes.ok || !clientsData.ok) {
        setError(clientsData.error || 'Danışan başvuruları alınamadı.')
        return
      }

      if (!expertsRes.ok || !expertsData.ok) {
        setError(expertsData.error || 'Uzman listesi alınamadı.')
        return
      }

      setClients(clientsData.clients || [])
      setExperts(expertsData.experts || [])
    } catch {
      setError('Sunucuya bağlanırken hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: ClientStatus) {
    try {
      setUpdatingId(id)

      const res = await fetch('/api/admin/clients/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        alert(data.error || 'Danışan durumu güncellenemedi.')
        return
      }

      await fetchData()
    } catch {
      alert('Durum güncellenirken hata oluştu.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function matchClient(clientId: string) {
    const expertId = selectedExperts[clientId]

    if (!expertId) {
      alert('Lütfen önce bir uzman seç.')
      return
    }

    try {
      setUpdatingId(clientId)

      const res = await fetch('/api/admin/clients/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, expertId }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        alert(data.error || 'Eşleştirme başarısız.')
        return
      }

      setSelectedExperts((prev) => {
        const next = { ...prev }
        delete next[clientId]
        return next
      })

      await fetchData()
    } catch {
      alert('Eşleştirme sırasında hata oluştu.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function createPaymentLink(client: Client) {
    if (!client.matched_expert_id) {
      alert('Ödeme linki oluşturmadan önce danışanı bir uzmanla eşleştir.')
      return
    }

    if (client.latest_payment?.status === 'paid') {
      alert('Bu danışanın ödemesi zaten tamamlanmış.')
      return
    }

    try {
      setPaymentLoadingId(client.id)

      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        alert(data.error || 'Ödeme linki oluşturulamadı.')
        return
      }

      if (data.paymentPageUrl) {
        await navigator.clipboard.writeText(data.paymentPageUrl)
        setCopiedClientId(client.id)
        setTimeout(() => setCopiedClientId(null), 2500)
        window.open(data.paymentPageUrl, '_blank', 'noopener,noreferrer')
      }

      await fetchData()
    } catch {
      alert('Ödeme linki oluşturulurken hata oluştu.')
    } finally {
      setPaymentLoadingId(null)
    }
  }

  async function copyPaymentLink(client: Client) {
    const link = client.latest_payment?.payment_page_url

    if (!link) return

    await navigator.clipboard.writeText(link)
    setCopiedClientId(client.id)
    setTimeout(() => setCopiedClientId(null), 2500)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-6 py-10 text-[#171717]">
      <div className="mx-auto max-w-6xl">
        <AdminHeader />

        <section className="rounded-[2rem] border border-[#e5d9cc] bg-white/70 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8a7662]">
                Operasyon Yönetimi
              </p>

              <h2 className="mt-2 text-3xl font-black text-[#2b2118]">
                Danışan Başvuruları
              </h2>

              <p className="mt-2 max-w-2xl text-[#6b5c4d]">
                Gelen danışan başvurularını incele, uygun uzmanla eşleştir,
                ödeme durumunu takip et ve süreci tek panelden yönet.
              </p>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black text-[#2b2118] transition hover:bg-[#f0e8df] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Yenile
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                Ödeme Kaydı
              </p>
              <p className="mt-2 text-2xl font-black text-[#2b2118]">
                {paymentSummary.count}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6b5c4d]">
                DB’de görünen son ödeme kayıtları
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                Ödenen Toplam
              </p>
              <p className="mt-2 text-2xl font-black text-[#2b2118]">
                {formatMoney(paymentSummary.paidAmount)}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6b5c4d]">
                Paid ödeme sayısı: {paymentSummary.paidCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                Komisyon
              </p>
              <p className="mt-2 text-2xl font-black text-green-700">
                {formatMoney(paymentSummary.paidCommission)}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6b5c4d]">
                Mindora payı
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                Uzman Payı
              </p>
              <p className="mt-2 text-2xl font-black text-purple-700">
                {formatMoney(paymentSummary.paidExpertAmount)}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6b5c4d]">
                Pending: {paymentSummary.pendingCount}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-2xl px-4 py-3 text-sm font-bold ring-1 ring-black/5 transition ${
                filter === 'all'
                  ? 'bg-black text-white'
                  : 'bg-white text-[#3c3128] hover:bg-[#f0e8df]'
              }`}
            >
              Tümü ({counts.all})
            </button>

            {(['new', 'reviewing', 'matched', 'contacted', 'completed', 'cancelled'] as ClientStatus[]).map(
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
                  {getStatusLabel(status)} ({counts[status]})
                </button>
              )
            )}
          </div>

          <div className="mt-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="İsim, telefon, e-posta, konu, uzman, payment id veya not ara..."
              className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-[#2b2118] outline-none transition placeholder:text-[#9b8b7c] focus:border-black/30"
            />
          </div>
        </section>

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">
              Danışan başvuruları yükleniyor...
            </p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl bg-red-50 p-8 text-center shadow-sm ring-1 ring-red-100">
            <p className="font-bold text-red-700">{error}</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">
              Bu filtre veya arama için danışan başvurusu bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {filteredClients.map((client) => {
              const payment = client.latest_payment
              const canCreatePayment = Boolean(client.matched_expert_id)
              const canOpenPaymentLink =
                payment?.status === 'pending' && Boolean(payment.payment_page_url)

              return (
                <article
                  key={client.id}
                  className="rounded-3xl border border-[#e5d9cc] bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-black text-[#2b2118]">
                          {safeText(client.name)}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getStatusStyle(
                            client.status
                          )}`}
                        >
                          {getStatusLabel(client.status)}
                        </span>

                        {payment ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getPaymentStyle(
                              payment.status
                            )}`}
                          >
                            {getPaymentLabel(payment.status)}
                          </span>
                        ) : canCreatePayment ? (
                          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700 ring-1 ring-orange-200">
                            Ödeme Linki Yok
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                            Önce Uzman Ata
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-[#6b5c4d]">
                        {safeText(client.topic)} • {safeText(client.age)}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-[#8a7662]">
                        Başvuru tarihi: {formatDate(client.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={updatingId === client.id}
                        onClick={() => updateStatus(client.id, 'reviewing')}
                        className="rounded-full bg-yellow-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        İncelemede
                      </button>

                      <button
                        disabled={updatingId === client.id}
                        onClick={() => updateStatus(client.id, 'contacted')}
                        className="rounded-full bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        İletişime Geçildi
                      </button>

                      <button
                        disabled={updatingId === client.id}
                        onClick={() => updateStatus(client.id, 'completed')}
                        className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Tamamlandı
                      </button>

                      <button
                        disabled={updatingId === client.id}
                        onClick={() => updateStatus(client.id, 'cancelled')}
                        className="rounded-full bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        İptal
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 rounded-2xl bg-[#faf7f2] p-5 text-sm text-[#3c3128] md:grid-cols-2">
                    <p>
                      <b>Telefon:</b> {safeText(client.phone)}
                    </p>
                    <p>
                      <b>E-posta:</b> {safeText(client.email)}
                    </p>
                    <p>
                      <b>Yaş:</b> {safeText(client.age)}
                    </p>
                    <p>
                      <b>Destek Konusu:</b> {safeText(client.topic)}
                    </p>
                    <p>
                      <b>Süre:</b> {safeText(client.duration)}
                    </p>
                    <p>
                      <b>Daha Önce Destek:</b> {safeText(client.previous_support)}
                    </p>
                    <p>
                      <b>Başlama Zamanı:</b> {safeText(client.start_time)}
                    </p>
                    <p>
                      <b>Psikolog Tercihi:</b> {safeText(client.preference)}
                    </p>
                    <p>
                      <b>Müsaitlik:</b> {safeText(client.availability)}
                    </p>
                    <p className="md:col-span-2">
                      <b>Eşleşen Uzman:</b> {getExpertName(client.matched_expert_id)}
                    </p>
                    <p className="md:col-span-2">
                      <b>Ek Not:</b> {safeText(client.note)}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#e5d9cc] bg-white p-4">
                      <p className="mb-3 text-sm font-black text-[#2b2118]">
                        Uzman Eşleştirme
                      </p>

                      <div className="flex flex-col gap-3 md:flex-row">
                        <select
                          value={selectedExperts[client.id] || ''}
                          onChange={(event) =>
                            setSelectedExperts((prev) => ({
                              ...prev,
                              [client.id]: event.target.value,
                            }))
                          }
                          className="min-h-11 flex-1 rounded-full border border-black/10 bg-[#faf7f2] px-4 text-sm font-semibold outline-none"
                        >
                          <option value="">Onaylı uzman seç</option>

                          {approvedExperts.map((expert) => (
                            <option key={expert.id} value={expert.id}>
                              {expert.name}
                              {expert.title ? ` • ${expert.title}` : ''}
                              {expert.areas ? ` • ${expert.areas}` : ''}
                            </option>
                          ))}
                        </select>

                        <button
                          disabled={
                            updatingId === client.id ||
                            !selectedExperts[client.id] ||
                            approvedExperts.length === 0
                          }
                          onClick={() => matchClient(client.id)}
                          className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Uzman Ata
                        </button>
                      </div>

                      {approvedExperts.length === 0 && (
                        <p className="mt-3 text-sm font-semibold text-red-700">
                          Onaylı uzman yok. Önce Uzman Başvuruları sayfasından bir
                          uzmanı onayla.
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-green-950">
                            Ödeme Yönetimi
                          </p>
                          <p className="mt-1 text-xs font-semibold text-green-800">
                            Ödeme linki ve ödeme durumu DB’den takip edilir.
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
                          {payment ? getPaymentLabel(payment.status) : canCreatePayment ? 'Link Yok' : 'Kapalı'}
                        </span>
                      </div>

                      {payment ? (
                        <div className="mt-4 space-y-3">
                          <div className="grid gap-2 text-sm text-green-950 sm:grid-cols-3">
                            <p>
                              <b>Tutar:</b>
                              <br />
                              {formatMoney(payment.amount)}
                            </p>
                            <p>
                              <b>Komisyon:</b>
                              <br />
                              {formatMoney(payment.commission_amount)}
                            </p>
                            <p>
                              <b>Uzman Payı:</b>
                              <br />
                              {formatMoney(payment.expert_amount)}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white p-3 text-xs font-semibold text-green-900 ring-1 ring-green-100">
                            <p>
                              <b>Durum:</b> {getPaymentLabel(payment.status)}
                            </p>
                            <p className="mt-1">
                              <b>Tarih:</b> {formatDate(payment.created_at)}
                            </p>
                            <p className="mt-1 break-all">
                              <b>iyzico:</b> {safeText(payment.iyzico_payment_id)}
                            </p>
                            {payment.payment_page_url && (
                              <p className="mt-1 break-all">
                                <b>Link:</b> {payment.payment_page_url}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            {canOpenPaymentLink && (
                              <>
                                <button
                                  onClick={() => copyPaymentLink(client)}
                                  className="rounded-full bg-green-700 px-4 py-2 text-sm font-black text-white transition hover:bg-green-800"
                                >
                                  {copiedClientId === client.id ? 'Kopyalandı' : 'Linki Kopyala'}
                                </button>

                                <a
                                  href={payment.payment_page_url || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full border border-green-200 bg-white px-4 py-2 text-center text-sm font-black text-green-800 transition hover:bg-green-100"
                                >
                                  Linki Aç
                                </a>
                              </>
                            )}

                            {payment.status !== 'paid' && !canOpenPaymentLink && (
                              <button
                                disabled={!canCreatePayment || paymentLoadingId === client.id}
                                onClick={() => createPaymentLink(client)}
                                className="rounded-full bg-green-700 px-4 py-2 text-sm font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Yeni Link Oluştur
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <button
                            disabled={!canCreatePayment || paymentLoadingId === client.id}
                            onClick={() => createPaymentLink(client)}
                            className="w-full rounded-full bg-green-700 px-5 py-3 text-sm font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {paymentLoadingId === client.id
                              ? 'Ödeme Linki Oluşturuluyor...'
                              : 'Ödeme Linki Oluştur'}
                          </button>

                          {!canCreatePayment && (
                            <p className="mt-3 text-xs font-semibold text-red-700">
                              Ödeme linki için önce danışanı onaylı bir uzmanla eşleştir.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}