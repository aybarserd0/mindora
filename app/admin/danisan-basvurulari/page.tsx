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

function formatDate(date: string) {
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

export default function DanisanBasvurulariPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [experts, setExperts] = useState<Expert[]>([])
  const [selectedExperts, setSelectedExperts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
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
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const searchMatch = !keyword || text.includes(keyword)

      return statusMatch && searchMatch
    })
  }, [clients, filter, search])

  function getExpertName(expertId: string | null) {
    if (!expertId) return '-'
    const expert = experts.find((item) => item.id === expertId)
    return expert ? expert.name : expertId
  }

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
        setError('Danışan başvuruları alınamadı.')
        return
      }

      if (!expertsRes.ok || !expertsData.ok) {
        setError('Uzman listesi alınamadı.')
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
        alert('Danışan durumu güncellenemedi.')
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

      await fetchData()
    } catch {
      alert('Eşleştirme sırasında hata oluştu.')
    } finally {
      setUpdatingId(null)
    }
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
                Gelen danışan başvurularını incele, süreci takip et, uygun uzmanla
                eşleştir ve bildirim sürecini yönet.
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
              placeholder="İsim, telefon, e-posta, konu veya not ara..."
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
            {filteredClients.map((client) => (
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

                <div className="mt-5 rounded-2xl border border-[#e5d9cc] bg-white p-4">
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
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}