import Link from 'next/link'

const weekDays = [
  { id: 1, day: 'Pazartesi', status: 'Hazır değil', window: 'Tanımlanmadı', slots: '0 slot' },
  { id: 2, day: 'Salı', status: 'Hazır değil', window: 'Tanımlanmadı', slots: '0 slot' },
  { id: 3, day: 'Çarşamba', status: 'Hazır değil', window: 'Tanımlanmadı', slots: '0 slot' },
  { id: 4, day: 'Perşembe', status: 'Hazır değil', window: 'Tanımlanmadı', slots: '0 slot' },
  { id: 5, day: 'Cuma', status: 'Hazır değil', window: 'Tanımlanmadı', slots: '0 slot' },
  { id: 6, day: 'Cumartesi', status: 'Opsiyonel', window: 'Tanımlanmadı', slots: '0 slot' },
  { id: 0, day: 'Pazar', status: 'Opsiyonel', window: 'Tanımlanmadı', slots: '0 slot' },
]

const setupSteps = [
  {
    title: 'Uygun günleri belirle',
    description: 'Haftanın hangi günlerinde danışan kabul edileceğini netleştir.',
  },
  {
    title: 'Saat aralıklarını tanımla',
    description: 'Başlangıç, bitiş, seans süresi ve ara süresini standartlaştır.',
  },
  {
    title: 'Slotları kontrol et',
    description: 'Çakışan saatleri engelle ve danışana gösterilecek uygun saatleri doğrula.',
  },
  {
    title: 'Randevu akışına bağla',
    description: 'Danışanların ödeme sonrası uygun seans seçmesini aktif hale getir.',
  },
]

const summaryCards = [
  { title: 'Aktif Gün', value: '0', description: 'Yayınlanan müsait gün' },
  { title: 'Haftalık Slot', value: '0', description: 'Danışana açık saat' },
  { title: 'Seans Süresi', value: '50 dk', description: 'Varsayılan görüşme' },
  { title: 'Ara Süresi', value: '10 dk', description: 'Seans arası tampon' },
]

export default function ExpertAvailabilityPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-indigo-600">
                Expert Workspace
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Müsaitlik Yönetimi
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Haftalık uygunluk düzeninizi yönetin. Bu alan, danışanların randevu
                seçebileceği slotların temelini oluşturur.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/expert/dashboard/sessions"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Seansları Gör
              </Link>
              <Link
                href="/expert/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Dashboard'a Dön
              </Link>
            </div>
          </div>
        </div>

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

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Haftalık Müsaitlik
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Gün bazlı uygunluk durumu ve yayınlanacak seans aralıkları.
                </p>
              </div>

              <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                Slot yönetimi hazırlanıyor
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Gün</th>
                      <th className="px-5 py-4 font-semibold">Durum</th>
                      <th className="px-5 py-4 font-semibold">Saat Aralığı</th>
                      <th className="px-5 py-4 font-semibold">Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {weekDays.map((item) => (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4 font-semibold text-slate-950">
                          {item.day}
                        </td>
                        <td className="px-5 py-4">
                          <AvailabilityBadge status={item.status} />
                        </td>
                        <td className="px-5 py-4 text-slate-600">{item.window}</td>
                        <td className="px-5 py-4 text-slate-600">{item.slots}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                Henüz aktif müsaitlik tanımlanmadı
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Slot ekleme formu aktif olduğunda bu alandan gün, saat aralığı,
                seans süresi ve ara süresi yönetilecek. Şu an sayfa güvenli şekilde
                hazır durum ekranı gösteriyor.
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Kurulum Akışı</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Randevu sisteminin sağlıklı çalışması için izlenecek net akış.
              </p>

              <div className="mt-5 space-y-3">
                {setupSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {step.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-emerald-950">
                Sistem Durumu
              </h2>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Bu sayfa artık 404 vermez ve dashboard akışı içinde güvenli şekilde
                çalışır. Canlı slot yönetimi bağlandığında aynı arayüz genişletilecek.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Hızlı Bağlantılar</h2>
              <div className="mt-4 space-y-3">
                <QuickLink href="/expert/dashboard" label="Dashboard" />
                <QuickLink href="/expert/dashboard/sessions" label="Seanslar" />
                <QuickLink href="/expert/dashboard/clients" label="Danışanlar" />
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
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

function AvailabilityBadge({ status }: { status: string }) {
  const isOptional = status === 'Opsiyonel'

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        isOptional
          ? 'bg-slate-100 text-slate-700 ring-slate-200'
          : 'bg-amber-50 text-amber-700 ring-amber-100'
      }`}
    >
      {status}
    </span>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
    >
      <span>{label}</span>
      <span aria-hidden="true">→</span>
    </Link>
  )
}
