'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

type ClientStatus = 'active' | 'scheduled' | 'completed' | 'paused'

type ApiClientRow = {
  id?: string | null
  conversationId?: string | null
  clientId?: string | null
  name?: string | null
  email?: string | null
  topic?: string | null
  status?: string | null
  lastSessionAt?: string | null
  nextSessionAt?: string | null
  totalSessions?: number | null
  conversationHref?: string | null
  profileHref?: string | null
}

type ClientsApiResponse = {
  ok?: boolean
  clients?: ApiClientRow[]
  summary?: {
    total?: number
    active?: number
    scheduled?: number
    completed?: number
    paused?: number
  }
  error?: string
}

type ClientRow = {
  id: string
  name: string
  email: string | null
  topic: string | null
  status: ClientStatus
  lastSessionAt: string | null
  nextSessionAt: string | null
  totalSessions: number
  conversationHref: string
  profileHref: string
}

type SummaryCardItem = {
  title: string
  value: string
  description: string
}

const statusConfig: Record<ClientStatus, { label: string; className: string }> = {
  active: {
    label: 'Aktif',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  scheduled: {
    label: 'Planlandı',
    className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  },
  completed: {
    label: 'Tamamlandı',
    className: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  },
  paused: {
    label: 'Beklemede',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },
}

const infoPanels = [
  {
    title: 'Danışan Süreci',
    description:
      'Eşleşme tamamlandığında danışanın süreç durumu, son seansı ve iletişim aksiyonları bu panelden takip edilir.',
    items: [
      'Aktif danışanları tek ekrandan takip et',
      'Chat ve seans ekranlarına hızlı geç',
      'Tamamlanan süreçleri arşiv mantığıyla ayır',
    ],
  },
  {
    title: 'Canlı Veri Bağlantısı',
    description:
      'Bu ekran /api/expert/clients endpointinden conversations, client_applications ve bookings verilerini okuyacak şekilde hazırlandı.',
    items: [
      'conversations üzerinden danışan ilişkisi',
      'bookings üzerinden son ve gelecek seans',
      'client_applications üzerinden danışan bilgileri',
    ],
  },
]

function normalizeStatus(status: string | null | undefined): ClientStatus {
  const normalized = status?.trim().toLowerCase()

  if (
    normalized === 'completed' ||
    normalized === 'closed' ||
    normalized === 'finished'
  ) {
    return 'completed'
  }

  if (
    normalized === 'scheduled' ||
    normalized === 'matched' ||
    normalized === 'pending'
  ) {
    return 'scheduled'
  }

  if (
    normalized === 'paused' ||
    normalized === 'passive' ||
    normalized === 'cancelled'
  ) {
    return 'paused'
  }

  return 'active'
}

function normalizeClient(row: ApiClientRow): ClientRow {
  const id =
    safeNullableText(row.id) ||
    safeNullableText(row.conversationId) ||
    safeNullableText(row.clientId) ||
    crypto.randomUUID()

  const conversationId = safeNullableText(row.conversationId) || id

  return {
    id,
    name: safeNullableText(row.name) || 'Danışan',
    email: safeNullableText(row.email),
    topic: safeNullableText(row.topic),
    status: normalizeStatus(row.status),
    lastSessionAt: safeNullableText(row.lastSessionAt),
    nextSessionAt: safeNullableText(row.nextSessionAt),
    totalSessions: Number.isFinite(Number(row.totalSessions))
      ? Number(row.totalSessions)
      : 0,
    conversationHref:
      safeNullableText(row.conversationHref) || `/expert/chat/${conversationId}`,
    profileHref:
      safeNullableText(row.profileHref) ||
      `/expert/dashboard/clients?clientId=${encodeURIComponent(id)}`,
  }
}

function buildSummaryCards(clientRows: ClientRow[]): SummaryCardItem[] {
  const total = clientRows.length
  const active = clientRows.filter((client) => client.status === 'active').length
  const completed = clientRows.filter(
    (client) => client.status === 'completed'
  ).length
  const scheduled = clientRows.filter(
    (client) => client.status === 'scheduled'
  ).length

  return [
    {
      title: 'Toplam Danışan',
      value: String(total),
      description: 'Tüm eşleşmeler',
    },
    {
      title: 'Aktif Süreç',
      value: String(active),
      description: 'Devam eden danışan',
    },
    {
      title: 'Tamamlanan',
      value: String(completed),
      description: 'Kapanan süreç',
    },
    {
      title: 'Planlanan',
      value: String(scheduled),
      description: 'İlk seansı bekleyen',
    },
  ]
}

export default function ExpertClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ClientStatus>('all')

  async function fetchClients() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/expert/clients', { cache: 'no-store' })
      const data = (await response.json()) as ClientsApiResponse

      if (!response.ok || !data.ok) {
        setError(data.error || 'Danışan bilgileri alınamadı.')
        setClients([])
        return
      }

      setClients((data.clients || []).map(normalizeClient))
    } catch {
      setError('Sunucuya bağlanırken hata oluştu.')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const filteredClients = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return clients.filter((client) => {
      const statusMatch =
        statusFilter === 'all' || client.status === statusFilter

      const searchableText = [
        client.name,
        client.email,
        client.topic,
        client.status,
        client.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const searchMatch = !keyword || searchableText.includes(keyword)

      return statusMatch && searchMatch
    })
  }, [clients, search, statusFilter])

  const summaryCards = buildSummaryCards(clients)
  const activeClients = filteredClients.filter(
    (client) => client.status !== 'completed'
  )
  const completedClients = filteredClients.filter(
    (client) => client.status === 'completed'
  )

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Uzman Paneli</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Danışanlar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Aktif danışanlarınızı, geçmiş görüşmeleri, seans sayılarını ve danışan
            bazlı aksiyonları tek ekrandan takip edin.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={fetchClients}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Yenile
          </button>
          <Link
            href="/expert/dashboard/sessions"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Seanslara Git
          </Link>
          <Link
            href="/expert/dashboard/profile"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Profilimi Düzenle
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Danışan verileri alınamadı.</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard
            key={card.title}
            title={card.title}
            value={card.value}
            description={card.description}
          />
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Filtrele ve Ara
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Danışan adı, e-posta, konu veya durum bilgisine göre arama yapın.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Danışan ara..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 lg:w-80"
          />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {(['all', 'active', 'scheduled', 'completed', 'paused'] as const).map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition ${
                  statusFilter === status
                    ? 'bg-slate-950 text-white ring-slate-950'
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {status === 'all' ? 'Tümü' : statusConfig[status].label}
              </button>
            )
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader
          title="Aktif Danışanlar"
          description="Devam eden süreçler, son görüşmeler ve hızlı aksiyonlar."
          badge={
            loading
              ? 'Yükleniyor'
              : activeClients.length > 0
                ? `${activeClients.length} danışan`
                : 'Veri bekleniyor'
          }
        />

        {loading ? (
          <LoadingState />
        ) : activeClients.length > 0 ? (
          <ClientTable clients={activeClients} />
        ) : (
          <EmptyClientState />
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader
          title="Tamamlanan Süreçler"
          description="Kapanan veya tamamlanan danışan süreçleri."
          badge={completedClients.length > 0 ? `${completedClients.length} kayıt` : 'Henüz yok'}
        />

        {loading ? (
          <LoadingState />
        ) : completedClients.length > 0 ? (
          <ClientTable clients={completedClients} />
        ) : (
          <div className="px-5 py-8 text-sm text-slate-500 sm:px-6">
            Henüz tamamlanan danışan süreci bulunmuyor.
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {infoPanels.map((panel) => (
          <InfoPanel
            key={panel.title}
            title={panel.title}
            description={panel.description}
            items={panel.items}
          />
        ))}
      </section>
    </div>
  )
}

function ClientTable({ clients }: { clients: ClientRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <TableHead>Danışan</TableHead>
            <TableHead>Konu</TableHead>
            <TableHead>Seans</TableHead>
            <TableHead>Son Seans</TableHead>
            <TableHead>Sonraki Seans</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead align="right">İşlemler</TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {clients.map((client) => (
            <tr key={client.id} className="transition hover:bg-slate-50/80">
              <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {safeText(client.name)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {safeText(client.email)}
                  </p>
                </div>
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600 sm:px-6">
                {safeText(client.topic)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700 sm:px-6">
                {client.totalSessions}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600 sm:px-6">
                {formatDateTime(client.lastSessionAt)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600 sm:px-6">
                {formatDateTime(client.nextSessionAt)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                <StatusBadge status={client.status} />
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-right sm:px-6">
                <div className="flex justify-end gap-2">
                  <Link
                    href={client.conversationHref}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    Chat
                  </Link>
                  <Link
                    href={client.profileHref}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Detay
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionHeader({
  title,
  description,
  badge,
}: {
  title: string
  description: string
  badge: string
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
        {badge}
      </div>
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

function EmptyClientState() {
  return (
    <div className="px-5 py-12 text-center sm:px-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
        👥
      </div>
      <h3 className="mt-5 text-base font-semibold text-slate-950">
        Henüz danışan bulunmuyor
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Admin tarafından bir danışan size eşleştirildiğinde burada aktif danışan
        bilgileri, son seans tarihi ve chat bağlantısı görünecek.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/expert/dashboard/sessions"
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Seansları Gör
        </Link>
        <Link
          href="/expert/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Panele Dön
        </Link>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="px-5 py-12 text-center sm:px-6">
      <p className="text-sm font-semibold text-slate-700">
        Danışanlar yükleniyor...
      </p>
    </div>
  )
}

function InfoPanel({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: string[]
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm text-slate-600">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StatusBadge({ status }: { status: ClientStatus }) {
  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function TableHead({
  children,
  align = 'left',
}: {
  children: ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function formatDateTime(value: string | null) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function safeNullableText(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function safeText(value: string | null | undefined) {
  return safeNullableText(value) || '-'
}
