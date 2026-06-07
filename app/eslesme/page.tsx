'use client'

import { FormEvent, useMemo, useState } from 'react'

type SubmitState =
  | { type: 'idle'; message: '' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }

const AVAILABILITY_OPTIONS = [
  'Hafta içi gündüz',
  'Hafta içi akşam',
  'Hafta sonu',
  'Esnek / fark etmez',
]

const TRUST_ITEMS = [
  {
    title: 'Ücretsiz ön eşleşme',
    text: 'Formu doldurmak seans satın alma zorunluluğu oluşturmaz.',
  },
  {
    title: 'Gizlilik odaklı süreç',
    text: 'Bilgilerin yalnızca uygun yönlendirme için değerlendirilir.',
  },
  {
    title: 'Online destek akışı',
    text: 'Randevu, ödeme, chat ve video görüşme süreci tek platformda ilerler.',
  },
]

const PROCESS_STEPS = [
  {
    title: 'Formu doldur',
    text: 'İhtiyacını, uygun zamanını ve uzman tercihini paylaş.',
  },
  {
    title: 'Ön değerlendirme',
    text: 'Yanıtların uygun uzman ve destek konusu açısından incelenir.',
  },
  {
    title: 'Başlangıç planı',
    text: 'Uygun uzmanla online destek sürecine başlaman için yönlendirilirsin.',
  },
]

function getFormValue(form: FormData, key: string) {
  const value = form.get(key)

  if (typeof value !== 'string') return ''

  return value.trim()
}

export default function EslesmePage() {
  const [loading, setLoading] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>({
    type: 'idle',
    message: '',
  })

  const isSuccess = submitState.type === 'success'
  const isError = submitState.type === 'error'

  const helperText = useMemo(() => {
    if (loading) return 'Başvurun güvenli şekilde gönderiliyor...'
    if (isSuccess) return 'Başvurun alındı. Ekibimiz seni yönlendirme için değerlendirecek.'
    if (isError) return 'Gönderim sırasında sorun oluştu. Bilgilerini kontrol edip tekrar deneyebilirsin.'

    return 'Bu bilgiler yalnızca uygun psikolojik destek sürecini planlamak için kullanılır.'
  }, [isError, isSuccess, loading])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const availability = form
      .getAll('availability')
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)

    setSubmitState({ type: 'idle', message: '' })

    if (availability.length === 0) {
      setSubmitState({
        type: 'error',
        message: 'Lütfen görüşme için uygun olduğun en az bir zaman aralığını seç.',
      })
      return
    }

    const payload = {
      name: getFormValue(form, 'name'),
      phone: getFormValue(form, 'phone'),
      email: getFormValue(form, 'email'),
      age: getFormValue(form, 'age'),
      topic: getFormValue(form, 'topic'),
      duration: getFormValue(form, 'duration'),
      previousSupport: getFormValue(form, 'previousSupport'),
      startTime: getFormValue(form, 'startTime'),
      preference: getFormValue(form, 'preference'),
      availability,
      note: getFormValue(form, 'note'),
    }

    try {
      setLoading(true)

      const res = await fetch('/api/eslesme', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = (await res.json().catch(() => null)) as {
        ok?: boolean
        error?: string
      } | null

      if (!res.ok || !result?.ok) {
        throw new Error(result?.error || 'Başvuru gönderilemedi. Lütfen tekrar dene.')
      }

      setSubmitState({
        type: 'success',
        message: 'Başvurun alındı. En kısa sürede sana uygun yönlendirme için dönüş yapılacak.',
      })

      formElement.reset()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmitState({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Başvuru gönderilemedi. Lütfen internet bağlantını kontrol edip tekrar dene.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f2eb] text-[#171717]">
      <nav className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f2eb]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Mindora"
              className="h-10 w-10 rounded-2xl object-cover"
            />
            <div>
              <p className="text-lg font-black leading-none">Mindora</p>
              <p className="hidden text-xs text-neutral-500 sm:block">
                Online psikolojik destek
              </p>
            </div>
          </a>

          <div className="flex items-center gap-2">
            <a
              href="/uzmanlar"
              className="hidden rounded-full border border-black/10 bg-white/70 px-5 py-2.5 text-sm font-black text-black transition hover:bg-white sm:inline-block"
            >
              Uzmanlar
            </a>

            <a
              href="/uzman-basvuru"
              className="rounded-full bg-black px-5 py-2.5 text-sm font-black text-white transition hover:bg-neutral-800"
            >
              Uzman mısın?
            </a>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="inline-flex rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-black text-neutral-700 shadow-sm">
            Ücretsiz ön eşleşme
          </div>

          <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Sana uygun psikolojik desteği birlikte planlayalım.
          </h1>

          <p className="mt-6 text-lg leading-8 text-neutral-700">
            Kısa bilgilerini paylaş. Mindora, ihtiyacını ve beklentini
            değerlendirerek sana daha uygun bir başlangıç yolu sunmayı hedefler.
          </p>

          <div className="mt-8 grid gap-3 text-sm font-black text-neutral-700 sm:grid-cols-2">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-white/75 p-4 shadow-sm ring-1 ring-black/5"
              >
                <p>{item.title}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-neutral-500">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] bg-black p-6 text-white">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-neutral-400">
              Süreç
            </p>

            <div className="mt-5 space-y-4">
              {PROCESS_STEPS.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
                    {index + 1}
                  </div>

                  <div>
                    <p className="font-black">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-neutral-300">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 rounded-2xl bg-white/70 p-4 text-xs leading-6 text-neutral-500 ring-1 ring-black/5">
            Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar
            verme riski varsa lütfen en yakın sağlık kuruluşuna başvur ya da 112
            ile iletişime geç.
          </p>
        </aside>

        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <div className="border-b border-black/10 pb-6">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-neutral-500">
              Eşleşme formu
            </p>

            <h2 className="mt-3 text-3xl font-black md:text-4xl">
              Başlangıç bilgileri
            </h2>

            <p className="mt-3 leading-7 text-neutral-600">{helperText}</p>

            {submitState.message ? (
              <div
                className={`mt-5 rounded-2xl p-4 text-sm font-bold leading-6 ${
                  submitState.type === 'success'
                    ? 'bg-green-50 text-green-800 ring-1 ring-green-200'
                    : 'bg-red-50 text-red-800 ring-1 ring-red-200'
                }`}
                role="status"
              >
                {submitState.message}
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black">Ad Soyad</span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Adın ve soyadın"
                  className="w-full rounded-2xl border border-black/10 bg-[#f7f2eb] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black">
                  Telefon numarası
                </span>
                <input
                  name="phone"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="05xx xxx xx xx"
                  className="w-full rounded-2xl border border-black/10 bg-[#f7f2eb] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black">
                  E-posta adresi
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ornek@mail.com"
                  className="w-full rounded-2xl border border-black/10 bg-[#f7f2eb] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black">
                  Yaş aralığın nedir?
                </span>
                <select
                  name="age"
                  required
                  className="w-full rounded-2xl border border-black/10 bg-[#f7f2eb] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
                >
                  <option value="">Seç</option>
                  <option>18–25</option>
                  <option>25–35</option>
                  <option>35–45</option>
                  <option>45+</option>
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black">
                  Seni en çok zorlayan konu nedir?
                </span>
                <select
                  name="topic"
                  required
                  className="w-full rounded-2xl border border-black/10 bg-[#f7f2eb] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
                >
                  <option value="">Seç</option>
                  <option>Kaygı / stres</option>
                  <option>İlişki / aile</option>
                  <option>Özgüven</option>
                  <option>Motivasyon</option>
                  <option>Depresif hisler</option>
                  <option>Tükenmişlik</option>
                  <option>Diğer</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black">
                  Bu durum ne zamandır devam ediyor?
                </span>
                <select
                  name="duration"
                  required
                  className="w-full rounded-2xl border border-black/10 bg-[#f7f2eb] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
                >
                  <option value="">Seç</option>
                  <option>Birkaç hafta</option>
                  <option>Birkaç ay</option>
                  <option>Uzun süredir</option>
                  <option>Net bilmiyorum</option>
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-black">
                  Daha önce destek aldın mı?
                </span>
                <select
                  name="previousSupport"
                  required
                  className="w-full rounded-2xl border border-black/10 bg-[#f7f2eb] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
                >
                  <option value="">Seç</option>
                  <option>Evet</option>
                  <option>Hayır</option>
                  <option>Devam ediyorum</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black">
                  Ne zaman başlamak istersin?
                </span>
                <select
                  name="startTime"
                  required
                  className="w-full rounded-2xl border border-black/10 bg-[#f7f2eb] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
                >
                  <option value="">Seç</option>
                  <option>Hemen</option>
                  <option>Bu hafta</option>
                  <option>Bu ay içinde</option>
                  <option>Daha sonra</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black">
                  Psikolog tercihin var mı?
                </span>
                <select
                  name="preference"
                  required
                  className="w-full rounded-2xl border border-black/10 bg-[#f7f2eb] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
                >
                  <option value="">Seç</option>
                  <option>Kadın psikolog</option>
                  <option>Erkek psikolog</option>
                  <option>Fark etmez</option>
                </select>
              </label>
            </div>

            <fieldset>
              <legend className="mb-3 block text-sm font-black">
                Görüşme için genelde hangi saatler sana daha uygun?
              </legend>

              <div className="grid gap-3 sm:grid-cols-2">
                {AVAILABILITY_OPTIONS.map((item) => (
                  <label
                    key={item}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl bg-[#f7f2eb] px-4 py-3 text-sm font-bold text-neutral-700 ring-1 ring-black/5 transition hover:bg-white"
                  >
                    <input
                      name="availability"
                      type="checkbox"
                      value={item}
                      className="h-4 w-4 accent-black"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-2 block text-sm font-black">
                Eklemek istediğin bir şey var mı?
              </span>
              <textarea
                name="note"
                rows={5}
                maxLength={1000}
                placeholder="İstersen destek almak istediğin konuyu birkaç cümleyle anlatabilirsin."
                className="w-full resize-none rounded-2xl border border-black/10 bg-[#f7f2eb] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
              />
            </label>

            <div className="rounded-2xl bg-[#f7f2eb] p-4 text-xs leading-6 text-neutral-500">
              Formu göndererek bilgilerinin ön eşleşme ve yönlendirme amacıyla
              değerlendirilmesini kabul etmiş olursun. Bu form tıbbi tanı veya
              acil müdahale yerine geçmez.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-black px-6 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
            >
              {loading ? 'Başvuru gönderiliyor...' : 'Ücretsiz ön eşleşme başlat'}
            </button>
          </form>
        </section>
      </section>
    </main>
  )
}
