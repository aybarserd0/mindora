'use client'

import Header from '@/components/Header'
import { FormEvent, useMemo, useState } from 'react'

type SubmitState =
  | { type: 'idle'; message: '' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }

const AREA_OPTIONS = [
  'Kaygı / stres',
  'İlişki / aile',
  'Depresif hisler',
  'Özgüven',
  'Motivasyon',
  'Tükenmişlik',
  'Sınav ve gelecek kaygısı',
  'Diğer',
]

const AVAILABILITY_OPTIONS = [
  'Hafta içi gündüz',
  'Hafta içi akşam',
  'Hafta sonu',
  'Esnek / değişken',
]

const TRUST_ITEMS = [
  {
    title: 'Ücretsiz başvuru',
    text: 'Mindora uzman ağına başvuru yapmak ücretsizdir.',
  },
  {
    title: 'Alanına uygun danışan',
    text: 'Yönlendirmeler uzmanlık alanı, uygunluk ve danışan ihtiyacına göre değerlendirilir.',
  },
  {
    title: 'Online çalışma akışı',
    text: 'Randevu, ödeme, chat ve video görüşme süreçleri platform üzerinden ilerler.',
  },
]

const PROCESS_STEPS = [
  {
    title: 'Başvurunu gönder',
    text: 'İletişim, uzmanlık, ücret ve müsaitlik bilgilerini paylaş.',
  },
  {
    title: 'Profil değerlendirmesi',
    text: 'Başvurun Mindora ekibi tarafından uygunluk açısından incelenir.',
  },
  {
    title: 'Uzman ağına dahil ol',
    text: 'Onaylanan uzman profilleri listelenir ve uygun danışanlarla eşleştirilir.',
  },
]

function getFormValue(form: FormData, key: string) {
  const value = form.get(key)

  if (typeof value !== 'string') return ''

  return value.trim()
}

function getFormList(form: FormData, key: string) {
  return form
    .getAll(key)
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
}

export default function UzmanBasvuruPage() {
  const [loading, setLoading] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>({
    type: 'idle',
    message: '',
  })

  const isSuccess = submitState.type === 'success'
  const isError = submitState.type === 'error'

  const helperText = useMemo(() => {
    if (loading) return 'Başvurun güvenli şekilde gönderiliyor...'
    if (isSuccess) return 'Başvurun alındı. Mindora ekibi değerlendirme için seninle iletişime geçecek.'
    if (isError) return 'Gönderim sırasında sorun oluştu. Bilgilerini kontrol edip tekrar deneyebilirsin.'

    return 'Bilgilerin yalnızca uzman başvurusu değerlendirme süreci için kullanılır.'
  }, [isError, isSuccess, loading])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const areas = getFormList(form, 'areas')
    const availability = getFormList(form, 'availability')

    setSubmitState({ type: 'idle', message: '' })

    if (areas.length === 0) {
      setSubmitState({
        type: 'error',
        message: 'Lütfen en az bir uzmanlık alanı seç.',
      })
      return
    }

    if (availability.length === 0) {
      setSubmitState({
        type: 'error',
        message: 'Lütfen en az bir genel müsaitlik seçeneği seç.',
      })
      return
    }

    const payload = {
      name: getFormValue(form, 'name'),
      phone: getFormValue(form, 'phone'),
      email: getFormValue(form, 'email'),
      photo_url: getFormValue(form, 'photo_url'),
      title: getFormValue(form, 'title'),
      areas,
      experience: getFormValue(form, 'experience'),
      online: getFormValue(form, 'online'),
      price: getFormValue(form, 'price'),
      availability,
      expectation: getFormValue(form, 'expectation'),
      note: getFormValue(form, 'note'),
    }

    try {
      setLoading(true)

      const res = await fetch('/api/uzman-basvuru', {
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
        message: 'Başvurun alındı. En kısa sürede değerlendirme için seninle iletişime geçilecek.',
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="inline-flex rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            Uzman başvuruları açık
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            Mindora uzman ağına katıl.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-500">
            Uzmanlık alanına uygun danışanlarla çalışmak, online yönlendirme almak
            ve Mindora ekosisteminde yer almak için başvurunu iletebilirsin.
          </p>

          <div className="mt-8 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-2">
            {TRUST_ITEMS.map((item, index) => (
              <div
                key={item.title}
                style={{ animationDelay: `${index * 80}ms` }}
                className="animate-fade-in-up rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 ease-out hover:border-slate-300"
              >
                <p>{item.title}</p>
                <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl bg-pine-800 p-6 text-white">
            <p className="text-sm font-semibold text-slate-400">
              Başvuru süreci
            </p>

            <div className="mt-5 space-y-4">
              {PROCESS_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  style={{ animationDelay: `${index * 100}ms` }}
                  className="animate-fade-in-up flex gap-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-900">
                    {index + 1}
                  </div>

                  <div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-4 text-xs leading-6 text-slate-500">
            Başvuru yapmak Mindora uzman ağına otomatik kabul anlamına gelmez.
            Başvurular profil uygunluğu, uzmanlık alanı ve platform ihtiyacına göre
            değerlendirilir.
          </div>
        </aside>

        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
          <div className="border-b border-slate-200/80 pb-6">
            <p className="text-sm font-semibold text-slate-400">
              Uzman başvuru formu
            </p>

            <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              Başvuru bilgileri
            </h2>

            <p className="mt-3 leading-7 text-slate-500">{helperText}</p>

            {submitState.message ? (
              <div
                className={`mt-5 rounded-lg border p-4 text-sm font-medium leading-6 ${
                  submitState.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
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
                <span className="mb-2 block text-sm font-semibold text-slate-700">Ad Soyad</span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Adın ve soyadın"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Telefon numarası</span>
                <input
                  name="phone"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="05xx xxx xx xx"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">E-posta adresi</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ornek@mail.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Profil fotoğrafı linki <span className="font-medium text-slate-400">(opsiyonel)</span>
                </span>
                <input
                  name="photo_url"
                  type="url"
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Ünvan</span>
              <input
                name="title"
                required
                placeholder="Örn: Klinik Psikolog, Psikolog, Psikolojik Danışman"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
              />
            </label>

            <fieldset>
              <legend className="mb-3 block text-sm font-semibold text-slate-700">Uzmanlık alanların</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {AREA_OPTIONS.map((item) => (
                  <label
                    key={item}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-white"
                  >
                    <input name="areas" type="checkbox" value={item} className="h-4 w-4 accent-pine-700" />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Deneyim yılın</span>
                <select
                  name="experience"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                >
                  <option value="">Seç</option>
                  <option>0–2 yıl</option>
                  <option>2–5 yıl</option>
                  <option>5+ yıl</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Online görüşme yapıyor musun?</span>
                <select
                  name="online"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                >
                  <option value="">Seç</option>
                  <option>Evet</option>
                  <option>Hayır</option>
                  <option>Planlıyorum</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Seans ücretin</span>
                <input
                  name="price"
                  required
                  inputMode="numeric"
                  placeholder="Örn: 700 TL"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
                />
              </label>
            </div>

            <fieldset>
              <legend className="mb-3 block text-sm font-semibold text-slate-700">Genel müsaitlik</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {AVAILABILITY_OPTIONS.map((item) => (
                  <label
                    key={item}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-white"
                  >
                    <input name="availability" type="checkbox" value={item} className="h-4 w-4 accent-pine-700" />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Mindora’dan beklentin nedir?</span>
              <textarea
                name="expectation"
                rows={4}
                required
                maxLength={1000}
                placeholder="Mindora’dan nasıl bir yönlendirme veya iş birliği bekliyorsun?"
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Eklemek istediğin bir şey var mı?</span>
              <textarea
                name="note"
                rows={4}
                maxLength={1000}
                placeholder="Varsa ek notunu yazabilirsin."
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:border-slate-400 focus:bg-white"
              />
            </label>

            <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-4 text-xs leading-6 text-slate-500">
              Formu göndererek bilgilerinin uzman başvurusu değerlendirme amacıyla
              incelenmesini kabul etmiş olursun. Başvuru, platforma otomatik kabul
              anlamına gelmez.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-pine-800 px-6 py-4 text-base font-semibold text-white transition-all duration-200 ease-out hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Başvuru gönderiliyor...' : 'Uzman başvurusunu gönder'}
            </button>
          </form>
        </section>
      </section>
    </main>
  )
}
