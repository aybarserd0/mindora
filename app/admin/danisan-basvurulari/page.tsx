'use client'

import { useEffect, useState } from 'react'

type Client = {
  id: string
  name: string
  phone: string
  age: string
  topic: string
  duration: string
  previous_support: string
  start_time: string
  preference: string
  availability: string
  note: string
  status: string
  created_at: string
}

export default function DanisanBasvurulariPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchClients() {
    try {
      const res = await fetch('/api/admin/clients')
      const data = await res.json()

      if (data.ok) {
        setClients(data.clients)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  if (loading) {
    return <div style={{ padding: 20 }}>Yükleniyor...</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>
        Danışan Başvuruları
      </h1>

      {clients.length === 0 && <div>Başvuru yok</div>}

      {clients.map((c) => (
        <div
          key={c.id}
          style={{
            border: '1px solid #eee',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontWeight: 600 }}>{c.name}</h2>

          <div>📞 {c.phone}</div>
          <div>🎯 {c.topic}</div>
          <div>⏳ {c.duration}</div>
          <div>🧠 Önce destek: {c.previous_support}</div>
          <div>🚀 Başlama: {c.start_time}</div>
          <div>👤 Tercih: {c.preference}</div>
          <div>📅 Müsaitlik: {c.availability}</div>
          <div>📝 Not: {c.note}</div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>
            {new Date(c.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}