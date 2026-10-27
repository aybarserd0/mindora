import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import PageHero from '@/components/marketing/PageHero'
import { PHOTOS } from '@/components/marketing/Photo'
import CtaBand from '@/components/marketing/CtaBand'
import Reveal from '@/components/marketing/Reveal'
import StepsShowcase from '@/components/marketing/StepsShowcase'
import Comparison from '@/components/marketing/Comparison'
import {
  CaseRedactionMock,
  FloatingNote,
  IconBadge,
  Icons,
  LogbookMock,
  SampleCaption,
  SupervisorCardMock,
  ThreadLine,
  VideoCallMock,
} from '@/components/marketing/Mocks'

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
    visual: <SupervisorCardMock />,
  },
  {
    title: 'Vakanı anonim olarak hazırla',
    text: 'Yapılandırılmış vaka kartında isim, şehir, meslek alanı yok. Yazdıklarını kişisel bilgi için otomatik tarar, göndermeden önce işaretleriz.',
    visual: <CaseRedactionMock />,
  },
  {
    title: 'Görüntülü görüş',
    text: 'Seans Mindora içinde yapılır ve kaydedilmez. Ödeme, hatırlatma ve bağlantı linkiyle uğraşmazsın.',
    visual: <VideoCallMock />,
  },
  {
    title: 'Saatin deftere işlensin',
    text: 'Süpervizörün onayladığında seans saat defterine eklenir. Her kaydın, başkalarının da doğrulayabileceği bir kodu olur.',
    visual: <LogbookMock />,
  },
]

const comparison = [
  {
    topic: 'Süpervizör bulmak',
    others: 'Tanıdık çevresine, grup mesajlarına ve kulaktan dolma önerilere bağlı.',
    mindora: 'Ekol, odak alanı ve ücrete göre filtrelenebilen, belgeleri incelenmiş süpervizörler.',
  },
  {
    topic: 'Vaka paylaşımı',
    others: 'Notlar e-postayla ya da mesajla gider; neyin paylaşıldığı kontrolsüz kalır.',
    mindora: 'Anonim vaka kartı, otomatik kişisel bilgi taraması ve her açılışın kaydı.',
  },
  {
    topic: 'Saat kaydı',
    others: 'Dağınık tablolar, imza kovalamak, kaybolan dekontlar.',
    mindora: 'Süpervizör onaylı, doğrulama kodlu dijital saat defteri.',
  },
  {
    topic: 'Ödeme ve takvim',
    others: 'Havale, hatırlatma mesajları, ayrı bir görüntülü görüşme uygulaması.',
    mindora: 'Randevu, ödeme ve görüntülü görüşme tek ekranda.',
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
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Header />

      <PageHero
        photo={PHOTOS.onlineMeeting}
        tone="lilac"
        title="İyi terapist de birine danışır."
        lead="Mindora'da kıdemli klinik psikologlardan online süpervizyon al, vakalarını danışanının kimliği hiç paylaşılmadan konuş ve saatlerini doğrulanabilir bir defterde biriktir."
        visual={
          <>
            <ThreadLine className="absolute inset-0 h-full w-full" d="M20 370 C 150 210, 270 430, 370 240 S 520 70, 570 110" length={850} />
            <div className="animate-drift relative z-10 w-full max-w-md" style={{ ['--tilt' as string]: '-1deg' }}>
              <CaseRedactionMock />
            </div>
            <FloatingNote className="-top-4 right-0 z-20" tilt="2deg" delay="0.9s" icon={<IconBadge tone="lilac">{Icons.people}</IconBadge>}>
              Süpervizörün kartı açtı · kayıt alındı
            </FloatingNote>
            <FloatingNote className="-bottom-6 left-0 z-20" tilt="-2deg" delay="1.7s" icon={<IconBadge>{Icons.shield}</IconBadge>}>
              3 kişisel bilgi kapatıldı
            </FloatingNote>
            <SampleCaption className="absolute -bottom-14 right-0" />
          </>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/expert/dashboard/supervizyon"
            className="inline-flex justify-center rounded-full bg-lilac-800 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-lilac-900"
          >
            Süpervizör bul
          </Link>
          <Link
            href="/uzman-basvuru"
            className="inline-flex justify-center rounded-full border border-lilac-300 bg-white px-7 py-3.5 font-semibold text-lilac-900 transition-colors hover:border-lilac-500"
          >
            Henüz hesabım yok, başvur
          </Link>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:py-24">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">Dört adımda süpervizyon</h2>
        </Reveal>
        <div className="mt-6">
          <StepsShowcase steps={steps} accent="lilac" />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:py-24">
          <Reveal>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">Alışılmış yol ile Mindora arasındaki fark</h2>
          </Reveal>
          <div className="mt-12">
            <Comparison rows={comparison} othersLabel="Alışılmış yolda" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center lg:py-24">
        <Reveal>
          <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">Danışanının kimliği süpervizyona girmez</h2>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
            Süpervizör yalnızca seansa eklediğin vaka kartını görür. Kartın hangi danışana ait olduğu bilgisi
            hiçbir yerde tutulmaz; kartlar seans bittikten 90 gün sonra silinir.
          </p>
        </Reveal>
        <ul className="divide-y divide-slate-200 border-y border-slate-200">
          {[
            ['Yapılandırılmış form', 'Yaş yalnızca aralık olarak; ad, şehir, meslek, işyeri alanı yok.'],
            ['Otomatik tarama', 'Telefon, e-posta, kimlik numarası ve isim olabilecek ifadeler gönderilmeden işaretlenir.'],
            ['Danışan onayı', 'Vaka paylaşmadan önce danışandan onay aldığını beyan edersin.'],
            ['Erişim kaydı', 'Süpervizörün bir kartı her açışı kayıt altına alınır.'],
          ].map(([title, text], i) => (
            <Reveal as="li" key={title} delay={i * 70} className="grid gap-1 py-5 sm:grid-cols-[0.8fr_1.2fr] sm:gap-6">
              <p className="font-display font-semibold">{title}</p>
              <p className="leading-7 text-slate-600">{text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="bg-lilac-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <Reveal>
            <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">Danışanlar bu farkı görür.</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/75">
              Son üç ayda düzenli süpervizyon alan psikologların profilinde &quot;Süpervizyonlu Uzman&quot; rozeti
              görünür. Danışan için güven, senin için görünür bir kalite işareti.
            </p>
          </Reveal>
          <Reveal delay={120} className="rounded-3xl bg-white p-5 text-slate-900 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d3c8ec,#b8e0d2)] font-display font-semibold text-lilac-900">DA</span>
              <div>
                <p className="font-display font-semibold">Uzm. Klinik Psk. Deniz A.</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-pine-50 px-2.5 py-1 text-[11px] font-semibold text-pine-800 ring-1 ring-pine-100">{Icons.shield}Belgeleri doğrulandı</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-lilac-50 px-2.5 py-1 text-[11px] font-semibold text-lilac-800 ring-1 ring-lilac-100">{Icons.people}Süpervizyonlu Uzman</span>
                </div>
              </div>
            </div>
            <SampleCaption className="mt-4" />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:py-24">
        <Reveal className="grid gap-10 rounded-[2.5rem] bg-pine-950 p-8 text-white sm:p-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">Süpervizör olmak ister misin?</h2>
            <p className="mt-4 max-w-md leading-7 text-pine-200">Deneyimini meslektaşlarınla paylaş, ek gelir elde et.</p>
            <Link
              href="/expert/dashboard/supervizor"
              className="mt-8 inline-flex rounded-full bg-white px-7 py-3.5 font-semibold text-pine-950 transition-colors hover:bg-pine-50"
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
        </Reveal>
        <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-500">
          Mindora saat defteri, seansların platform üzerinden yapıldığının kaydıdır. Sertifika, yeterlilik ya da
          akreditasyon belgesi değildir.
        </p>
      </section>

      <CtaBand
        tone="lilac"
        title="Bir sonraki zor vakada yalnız kalma."
        text="Mindora hesabınla süpervizörleri incele, ilk tanışma görüşmesi ücretsiz."
        primary={{ label: 'Süpervizör bul', href: '/expert/dashboard/supervizyon' }}
        secondary={{ label: 'Uzman olarak başvur', href: '/uzman-basvuru' }}
      />
    </main>
  )
}
