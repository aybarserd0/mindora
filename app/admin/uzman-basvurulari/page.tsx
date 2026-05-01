'use client'

import { useEffect, useMemo, useState } from 'react'

type ExpertStatus = 'pending' | 'approved' | 'rejected' | 'passive'

type Expert = {
  id: string
  name: string
  phone: string | null
  email: string
  title: string | null
  areas: string | null
  experience: string | null
  online: string | null
  price: string | null
  availability: string | null
  expectation: string | null
  note: string | null
  status: ExpertStatus
  created_at: string
}

function getStatusLabel(status: ExpertStatus) {
  switch (status) {
    case 'pending':
      return 'Beklemede'
    case 'approved':
      return 'Onaylandı'
    case 'rejected':
      return 'Reddedildi'
    case 'passive':
      return 'Pasif'
  }
}

function getStatusStyle(status: ExpertStatus) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700 ring-green-200'
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 ring-yellow-200'
    case 'rejected':
      return 'bg-red-100 text-red-700 ring-red-200'
    case 'passive':
      return 'bg-gray-200 text-gray-700 ring-gray-300'
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

export default function UzmanBasvurulariPage() {
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | ExpertStatus>('all')
  const [error, setError] = useState('')

  const filteredExperts = useMemo(() => {
    if (filter === 'all') return experts
    return experts.filter((expert) => expert.status === filter)
  }, [experts, filter])

  async function fetchExperts() {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('/api/admin/experts', {
        cache: 'no-store',
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError('Başvurular alınamadı.')
        return
      }

      setExperts(data.experts || [])
    } catch {
      setError('Sunucuya bağlanırken hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: ExpertStatus) {
    try {
      setUpdatingId(id)

      const res = await fetch('/api/admin/experts/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        alert('Durum güncellenemedi.')
        return
      }

      await fetchExperts()
    } catch {
      alert('Durum güncellenirken hata oluştu.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', {
      method: 'POST',
    })

    window.location.href = '/admin/login'
  }

  useEffect(() => {
    fetchExperts()
  }, [])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-6 py-10 text-[#171717]">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8a7662]">
              Mindora Admin
            </p>

            <h1 className="mt-2 text-3xl font-black text-[#2b2118]">
              Uzman Başvuruları
            </h1>

            <p className="mt-2 max-w-2xl text-[#6b5c4d]">
              Gelen uzman başvurularını incele, onayla, reddet veya pasife al.
              Onaylanan uzmanlar otomatik olarak uzmanlar sayfasında görünür.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/"
              className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-[#f0e8df]"
            >
              Siteye Dön
            </a>

            <button
              onClick={handleLogout}
              className="rounded-full bg-black px-5 py-2 text-sm font-bold text-white transition hover:bg-neutral-800"
            >
              Çıkış Yap
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-2xl px-4 py-3 text-sm font-bold ring-1 ring-black/5 ${
              filter === 'all' ? 'bg-black text-white' : 'bg-white text-[#3c3128]'
            }`}
          >
            Tümü ({experts.length})
          </button>

          {(['pending', 'approved', 'rejected', 'passive'] as ExpertStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-2xl px-4 py-3 text-sm font-bold ring-1 ring-black/5 ${
                  filter === status
                    ? 'bg-black text-white'
                    : 'bg-white text-[#3c3128]'
                }`}
              >
                {getStatusLabel(status)} (
                {experts.filter((expert) => expert.status === status).length})
              </button>
            )
          )}
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">Başvurular yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl bg-red-50 p-8 text-center shadow-sm ring-1 ring-red-100">
            <p className="font-bold text-red-700">{error}</p>
          </div>
        ) : filteredExperts.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">
              Bu filtrede başvuru bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {filteredExperts.map((expert) => (
              <div
                key={expert.id}
                className="rounded-3xl border border-[#e5d9cc] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-black text-[#2b2118]">
                        {expert.name}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getStatusStyle(
                          expert.status
                        )}`}
                      >
                        {getStatusLabel(expert.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-[#6b5c4d]">
                      {expert.title || 'Ünvan belirtilmedi'} •{' '}
                      {expert.areas || 'Uzmanlık alanı belirtilmedi'}
                    </p>

                    <p className="mt-2 text-xs font-semibold text-[#8a7662]">
                      Başvuru tarihi: {formatDate(expert.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={updatingId === expert.id}
                      onClick={() => updateStatus(expert.id, 'approved')}
                      className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
                    >
                      Onayla
                    </button>

                    <button
                      disabled={updatingId === expert.id}
                      onClick={() => updateStatus(expert.id, 'rejected')}
                      className="rounded-full bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-60"
                    >
                      Reddet
                    </button>

                    <button
                      disabled={updatingId === expert.id}
                      onClick={() => updateStatus(expert.id, 'passive')}
                      className="rounded-full bg-zinc-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                    >
                      Pasife Al
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-[#3c3128] md:grid-cols-2">
                  <p>
                    <b>Telefon:</b> {expert.phone || '-'}
                  </p>
                  <p>
                    <b>E-posta:</b> {expert.email}
                  </p>
                  <p>
                    <b>Deneyim:</b> {expert.experience || '-'}
                  </p>
                  <p>
                    <b>Online Görüşme:</b> {expert.online || '-'}
                  </p>
                  <p>
                    <b>Seans Ücreti:</b> {expert.price || '-'}
                  </p>
                  <p>
                    <b>Müsaitlik:</b> {expert.availability || '-'}
                  </p>
                  <p className="md:col-span-2">
                    <b>Mindora’dan Beklenti:</b> {expert.expectation || '-'}
                  </p>
                  <p className="md:col-span-2">
                    <b>Ek Not:</b> {expert.note || '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}