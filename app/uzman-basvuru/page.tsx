'use client';

import { FormEvent, useState } from 'react';

export default function UzmanBasvuruPage() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const body = `
Mindora Uzman Başvurusu

Ad Soyad: ${form.get('name')}
Telefon: ${form.get('phone')}
E-posta: ${form.get('email')}
Ünvan: ${form.get('title')}
Uzmanlık Alanları: ${form.getAll('areas').join(', ')}
Deneyim: ${form.get('experience')}
Online Çalışma: ${form.get('online')}
Seans Ücreti: ${form.get('price')}
Uygun Saatler: ${form.getAll('availability').join(', ')}
Mindora’dan Beklenti: ${form.get('expectation')}
Ek Not: ${form.get('note')}
`;

    window.location.href = `mailto:mindora.live@gmail.com?subject=Mindora Uzman Başvurusu&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-[#171717]">
      <nav className="border-b border-black/10 bg-[#f6f1ea]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Mindora" className="h-10 w-10 rounded-xl" />
            <span className="text-xl font-bold tracking-tight">Mindora</span>
          </a>
          <a href="/eslesme" className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white">
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
            Uzmanlık alanına uygun danışanlarla çalışmak, online yönlendirme almak ve Mindora ekosisteminde yer almak için başvurunu iletebilirsin.
          </p>

          <div className="mt-8 grid gap-3 text-sm font-bold text-neutral-700 sm:grid-cols-2">
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">Danışan yönlendirmesi</span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">Esnek çalışma</span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">Uzmanlık alanına göre eşleşme</span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">Online süreç</span>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <h2 className="text-3xl font-black">Uzman başvuru bilgileri</h2>
          <p className="mt-2 text-neutral-600">
            Başvurular Mindora ekibi tarafından incelenir.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold">Ad Soyad</label>
              <input name="name" required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Telefon numarası</label>
              <input name="phone" required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">E-posta</label>
              <input name="email" type="email" required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Ünvan</label>
              <input name="title" required placeholder="Örn: Klinik Psikolog, Psikolog" className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none" />
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold">Uzmanlık alanların</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {['Kaygı / stres', 'İlişki / aile', 'Depresif hisler', 'Özgüven', 'Motivasyon', 'Diğer'].map((item) => (
                  <label key={item} className="rounded-2xl bg-[#f6f1ea] px-4 py-3 text-sm font-semibold">
                    <input name="areas" type="checkbox" value={item} className="mr-2" />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Deneyim yılın</label>
              <select name="experience" required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none">
                <option value="">Seç</option>
                <option>0–2 yıl</option>
                <option>2–5 yıl</option>
                <option>5+ yıl</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Online görüşme yapıyor musun?</label>
              <select name="online" required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none">
                <option value="">Seç</option>
                <option>Evet</option>
                <option>Hayır</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Seans ücretin</label>
              <input name="price" required placeholder="Örn: 700 TL" className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none" />
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold">Genel müsaitlik</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {['Hafta içi gündüz', 'Hafta içi akşam', 'Hafta sonu', 'Esnek / değişken'].map((item) => (
                  <label key={item} className="rounded-2xl bg-[#f6f1ea] px-4 py-3 text-sm font-semibold">
                    <input name="availability" type="checkbox" value={item} className="mr-2" />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Mindora’dan beklentin nedir?</label>
              <textarea name="expectation" rows={3} required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Eklemek istediğin bir şey var mı?</label>
              <textarea name="note" rows={3} className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none" />
            </div>

            <button className="w-full rounded-2xl bg-black px-6 py-4 font-bold text-white transition hover:bg-neutral-800">
              Uzman başvurusunu gönder
            </button>

            {sent && (
              <p className="text-center text-sm font-semibold text-neutral-600">
                Mail ekranı açıldı. Gönder’e basarak başvurunu iletebilirsin.
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}