'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

type ClientStatus = 'active' | 'scheduled' | 'completed' | 'paused' | 'unknown'
type ClientStatusFilter = 'all' | ClientStatus

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
  nextSessionTime: number
  lastSessionTime: number
}

type SummaryCardItem = {
  title: string
  value: string
  description: string
}

type NoticeState = {
  title: string
  description: string
  tone: 'warning' | 'success' | 'default'
} | null

const statusConfig: Record<ClientStatus, { label: string; className: string; dotClassName: string }> = {
  active: {
    label: 'Aktif',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dotClassName: 'bg-emerald-500',
  },
  scheduled: {
    label: 'Planlandı',
    className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    dotClassName: 'bg-indigo-500',
  },
  completed: {
    label: 'Tamamlandı',
    className: 'bg-slate-100 text-slate-700 ring-slate-600/20',
    dotClassName: 'bg-slate-400',
  },
  paused: {
    label: 'Beklemede',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    dotClassName: 'bg-amber-500',
  },
  unknown: {
    label: 'Belirsiz',
    className: 'bg-slate-100 text-slate-600 ring-slate-600/20',
    dotClassName: 'bg-slate-300',
  },
}

const statusFilters: Array<{ label: string; value: ClientStatusFilter }> = [
  { label: 'Tümü', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Planlandı', value: 'scheduled' },
  { label: 'Tamamlandı', value: 'completed' },
  { label: 'Beklemede', value: 'paused' },
]

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
      'Bu ekran /api/expert/clients endpointinden conversations, client_applications ve session_bookings verilerini okuyacak şekilde hazırlandı.',
    items: [
      'conversations üzerinden danışan ilişkisi',
      'session_bookings üzerinden son ve gelecek seans',
      'client_applications üzerinden danışan bilgileri',
    ],
  },
]

function normalizeStatus(status: string | null | undefined): ClientStatus {
  const normalized = status?.trim().toLowerCase()

  if (normalized === 'completed' || normalized === 'closed' || normalized === 'finished') {
    return 'completed'
  }

  if (normalized === 'scheduled' || normalized === 'matched' || normalized === 'pending') {
    return 'scheduled'
  }

  if (
    normalized === 'paused' ||
    normalized === 'passive' ||
    normalized === 'cancelled' ||
    normalized === 'canceled'
  ) {
    return 'paused'
  }

  if (normalized === 'active' || normalized === 'open' || normalized === 'paid') {
    return 'active'
  }

  if (normalized === 'unknown') return 'unknown'

  return 'active'
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function getTime(value: string | null | undefined) {
  if (!value) return 0

  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function buildFallbackId(row: ApiClientRow, index: number) {
  return [
    row.id,
    row.conversationId,
    row.clientId,
    row.email,
    row.name,
    index,
  ]
    .filter(Boolean)
    .join('-')
}

function normalizeClient(row: ApiClientRow, index: number): ClientRow {
  const id =
    safeNullableText(row.id) ||
    safeNullableText(row.conversationId) ||
    safeNullableText(row.clientId) ||
    buildFallbackId(row, index) ||
    `client-${index}`

  const conversationId = safeNullableText(row.conversationId) || id
  const totalSessions = Math.max(toNumber(row.totalSessions), 0)
  const lastSessionAt = safeNullableText(row.lastSessionAt)
  const nextSessionAt = safeNullableText(row.nextSessionAt)

  return {
    id,
    name: safeNullableText(row.name) || 'Danışan',
    email: safeNullableText(row.email),
    topic: safeNullableText(row.topic),
    status: normalizeStatus(row.status),
    lastSessionAt,
    nextSessionAt,
    totalSessions,
    conversationHref:
      safeNullableText(row.conversationHref) || `/expert/chat/${encodeURIComponent(conversationId)}`,
    profileHref:
      safeNullableText(row.profileHref) ||
      `/expert/dashboard/clients?clientId=${encodeURIComponent(id)}`,
    nextSessionTime: getTime(nextSessionAt),
    lastSessionTime: getTime(lastSessionAt),
  }
}

function buildSummaryCards(clientRows: ClientRow[]): SummaryCardItem[] {
  const total = clientRows.length
  const active = clientRows.filter((client) => client.status === 'active').length
  const completed = clientRows.filter((client) => client.status === 'completed').length
  const scheduled = clientRows.filter((client) => client.status === 'scheduled').length

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

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Danışan bilgileri şu anda alınamadı. Bağlantınızı kontrol edip tekrar deneyin.'
}

function sortClients(a: ClientRow, b: ClientRow) {
  if (a.status === 'active' && b.status !== 'active') return -1
  if (a.status !== 'active' && b.status === 'active') return 1

  if (a.nextSessionTime && b.nextSessionTime) return a.nextSessionTime - b.nextSessionTime
  if (a.nextSessionTime && !b.nextSessionTime) return -1
  if (!a.nextSessionTime && b.nextSessionTime) return 1

  if (a.lastSessionTime && b.lastSessionTime) return b.lastSessionTime - a.lastSessionTime
  if (a.lastSessionTime && !b.lastSessionTime) return -1
  if (!a.lastSessionTime && b.lastSessionTime) return 1

  return a.name.localeCompare(b.name, 'tr')
}

export default function ExpertClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState<NoticeState>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>('all')

  const fetchClients = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    try {
      if (mode === 'initial') {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setNotice(null)

      const response = await fetch('/api/expert/clients', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      })

      const data = (await response.json().catch(() => ({}))) as ClientsApiResponse

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || 'Danışan bilgileri alınamadı.')
      }

      setClients((data.clients || []).map(normalizeClient).sort(sortClients))
    } catch (error) {
      setClients([])
      setNotice({
        title: 'Danışan verileri alınamadı',
        description: getSafeErrorMessage(error),
        tone: 'warning',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchClients('initial')
  }, [fetchClients])

  const filteredClients = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return clients.filter((client) => {
      const statusMatch = statusFilter === 'all' || client.status === statusFilter

      const searchableText = [
        client.name,
        client.email,
        client.topic,
        statusConfig[client.status]?.label,
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
  const activeClients = filteredClients.filter((client) => client.status !== 'completed')
  const completedClients = filteredClients.filter((client) => client.status === 'completed')
  const hasFilter = Boolean(search.trim()) || statusFilter !== 'all'

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="relative p-6 lg:p-8">
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-indigo-50 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                  Mindora Uzman Paneli
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Danışanlar
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Aktif danışanlarınızı, seans geçmişini ve danışan bazlı aksiyonları tek
                  ekrandan takip edin.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void fetchClients('refresh')}
                  disabled={loading || refreshing}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                >
                  {loading || refreshing ? 'Yükleniyor...' : 'Yenile'}
                </button>
                <Link
                  href="/expert/dashboard"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                >
                  Dashboard
                </Link>
                <Link
                  href="/expert/dashboard/sessions"
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
                >
                  Seanslara Git
                </Link>
              </div>
            </div>
          </div>
        </header>

        {notice ? (
          <NoticeCard
            title={notice.title}
            description={notice.description}
            tone={notice.tone}
            onRetry={() => void fetchClients('refresh')}
          />
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

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Filtrele ve Ara</h2>
              <p className="mt-1 text-sm text-slate-500">
                Danışan adı, e-posta, konu veya durum bilgisine göre hızlı arama yapın.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
              {hasFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Filtreleri Temizle
                </button>
              ) : null}

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Danışan ara..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 lg:w-80"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {statusFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatusFilter(item.value)}
                className={`rounded-2xl px-4 py-3 text-sm font-black ring-1 transition ${
                  statusFilter === item.value
                    ? 'bg-slate-950 text-white ring-slate-950 shadow-sm'
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            title="Aktif Danışanlar"
            description="Devam eden süreçler, son görüşmeler ve hızlı aksiyonlar."
            badge={
              loading
                ? 'Yükleniyor'
                : activeClients.length > 0
                  ? `${activeClients.length} danışan`
                  : hasFilter
                    ? 'Sonuç yok'
                    : 'Veri bekleniyor'
            }
          />

          {loading ? (
            <LoadingState />
          ) : activeClients.length > 0 ? (
            <>
              <ClientMobileList clients={activeClients} />
              <ClientTable clients={activeClients} />
            </>
          ) : (
            <EmptyClientState filtered={hasFilter} onClearFilters={() => {
              setSearch('')
              setStatusFilter('all')
            }} />
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            title="Tamamlanan Süreçler"
            description="Kapanan veya tamamlanan danışan süreçleri."
            badge={
              loading
                ? 'Yükleniyor'
                : completedClients.length > 0
                  ? `${completedClients.length} kayıt`
                  : 'Henüz yok'
            }
          />

          {loading ? (
            <LoadingState />
          ) : completedClients.length > 0 ? (
            <>
              <ClientMobileList clients={completedClients} />
              <ClientTable clients={completedClients} />
            </>
          ) : (
            <div className="px-5 py-8 text-sm leading-6 text-slate-500 sm:px-6">
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
      </section>
    </main>
  )
}

function ClientTable({ clients }: { clients: ClientRow[] }) {
  return (
    <div className="hidden overflow-x-auto md:block">
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
                  <p className="text-sm font-black text-slate-950">{safeText(client.name)}</p>
                  <p className="mt-1 text-xs text-slate-500">{safeText(client.email)}</p>
                </div>
              </td>
              <td className="max-w-xs truncate px-5 py-4 text-sm text-slate-600 sm:px-6">
                {safeText(client.topic)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-slate-700 sm:px-6">
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
                <ClientActions client={client} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClientMobileList({ clients }: { clients: ClientRow[] }) {
  return (
    <div className="divide-y divide-slate-100 md:hidden">
      {clients.map((client) => (
        <article key={client.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-black text-slate-950">{client.name}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{safeText(client.email)}</p>
            </div>
            <StatusBadge status={client.status} />
          </div>

          <div className="mt-4 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm">
            <InfoRow label="Konu" value={safeText(client.topic)} />
            <InfoRow label="Seans" value={`${client.totalSessions} görüşme`} />
            <InfoRow label="Son seans" value={formatDateTime(client.lastSessionAt)} />
            <InfoRow label="Sonraki" value={formatDateTime(client.nextSessionAt)} />
          </div>

          <div className="mt-4">
            <ClientActions client={client} fullWidth />
          </div>
        </article>
      ))}
    </div>
  )
}

function ClientActions({ client, fullWidth = false }: { client: ClientRow; fullWidth?: boolean }) {
  return (
    <div className={`flex gap-2 ${fullWidth ? 'flex-col' : 'justify-end'}`}>
      <Link
        href={client.conversationHref}
        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
      >
        Chat
      </Link>
      <Link
        href={client.profileHref}
        className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-3 py-2 text-xs font-black text-white transition hover:bg-indigo-700"
      >
        Detay
      </Link>
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
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
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
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  )
}

function EmptyClientState({
  filtered,
  onClearFilters,
}: {
  filtered: boolean
  onClearFilters: () => void
}) {
  return (
    <div className="px-5 py-12 text-center sm:px-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
        👥
      </div>
      <h3 className="mt-5 text-base font-black text-slate-950">
        {filtered ? 'Aramanıza uygun danışan bulunamadı' : 'Henüz danışan bulunmuyor'}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {filtered
          ? 'Filtreleri temizleyerek tüm danışan kayıtlarını tekrar görüntüleyebilirsiniz.'
          : 'Admin tarafından bir danışan size eşleştirildiğinde burada aktif danışan bilgileri, son seans tarihi ve chat bağlantısı görünecek.'}
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {filtered ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
          >
            Filtreleri Temizle
          </button>
        ) : (
          <Link
            href="/expert/dashboard/sessions"
            className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
          >
            Seansları Gör
          </Link>
        )}
        <Link
          href="/expert/dashboard"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
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
      <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
      <p className="mt-4 text-sm font-black text-slate-700">Danışanlar yükleniyor...</p>
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
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-100 hover:shadow-md">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
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
  const config = statusConfig[status] || statusConfig.unknown

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${config.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClassName}`} />
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
      className={`whitespace-nowrap px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500 sm:px-6 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right font-semibold text-slate-700">{value}</span>
    </div>
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
