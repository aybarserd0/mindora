'use client'

import Header from '@/components/Header'
import { FormEvent, useMemo, useState } from 'react'
import PageHero from '@/components/marketing/PageHero'
import Reveal from '@/components/marketing/Reveal'
import { FloatingNote, IconBadge, Icons, LogbookMock, SampleCaption, ThreadLine } from '@/components/marketing/Mocks'

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
    icon: Icons.people,
    tone: 'pine' as const,
    title: 'Sana uygun danışanlar',
    text: 'Danışanlar ihtiyaçlarına göre eşleştirilir; alanın dışındaki taleplerle uğraşmazsın.',
  },
  {
    icon: Icons.calendar,
    tone: 'pine' as const,
    title: 'Tek yerden çalışma akışı',
    text: 'Takvim, ödeme, mesajlaşma ve görüntülü görüşme aynı panelde. Görüşmeler kaydedilmez.',
  },
  {
    icon: Icons.spark,
    tone: 'lilac' as const,
    title: 'Süpervizyon bir tık uzakta',
    text: 'Kıdemli süpervizörlerle anonim vaka kartı üzerinden çalış; saatlerin deftere otomatik işlensin.',
  },
  {
    icon: Icons.shield,
    tone: 'lilac' as const,
    title: 'Görünür bir kalite işareti',
    text: 'Düzenli süpervizyon alan uzmanlar profillerinde "Süpervizyonlu Uzman" rozetiyle öne çıkar.',
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
  const [accountType, setAccountType] = useState<'therapist' | 'supervision_only'>('therapist')
  const seesClients = accountType === 'therapist'
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

    if (seesClients && areas.length === 0) {
      setSubmitState({
        type: 'error',
        message: 'Lütfen en az bir uzmanlık alanı seç.',
      })
      return
    }

    if (seesClients && availability.length === 0) {
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
      account_type: accountType,
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
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Header />

      <PageHero
        tone="lilac"
        title="Danışanını düşün. Gerisini platform düşünsün."
        lead="Mindora'da sana uygun danışanlar gelir, takvim ve ödeme kendiliğinden işler. Zor bir vakada da yalnız kalmazsın: kıdemli bir meslektaşa danışmak birkaç tık uzağında."
        visual={
          <>
            <ThreadLine className="absolute inset-0 h-full w-full" d="M20 360 C 150 200, 270 420, 370 230 S 520 60, 570 100" length={850} />
            <div className="animate-drift relative z-10 w-full max-w-sm" style={{ ['--tilt' as string]: '1deg' }}>
              <LogbookMock />
            </div>
            <FloatingNote className="-top-3 left-0 z-20" tilt="-2deg" delay="0.9s" icon={<IconBadge tone="lilac">{Icons.people}</IconBadge>}>
              Yeni süpervizyon onaylandı
            </FloatingNote>
            <FloatingNote className="-bottom-3 right-0 z-20" tilt="2deg" delay="1.7s" icon={<IconBadge>{Icons.calendar}</IconBadge>}>
              Perşembe 19:00 · yeni danışan
            </FloatingNote>
            <SampleCaption className="absolute -bottom-10 left-0" />
          </>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <a href="#basvuru-formu" className="inline-flex justify-center rounded-full bg-lilac-900 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-lilac-950">
            Başvuru formuna geç
          </a>
          <a href="/supervizyon" className="inline-flex justify-center rounded-full border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-800 transition-colors hover:border-slate-400">
            Süpervizyon nasıl işliyor?
          </a>
        </div>
      </PageHero>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item, index) => (
            <Reveal key={item.title} delay={index * 70} className="rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200/70">
              <IconBadge tone={item.tone}>{item.icon}</IconBadge>
              <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="basvuru-formu" className="mx-auto grid max-w-7xl scroll-mt-20 gap-10 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">Başvurun üç adımda sonuçlanır.</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">Başvuru ücretsizdir. Bilgilerini paylaş, belgelerini birlikte kontrol edelim.</p>

          <ol className="relative mt-8 space-y-5 rounded-3xl bg-lilac-950 p-6 text-white before:absolute before:bottom-9 before:left-[41px] before:top-9 before:w-px before:bg-white/20">
            {PROCESS_STEPS.map((step, index) => (
              <li
                key={step.title}
                style={{ animationDelay: `${index * 100}ms` }}
                className="animate-fade-in-up relative flex gap-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lilac-200 font-display text-sm font-semibold text-lilac-950">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/70">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-6 text-xs leading-6 text-slate-500">
            Başvuru yapmak Mindora uzman ağına otomatik kabul anlamına gelmez. Başvurular profil uygunluğu,
            uzmanlık alanı ve platform ihtiyacına göre değerlendirilir.
          </p>
        </aside>

        <section className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 md:p-8">
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
            <fieldset>
              <legend className="mb-3 block text-sm font-semibold text-slate-700">Mindora&apos;yı nasıl kullanmak istiyorsun?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { value: 'therapist' as const, title: 'Danışan görmek istiyorum', text: 'Profilin listelenir, danışan eşleştirilir. Süpervizyon da alabilirsin.' },
                  { value: 'supervision_only' as const, title: 'Yalnızca süpervizyon', text: 'Danışan almazsın; süpervizör bulur, vakalarını konuşur, saatlerini biriktirirsin.' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      accountType === option.value ? 'border-lilac-400 bg-lilac-50 ring-2 ring-lilac-100' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="account_type"
                      value={option.value}
                      checked={accountType === option.value}
                      onChange={() => setAccountType(option.value)}
                      className="sr-only"
                    />
                    <span className="block font-semibold text-slate-900">{option.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">{option.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>

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

            {seesClients ? (
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
            ) : null}

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

              {seesClients ? (
                <>
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
                </>
              ) : null}
            </div>

            {seesClients ? (
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
            ) : null}

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
              className="w-full rounded-full bg-pine-800 px-6 py-4 text-base font-semibold text-white transition-all duration-200 ease-out hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Başvuru gönderiliyor...' : 'Uzman başvurusunu gönder'}
            </button>
          </form>
        </section>
      </section>
    </main>
  )
}
