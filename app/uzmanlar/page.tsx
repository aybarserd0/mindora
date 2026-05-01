'use client'

import Header from '@/components/Header'
import { useEffect, useState } from 'react'

type Expert = {
  id: string
  name: string
  title: string | null
  areas: string | null
  experience: string | null
  online: string | null
  price: string | null
  availability: string | null
}

export default function Uzmanlar() {
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)

  const areas = [
    'Kaygı ve stres',
    'İlişki problemleri',
    'Özgüven sorunları',
    'Depresif duygu durumu',
    'Aile içi iletişim',
    'Sınav ve gelecek kaygısı',
    'Motivasyon eksikliği',
    'Tükenmişlik',
  ]

  useEffect(() => {
    async function fetchExperts() {
      try {
        const res = await fetch('/api/experts')
        const data = await res.json()

        if (data.ok) {
          setExperts(data.experts || [])
        }
      } catch (error) {
        console.error('Uzmanlar alınamadı:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchExperts()
  }, [])

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-[#171717]">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
            Uzmanlarımız
          </p>

          <h1 className="mt-4 text-5xl font-black leading-tight md:text-6xl">
            Onaylı uzmanlarla güvenli başlangıç.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            Mindora’da uzmanlar başvuru sonrası değerlendirilir. Onaylanan
            uzmanlar burada görünür ve danışanlar uygun uzmanla eşleştirilir.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/eslesme"
              className="rounded-2xl bg-black px-8 py-4 text-center font-bold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Ücretsiz ön eşleşme başlat
            </a>

            <a
              href="/hakkimizda"
              className="rounded-2xl border border-black/10 bg-white/60 px-8 py-4 text-center font-bold text-black transition hover:-translate-y-0.5 hover:bg-white"
            >
              Mindora’yı tanı
            </a>
          </div>
        </div>

        {loading ? (
          <p className="mt-16 text-center text-neutral-600">Uzmanlar yükleniyor...</p>
        ) : experts.length === 0 ? (
          <div className="mx-auto mt-16 max-w-3xl rounded-[2rem] bg-white/70 p-8 text-center shadow-sm ring-1 ring-black/5">
            <h2 className="text-2xl font-black">Henüz onaylı uzman yok.</h2>
            <p className="mt-3 leading-7 text-neutral-600">
              Uzman başvuruları incelendikten sonra onaylanan uzmanlar bu
              sayfada otomatik olarak listelenecek.
            </p>
          </div>
        ) : (
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {experts.map((expert) => (
              <div
                key={expert.id}
                className="rounded-[2rem] bg-white/70 p-7 text-center shadow-sm ring-1 ring-black/5"
              >
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-black text-3xl font-black text-white">
                  {expert.name.charAt(0).toUpperCase()}
                </div>

                <h3 className="mt-6 text-xl font-black">{expert.name}</h3>

                <p className="mt-1 text-sm font-bold text-neutral-500">
                  {expert.title || 'Uzman'}
                </p>

                <p className="mt-4 leading-7 text-neutral-600">
                  {expert.areas || 'Uzmanlık alanı belirtilmedi'}
                </p>

                <div className="mt-5 space-y-2 text-sm text-neutral-600">
                  <p>
                    <b>Deneyim:</b> {expert.experience || '-'}
                  </p>
                  <p>
                    <b>Online görüşme:</b> {expert.online || '-'}
                  </p>
                  <p>
                    <b>Seans ücreti:</b> {expert.price || '-'}
                  </p>
                  <p>
                    <b>Müsaitlik:</b> {expert.availability || '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 rounded-[2rem] bg-black p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-400">
              Eşleşme mantığı
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Herkes için aynı uzman değil, sana uygun başlangıç.
            </h2>
          </div>

          <div className="space-y-5 text-lg leading-8 text-neutral-300">
            <p>
              Mindora’da amaç rastgele bir yönlendirme yapmak değil; kişinin
              ihtiyacını daha iyi anlayarak uygun uzmanla daha güvenli bir
              başlangıç yapmasını sağlamaktır.
            </p>

            <p>
              Form yanıtların; destek konusu, uzman tercihi, bütçe, uygun zaman
              ve beklenti gibi kriterlerle değerlendirilir.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">
            Destek alanları
          </p>

          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            Hangi konuda destek alabilirsin?
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {areas.map((area) => (
            <div
              key={area}
              className="rounded-2xl bg-white/70 p-5 text-center font-bold text-neutral-700 shadow-sm ring-1 ring-black/5"
            >
              {area}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5 md:p-14">
          <h2 className="text-4xl font-black md:text-5xl">
            Sana uygun uzmanı birlikte bulalım.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Kısa formu doldur, ihtiyacına uygun psikolojik destek süreci için
            ön eşleşmeyi başlat.
          </p>

          <a
            href="/eslesme"
            className="mt-8 inline-block rounded-2xl bg-black px-9 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            Ücretsiz ön eşleşme başlat
          </a>
        </div>
      </section>
    </main>
  )
}