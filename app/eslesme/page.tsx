'use client';

import { FormEvent, useState } from 'react';

export default function EslesmePage() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const body = `
Mindora Danışan Eşleşme Başvurusu

Ad Soyad: ${form.get('name')}
Telefon: ${form.get('phone')}
Yaş Aralığı: ${form.get('age')}
Destek Konusu: ${form.get('topic')}
Süre: ${form.get('duration')}
Daha Önce Destek Aldı mı: ${form.get('previousSupport')}
Başlama Zamanı: ${form.get('startTime')}
Psikolog Tercihi: ${form.get('preference')}
Müsaitlik: ${form.getAll('availability').join(', ')}
Ek Not: ${form.get('note')}
`;

    window.location.href = `mailto:mindora.live@gmail.com?subject=Mindora Danışan Eşleşme Başvurusu&body=${encodeURIComponent(body)}`;
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
          <a href="/uzman-basvuru" className="rounded-full border border-black/10 bg-white/70 px-5 py-2.5 text-sm font-bold">
            Uzman mısın?
          </a>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[0.9fr_1.1fr] md:py-24">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm">
            Ücretsiz ön eşleşme
          </div>

          <h1 className="text-5xl font-black leading-tight tracking-tight md:text-6xl">
            Sana en uygun psikoloğu birlikte bulalım.
          </h1>

          <p className="mt-6 text-lg leading-8 text-neutral-700">
            Kısa bilgilerini paylaş. Mindora ekibi ihtiyacını değerlendirip sana uygun uzman önerisi için 60 dakika içinde dönüş yapar.
          </p>

          <div className="mt-8 grid gap-3 text-sm font-bold text-neutral-700 sm:grid-cols-2">
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">⏱ 60 dk içinde dönüş</span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">🎯 Sana özel öneri</span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">🔒 Gizli süreç</span>
            <span className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">💬 Online görüşme</span>
          </div>

          <p className="mt-8 text-sm leading-6 text-neutral-500">
            Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski varsa lütfen 112 ile iletişime geç.
          </p>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <h2 className="text-3xl font-black">Eşleşme bilgileri</h2>
          <p className="mt-2 text-neutral-600">
            Bu bilgiler yalnızca sana uygun yönlendirme yapmak için kullanılır.
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
              <label className="mb-2 block text-sm font-bold">Yaş aralığın nedir?</label>
              <select name="age" required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none">
                <option value="">Seç</option>
                <option>18–25</option>
                <option>25–35</option>
                <option>35–45</option>
                <option>45+</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Şu an seni en çok zorlayan konu nedir?</label>
              <select name="topic" required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none">
                <option value="">Seç</option>
                <option>Kaygı / stres</option>
                <option>İlişki / aile</option>
                <option>Özgüven</option>
                <option>Motivasyon</option>
                <option>Depresif hisler</option>
                <option>Diğer</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Bu durum ne zamandır devam ediyor?</label>
              <select name="duration" required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none">
                <option value="">Seç</option>
                <option>Birkaç hafta</option>
                <option>Birkaç ay</option>
                <option>Uzun süredir</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Daha önce psikolojik destek aldın mı?</label>
              <select name="previousSupport" required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none">
                <option value="">Seç</option>
                <option>Evet</option>
                <option>Hayır</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Ne zaman başlamak istersin?</label>
              <select name="startTime" required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none">
                <option value="">Seç</option>
                <option>Hemen</option>
                <option>Bu hafta</option>
                <option>Daha sonra</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Psikolog tercihin var mı?</label>
              <select name="preference" required className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none">
                <option value="">Seç</option>
                <option>Kadın psikolog</option>
                <option>Erkek psikolog</option>
                <option>Fark etmez</option>
              </select>
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold">Görüşme için genelde hangi saatler sana daha uygun?</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {['Hafta içi gündüz', 'Hafta içi akşam', 'Hafta sonu', 'Esnek / fark etmez'].map((item) => (
                  <label key={item} className="rounded-2xl bg-[#f6f1ea] px-4 py-3 text-sm font-semibold">
                    <input name="availability" type="checkbox" value={item} className="mr-2" />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Eklemek istediğin bir şey var mı?</label>
              <textarea name="note" rows={4} className="w-full rounded-2xl border border-black/10 bg-[#f6f1ea] px-4 py-3 outline-none" />
            </div>

            <button className="w-full rounded-2xl bg-black px-6 py-4 font-bold text-white transition hover:bg-neutral-800">
              Başvuruyu gönder
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