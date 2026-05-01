'use client'

import { FormEvent, useState } from 'react'

export default function UzmanBasvuruPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSent(false)
    setLoading(true)

    const formElement = event.currentTarget
    const form = new FormData(formElement)

    const payload = {
      name: String(form.get('name') || ''),
      phone: String(form.get('phone') || ''),
      email: String(form.get('email') || ''),
      photo_url: String(form.get('photo_url') || ''),
      title: String(form.get('title') || ''),
      areas: form.getAll('areas'),
      experience: String(form.get('experience') || ''),
      online: String(form.get('online') || ''),
      price: String(form.get('price') || ''),
      availability: form.getAll('availability'),
      expectation: String(form.get('expectation') || ''),
      note: String(form.get('note') || ''),
    }

    try {
      const res = await fetch('/api/uzman-basvuru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (!res.ok || !result.ok) {
        alert('Başvuru gönderilemedi. Lütfen tekrar dene.')
        return
      }

      setSent(true)
      formElement.reset()
    } catch {
      alert(
        'Başvuru gönderilemedi. Lütfen internet bağlantını kontrol edip tekrar dene.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-[#171717]">
      <nav className="sticky top-0 z-50 border-b border-black/10 bg-[#f6f1ea]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Mindora"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-xl font-bold tracking-tight">Mindora</span>
          </a>

          <a
            href="/eslesme"
            className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-neutral-800"
          >
            Danışan eşleşmesi
          </a>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[0.9fr_1.1fr] md:py-24">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm">
            Uzman başvuruları açık
          </div>

          <h1 className="text-5xl font-black leading-tight tracking-tight md:text-6xl">
            Mindora uzman ağına katıl.
          </h1>

          <p className="mt-6 text-lg leading-8 text-neutral-700">
            Uzmanlık alanına uygun danışanlarla çalışmak, online yönlendirme
            almak ve Mindora ekosisteminde yer almak için başvurunu
            iletebilirsin.
          </p>

          <div className="mt-8 grid gap-3 text-sm font-bold text-neutral-700 sm:grid-cols-2">
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
              Danışan yönlendirmesi
            </span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
              Esnek çalışma
            </span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
              Uzmanlık alanına göre eşleşme
            </span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
              Online süreç
            </span>
          </div>

          <div className="mt-8 rounded-[2rem] bg-white/70 p-6 text-sm leading-7 text-neutral-600 shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-black">Başvuru süreci nasıl işler?</p>
            <p className="mt-2">
              Başvurun Mindora ekibi tarafından incelenir. Uygun görülen
              uzmanlar onaylanır ve uzmanlar sayfasında otomatik olarak
              listelenir.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <h2 className="text-3xl font-black">Uzman başvuru bilgileri</h2>
          <p className="mt-2 text-neutral-600">
            Bilgilerin yalnızca başvuru değerlendirme süreci için kullanılır.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold">Ad Soyad</label>
              <input
                name="name"
                required
                placeholder="Adın ve soyadın"
                className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Telefon numarası
              </label>
              <input
                name="phone"
                required
                placeholder="05xx xxx xx xx"
                className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">E-posta</label>
              <input
                name="email"
                type="email"
                required
                placeholder="ornek@mail.com"
                className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Profil fotoğrafı linki{' '}
                <span className="font-medium text-neutral-500">
                  (opsiyonel)
                </span>
              </label>
              <input
                name="photo_url"
                type="url"
                placeholder="https://..."
                className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white"
              />
              <p className="mt-2 text-xs leading-5 text-neutral-500">
                Fotoğraf eklenmezse uzman kartında otomatik avatar gösterilir.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Ünvan</label>
              <input
                name="title"
                required
                placeholder="Örn: Klinik Psikolog, Psikolog, Psikolojik Danışman"
                className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold">
                Uzmanlık alanların
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  'Kaygı / stres',
                  'İlişki / aile',
                  'Depresif hisler',
                  'Özgüven',
                  'Motivasyon',
                  'Diğer',
                ].map((item) => (
                  <label
                    key={item}
                    className="cursor-pointer rounded-2xl bg-[#f6f1ea] px-4 py-3 text-sm font-semibold transition hover:bg-[#eee5da]"
                  >
                    <input
                      name="areas"
                      type="checkbox"
                      value={item}
                      className="mr-2"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Deneyim yılın
              </label>
              <select
                name="experience"
                required
                className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white"
              >
                <option value="">Seç</option>
                <option>0–2 yıl</option>
                <option>2–5 yıl</option>
                <option>5+ yıl</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Online görüşme yapıyor musun?
              </label>
              <select
                name="online"
                required
                className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white"
              >
                <option value="">Seç</option>
                <option>Evet</option>
                <option>Hayır</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Seans ücretin
              </label>
              <input
                name="price"
                required
                placeholder="Örn: 700 TL"
                className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white"
              />
              <p className="mt-2 text-xs leading-5 text-neutral-500">
                Bu bilgi başvuru değerlendirme ve eşleştirme sürecinde
                kullanılır; uzman kartında herkese açık gösterilmez.
              </p>
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold">
                Genel müsaitlik
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  'Hafta içi gündüz',
                  'Hafta içi akşam',
                  'Hafta sonu',
                  'Esnek / değişken',
                ].map((item) => (
                  <label
                    key={item}
                    className="cursor-pointer rounded-2xl bg-[#f6f1ea] px-4 py-3 text-sm font-semibold transition hover:bg-[#eee5da]"
                  >
                    <input
                      name="availability"
                      type="checkbox"
                      value={item}
                      className="mr-2"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Mindora’dan beklentin nedir?
              </label>
              <textarea
                name="expectation"
                rows={3}
                required
                placeholder="Mindora’dan nasıl bir yönlendirme veya iş birliği bekliyorsun?"
                className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Eklemek istediğin bir şey var mı?
              </label>
              <textarea
                name="note"
                rows={3}
                placeholder="Varsa ek notunu yazabilirsin."
                className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none transition focus:border-black/30 focus:bg-white"
              />
            </div>

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-black px-6 py-4 font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Gönderiliyor...' : 'Uzman başvurusunu gönder'}
            </button>

            {sent && (
              <div className="rounded-2xl bg-green-50 p-4 text-center text-sm font-semibold text-green-700 ring-1 ring-green-100">
                Başvurun alındı 🙌 En kısa sürede seninle iletişime geçeceğiz.
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  )
}