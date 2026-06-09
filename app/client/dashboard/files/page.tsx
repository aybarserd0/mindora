'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type FileOwner = 'client' | 'expert' | 'admin' | 'system' | string
type FileType = 'image' | 'pdf' | 'document' | 'other'
type FileFilter = 'all' | FileType

type ApiClientFile = {
  id: string
  conversationId?: string | null
  messageId?: string | null
  name?: string | null
  fileName?: string | null
  originalName?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  url?: string | null
  downloadUrl?: string | null
  previewUrl?: string | null
  ownerType?: FileOwner | null
  senderType?: FileOwner | null
  senderName?: string | null
  createdAt?: string | null
}

type ClientFilesResponse = {
  ok?: boolean
  files?: ApiClientFile[]
  attachments?: ApiClientFile[]
  summary?: Partial<FileSummary>
  error?: string
}

type UiFile = {
  id: string
  conversationId: string | null
  messageId: string | null
  name: string
  mimeType: string
  sizeBytes: number
  type: FileType
  downloadUrl: string
  previewUrl: string | null
  ownerType: FileOwner
  senderName: string
  createdAt: string | null
  createdTime: number
}

type FileSummary = {
  total: number
  images: number
  pdfs: number
  documents: number
  others: number
}

const EMPTY_SUMMARY: FileSummary = {
  total: 0,
  images: 0,
  pdfs: 0,
  documents: 0,
  others: 0,
}

const filters: Array<{ label: string; value: FileFilter }> = [
  { label: 'Tümü', value: 'all' },
  { label: 'Görseller', value: 'image' },
  { label: 'PDF', value: 'pdf' },
  { label: 'Belgeler', value: 'document' },
  { label: 'Diğer', value: 'other' },
]

function safeText(value: string | null | undefined, fallback = '-') {
  const clean = value?.trim()
  return clean || fallback
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

function formatFileSize(bytes: number | null | undefined) {
  const value = Number(bytes || 0)

  if (!Number.isFinite(value) || value <= 0) return 'Boyut bekleniyor'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
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

function inferFileType(mimeType: string | null | undefined, fileName: string): FileType {
  const mime = String(mimeType || '').toLowerCase()
  const name = fileName.toLowerCase()

  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(name)) {
    return 'image'
  }

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf'
  }

  if (
    mime.includes('word') ||
    mime.includes('document') ||
    /\.(doc|docx|txt|rtf)$/i.test(name)
  ) {
    return 'document'
  }

  return 'other'
}

function fileTypeLabel(type: FileType) {
  if (type === 'image') return 'Görsel'
  if (type === 'pdf') return 'PDF'
  if (type === 'document') return 'Belge'
  return 'Diğer'
}

function ownerLabel(owner: FileOwner) {
  const normalized = String(owner || '').trim().toLowerCase()

  if (normalized === 'client') return 'Siz'
  if (normalized === 'expert') return 'Uzman'
  if (normalized === 'admin') return 'Mindora'
  if (normalized === 'system') return 'Sistem'

  return 'Belirlenmedi'
}

function fallbackId(file: ApiClientFile, index: number) {
  return [
    file.id,
    file.messageId,
    file.conversationId,
    file.fileName,
    file.originalName,
    file.createdAt,
    index,
  ]
    .filter(Boolean)
    .join('-')
}

function toUiFile(file: ApiClientFile, index: number, token: string): UiFile {
  const name =
    safeText(file.originalName, '') ||
    safeText(file.fileName, '') ||
    safeText(file.name, '') ||
    `Dosya ${index + 1}`

  const mimeType = file.mimeType || 'application/octet-stream'
  const type = inferFileType(mimeType, name)
  const rawDownloadUrl = file.downloadUrl || file.url || file.previewUrl || '#'
  const rawPreviewUrl = file.previewUrl || file.url || null

  return {
    id: String(file.id || fallbackId(file, index) || `file-${index}`),
    conversationId: file.conversationId || null,
    messageId: file.messageId || null,
    name,
    mimeType,
    sizeBytes: toNumber(file.sizeBytes),
    type,
    downloadUrl: buildTokenUrl(rawDownloadUrl, token),
    previewUrl: rawPreviewUrl ? buildTokenUrl(rawPreviewUrl, token) : null,
    ownerType: file.ownerType || file.senderType || 'system',
    senderName: safeText(file.senderName, ownerLabel(file.ownerType || file.senderType || 'system')),
    createdAt: file.createdAt || null,
    createdTime: getTime(file.createdAt),
  }
}

function buildFallbackSummary(files: UiFile[]): FileSummary {
  return {
    total: files.length,
    images: files.filter((file) => file.type === 'image').length,
    pdfs: files.filter((file) => file.type === 'pdf').length,
    documents: files.filter((file) => file.type === 'document').length,
    others: files.filter((file) => file.type === 'other').length,
  }
}

function mergeSummary(apiSummary: Partial<FileSummary> | undefined, fallback: FileSummary): FileSummary {
  if (!apiSummary) return fallback

  return {
    total: toNumber(apiSummary.total ?? fallback.total),
    images: toNumber(apiSummary.images ?? fallback.images),
    pdfs: toNumber(apiSummary.pdfs ?? fallback.pdfs),
    documents: toNumber(apiSummary.documents ?? fallback.documents),
    others: toNumber(apiSummary.others ?? fallback.others),
  }
}

function ClientFilesContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [files, setFiles] = useState<UiFile[]>([])
  const [summary, setSummary] = useState<FileSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [softNotice, setSoftNotice] = useState('')
  const [filter, setFilter] = useState<FileFilter>('all')
  const [search, setSearch] = useState('')

  const fetchFiles = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      if (!token) {
        setSoftNotice('Güvenli erişim bağlantısı bulunamadı. Size iletilen danışan paneli bağlantısını kullanabilirsiniz.')
        setFiles([])
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

        const response = await fetch(`/api/client/files?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        })

        const data = (await response.json().catch(() => ({}))) as ClientFilesResponse

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || 'Henüz paylaşılmış dosya bulunmuyor.')
        }

        const normalized = (data.files || data.attachments || []).map((file, index) =>
          toUiFile(file, index, token)
        )

        const fallback = buildFallbackSummary(normalized)

        setFiles(normalized)
        setSummary(mergeSummary(data.summary, fallback))
      } catch (err) {
        setFiles([])
        setSummary(EMPTY_SUMMARY)
        setSoftNotice(
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Henüz paylaşılmış dosya bulunmuyor.'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token]
  )

  useEffect(() => {
    void fetchFiles('initial')
  }, [fetchFiles])

  const filteredFiles = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return files
      .filter((file) => filter === 'all' || file.type === filter)
      .filter((file) => {
        const text = [
          file.id,
          file.name,
          file.mimeType,
          file.type,
          fileTypeLabel(file.type),
          file.senderName,
          ownerLabel(file.ownerType),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return !keyword || text.includes(keyword)
      })
      .sort((a, b) => b.createdTime - a.createdTime)
  }, [files, filter, search])

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
                Dosyalarım
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Görüşmelerinizde paylaşılan görsel, PDF ve belge dosyalarını güvenli
                şekilde görüntüleyin ve indirin.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchFiles('refresh')}
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
            title="Henüz paylaşılmış dosya bulunmuyor"
            description="Uzmanınızla belge, rapor, görsel veya doküman paylaştığınızda dosyalarınız burada güvenli şekilde görüntülenecektir."
            detail={softNotice}
            onRetry={() => void fetchFiles('refresh')}
          />
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="Toplam" value={String(summary.total)} description="Tüm dosyalar" />
          <SummaryCard title="Görsel" value={String(summary.images)} description="Resim dosyaları" />
          <SummaryCard title="PDF" value={String(summary.pdfs)} description="PDF belgeleri" />
          <SummaryCard title="Belge" value={String(summary.documents)} description="DOC/DOCX/TXT" />
          <SummaryCard title="Diğer" value={String(summary.others)} description="Diğer formatlar" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <InfoBlock
            title="Güvenli dosya erişimi"
            description="Dosya bağlantıları güvenli token ile açılır. Linkler görüşme erişiminize göre doğrulanır."
          />
          <InfoBlock
            title="Desteklenen formatlar"
            description="Görsel, PDF, DOC, DOCX ve benzeri danışan-uzman paylaşım dosyaları listelenir."
          />
          <InfoBlock
            title="Gizlilik notu"
            description="Paylaşılan dosyalar hassas olabilir. Dosyaları yalnızca güvenli cihazlarda açmanız önerilir."
          />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Filtrele ve Ara</h2>
              <p className="mt-1 text-sm text-slate-500">
                Dosya adı, tür, gönderen veya MIME tipine göre arama yapın.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Dosya ara..."
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
              <h2 className="text-xl font-black text-slate-950">Dosya Listesi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Paylaşılan tüm dosyalar ve indirme bağlantıları.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {loading ? 'Yükleniyor' : `${filteredFiles.length} kayıt`}
            </span>
          </div>

          {loading ? (
            <EmptyState title="Dosyalar yükleniyor" description="Paylaşılan dosyalar hazırlanıyor." />
          ) : filteredFiles.length > 0 ? (
            <FilesTable files={filteredFiles} />
          ) : (
            <EmptyState
              title="Dosya bulunamadı"
              description="Uzmanınızla belge, rapor veya doküman paylaştığınızda burada güvenli şekilde listelenecektir."
            />
          )}
        </section>
      </div>
    </section>
  )
}

function FilesTable({ files }: { files: UiFile[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-5 py-4 font-black">Dosya</th>
            <th className="px-5 py-4 font-black">Tür</th>
            <th className="px-5 py-4 font-black">Boyut</th>
            <th className="px-5 py-4 font-black">Gönderen</th>
            <th className="px-5 py-4 font-black">Tarih</th>
            <th className="px-5 py-4 text-right font-black">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {files.map((file) => (
            <tr key={file.id} className="align-top transition hover:bg-slate-50">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <FileIcon type={file.type} />
                  <div>
                    <p className="max-w-xs truncate font-black text-slate-950">{file.name}</p>
                    <p className="mt-1 max-w-xs truncate text-xs text-slate-500">{file.mimeType}</p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <FileTypeBadge type={file.type} />
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-700">
                {formatFileSize(file.sizeBytes)}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <p className="font-bold text-slate-700">{file.senderName}</p>
                <p className="mt-1 text-xs text-slate-500">{ownerLabel(file.ownerType)}</p>
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                {formatDateTime(file.createdAt)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-right">
                <div className="flex justify-end gap-2">
                  {file.previewUrl ? (
                    <a
                      href={file.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
                    >
                      Aç
                    </a>
                  ) : null}
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl bg-indigo-600 px-3 py-2 text-xs font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
                  >
                    İndir
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FileIcon({ type }: { type: FileType }) {
  const icon = type === 'image' ? '🖼️' : type === 'pdf' ? '📄' : type === 'document' ? '📝' : '📎'

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl ring-1 ring-indigo-100">
      {icon}
    </div>
  )
}

function FileTypeBadge({ type }: { type: FileType }) {
  const className =
    type === 'image'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : type === 'pdf'
        ? 'bg-rose-50 text-rose-700 ring-rose-100'
        : type === 'document'
          ? 'bg-blue-50 text-blue-700 ring-blue-100'
          : 'bg-slate-100 text-slate-600 ring-slate-200'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>
      {fileTypeLabel(type)}
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

export default function ClientDashboardFilesPage() {
  return (
    <Suspense
      fallback={
        <section className="px-4 py-6 text-slate-950 md:px-6 md:py-10">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Dosyalar yükleniyor...</p>
          </div>
        </section>
      }
    >
      <ClientFilesContent />
    </Suspense>
  )
}
