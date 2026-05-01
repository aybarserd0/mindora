'use client'

import { useEffect, useState } from 'react'

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
  status: 'pending' | 'approved' | 'rejected' | 'passive'
  created_at: string
}

export default function UzmanBasvurulariPage() {
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchExperts() {
    setLoading(true)

    const res = await fetch('/api/admin/experts')
    const data = await res.json()

    if (data.ok) {
      setExperts(data.experts)
    }

    setLoading(false)
  }

  async function updateStatus(id: string, status: Expert['status']) {
    const res = await fetch('/api/admin/experts/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })

    const data = await res.json()

    if (data.ok) {
      await fetchExperts()
    } else {
      alert('Durum güncellenemedi')
    }
  }

  useEffect(() => {
    fetchExperts()
  }, [])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-[#2b2118]">
          Uzman Başvuruları
        </h1>

        <p className="mt-2 text-[#6b5c4d]">
          Gelen uzman başvurularını buradan onaylayabilir veya pasife
          alabilirsin.
        </p>

        {loading ? (
          <p className="mt-8">Yükleniyor...</p>
        ) : experts.length === 0 ? (
          <p className="mt-8">Henüz uzman başvurusu yok.</p>
        ) : (
          <div className="mt-8 grid gap-5">
            {experts.map((expert) => (
              <div
                key={expert.id}
                className="rounded-3xl border border-[#e5d9cc] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-[#2b2118]">
                        {expert.name}
                      </h2>

                      <span className="rounded-full bg-[#efe7dc] px-3 py-1 text-xs font-semibold text-[#6b4f35]">
                        {expert.status}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-[#6b5c4d]">
                      {expert.title || '-'} • {expert.areas || '-'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateStatus(expert.id, 'approved')}
                      className="rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Onayla
                    </button>

                    <button
                      onClick={() => updateStatus(expert.id, 'rejected')}
                      className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Reddet
                    </button>

                    <button
                      onClick={() => updateStatus(expert.id, 'passive')}
                      className="rounded-full bg-zinc-700 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Pasife al
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
                    <b>Online:</b> {expert.online || '-'}
                  </p>
                  <p>
                    <b>Ücret:</b> {expert.price || '-'}
                  </p>
                  <p>
                    <b>Müsaitlik:</b> {expert.availability || '-'}
                  </p>
                  <p className="md:col-span-2">
                    <b>Beklenti:</b> {expert.expectation || '-'}
                  </p>
                  <p className="md:col-span-2">
                    <b>Not:</b> {expert.note || '-'}
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