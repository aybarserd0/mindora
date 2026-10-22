import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'Psikologlar için online süpervizyon',
  description:
    'Mindora’da kıdemli klinik psikologlardan online süpervizyon al, vakalarını anonim olarak paylaş, süpervizyon saatlerini doğrulanabilir bir defterde tut.',
  alternates: { canonical: '/supervizyon' },
}

const steps = [
  {
    title: 'Süpervizörünü seç',
    text: 'Ekole, odak alanına ve ücrete göre filtrele. İstersen önce 15 dakikalık ücretsiz tanışma görüşmesi yap.',
  },
  {
    title: 'Vakanı anonim olarak hazırla',
    text: 'Yapılandırılmış vaka kartında isim, şehir, meslek gibi alanlar yok. Yazdıklarını kişisel bilgi için otomatik tararız.',
  },
  {
    title: 'Görüş ve kaydını al',
    text: 'Görüntülü seans Mindora içinde yapılır ve kaydedilmez. Seans, süpervizörünün onayıyla saat defterine işlenir.',
  },
]

const forSupervisors = [
  'Ücretini sen belirlersin; komisyon %15.',
  'Talepleri kabul eder, takvimini kendin yönetirsin.',
  'Ödeme, görüntülü görüşme ve kayıt işleri platformda.',
  'Başvuru şartı: en az 5 yıl klinik deneyim ve ekol eğitimi belgesi.',
]

export default function SupervisionLandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <section className="border-b border-slate-200 bg-lilac-50">
        <div className="mx-auto max-w-7xl px-5 pb-20 pt-14 lg:pb-24 lg:pt-20">
          <h1 className="max-w-[16ch] text-[2.6rem] font-semibold leading-[1.04] sm:text-6xl lg:text-7xl">
            Süpervizyonunu bulmak bu kadar zor olmamalı.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-700">
            Mindora&apos;da kıdemli klinik psikologlardan online süpervizyon al, vakalarını
            danışanının kimliği hiç paylaşılmadan konuş ve saatlerini doğrulanabilir bir
            defterde biriktir.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/expert/dashboard/supervizyon"
              className="inline-flex justify-center rounded-full bg-lilac-700 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-lilac-800"
            >
              Süpervizör bul
            </Link>
            <Link
              href="/uzman-basvuru"
              className="inline-flex justify-center rounded-full border border-lilac-300 bg-white px-6 py-3.5 font-semibold text-lilac-800 transition-colors hover:border-lilac-500"
            >
              Henüz hesabım yok, başvur
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:py-24">
        <h2 className="text-3xl font-semibold sm:text-4xl">Nasıl işliyor</h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li key={step.title} className="border-t-2 border-slate-900 pt-6">
              <span className="font-display text-sm font-semibold text-lilac-700">{index + 1}. adım</span>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 max-w-sm leading-7 text-slate-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:py-24">
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">Danışanının kimliği süpervizyona girmez</h2>
            <p className="mt-5 max-w-lg leading-7 text-slate-600">
              Süpervizör yalnızca seansa eklediğin vaka kartını görür. Kartın hangi danışana ait
              olduğu bilgisi hiçbir yerde tutulmaz; kartlar seans bittikten 90 gün sonra silinir.
            </p>
          </div>
          <ul className="divide-y divide-slate-200 border-y border-slate-200">
            {[
              ['Yapılandırılmış form', 'Yaş yalnızca aralık olarak; ad, şehir, meslek, işyeri alanı yok.'],
              ['Otomatik tarama', 'Telefon, e-posta, kimlik numarası ve isim olabilecek ifadeler gönderilmeden işaretlenir.'],
              ['Danışan onayı', 'Vaka paylaşmadan önce danışandan onay aldığını beyan edersin.'],
              ['Erişim kaydı', 'Süpervizörün bir kartı her açışı kayıt altına alınır.'],
            ].map(([title, text]) => (
              <li key={title} className="grid gap-1 py-5 sm:grid-cols-[0.8fr_1.2fr] sm:gap-6">
                <p className="font-display font-semibold">{title}</p>
                <p className="leading-7 text-slate-600">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:py-24">
        <div className="grid gap-10 rounded-3xl bg-pine-950 p-8 text-white sm:p-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">Süpervizör olmak ister misin?</h2>
            <p className="mt-4 max-w-md leading-7 text-pine-200">
              Deneyimini meslektaşlarınla paylaş, ek gelir elde et.
            </p>
            <Link
              href="/expert/dashboard/supervizor"
              className="mt-8 inline-flex rounded-full bg-white px-6 py-3.5 font-semibold text-pine-950 transition-colors hover:bg-pine-50"
            >
              Süpervizör başvurusu yap
            </Link>
          </div>
          <ul className="space-y-3">
            {forSupervisors.map((item) => (
              <li key={item} className="border-b border-pine-800 pb-3 leading-7 text-pine-100">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-500">
          Mindora saat defteri, seansların platform üzerinden yapıldığının kaydıdır. Sertifika, yeterlilik ya
          da akreditasyon belgesi değildir.
        </p>
      </section>
    </main>
  )
}
