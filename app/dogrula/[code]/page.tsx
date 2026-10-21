import type { Metadata } from 'next'
import Header from '@/components/Header'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Süpervizyon kaydı doğrulama',
  robots: { index: false, follow: false },
}

type Entry = {
  session_date: string
  duration_minutes: number
  status: string
  experts: { name: string | null } | null
  supervisor_profiles: { experts: { name: string | null } | null } | null
}

async function findEntry(code: string): Promise<Entry | null> {
  if (!/^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(code)) return null
  try {
    // Tablo henüz üretilmiş tiplerde yok
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any
    const { data } = await supabase
      .from('supervision_log_entries')
      .select(
        'session_date, duration_minutes, status, experts!supervision_log_entries_supervisee_expert_id_fkey(name), supervisor_profiles!inner(experts!inner(name))'
      )
      .eq('verification_code', code)
      .maybeSingle()
    return (data as Entry) || null
  } catch {
    return null
  }
}

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params
  const code = decodeURIComponent(raw).toUpperCase()
  const entry = await findEntry(code)
  const valid = entry && entry.status === 'confirmed'

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto max-w-xl px-5 py-16">
        <p className="text-sm text-slate-500">Doğrulama kodu</p>
        <p className="font-display text-2xl font-semibold tabular-nums text-slate-900">{code}</p>

        {valid ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-white p-6">
            <p className="font-display text-xl font-semibold text-emerald-800">Bu kayıt geçerli</p>
            <dl className="mt-5 space-y-3 text-[0.95rem]">
              <div className="flex justify-between gap-6">
                <dt className="text-slate-500">Süpervizyon alan</dt>
                <dd className="font-medium text-slate-900">{entry.experts?.name || '-'}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-slate-500">Süpervizör</dt>
                <dd className="font-medium text-slate-900">{entry.supervisor_profiles?.experts?.name || '-'}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-slate-500">Tarih</dt>
                <dd className="font-medium text-slate-900">
                  {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeZone: 'Europe/Istanbul' }).format(new Date(entry.session_date))}
                </dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-slate-500">Süre</dt>
                <dd className="font-medium text-slate-900">{entry.duration_minutes} dakika</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-white p-6">
            <p className="font-display text-xl font-semibold text-rose-800">Bu kodla onaylı bir kayıt bulunamadı</p>
            <p className="mt-2 leading-7 text-slate-600">Kodu kontrol et. Kayıt henüz süpervizör tarafından onaylanmamış da olabilir.</p>
          </div>
        )}

        <p className="mt-8 text-sm leading-6 text-slate-500">
          Bu sayfa yalnızca seansın Mindora üzerinden yapıldığını ve süpervizör tarafından onaylandığını doğrular.
          Sertifika ya da yeterlilik belgesi değildir. Vaka içeriği hiçbir zaman gösterilmez.
        </p>
      </div>
    </main>
  )
}
