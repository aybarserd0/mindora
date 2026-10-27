import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import ServicesAside from '@/components/marketing/ServicesAside'
import ClientAccessForm from './ClientAccessForm'

export const metadata: Metadata = {
  title: 'Danışan girişi',
  description: 'Psikolog, diyetisyen ya da antrenörünle görüşmelerine girmek için panel bağlantını e-postana yeniden gönder.',
  alternates: { canonical: '/danisan-girisi' },
  robots: { index: false, follow: true },
}

export default function ClientAccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:py-20">
        <ServicesAside
          heading="Tüm görüşmelerin tek panelde."
          lead="Psikoloğunla, diyetisyeninle ya da antrenörünle; görüşme saatlerin, mesajların ve paylaşılan planların hep aynı yerde."
          items={[
            { title: 'Saatini seç, ödemeni yap', text: 'Uzmanının boş saatlerinden birini seç; toplam ücreti ödemeden önce gör.' },
            { title: 'Plan ve programların burada', text: 'Beslenme planın, antrenman programın ya da uzmanının paylaştığı her dosya panelinde.' },
            { title: 'Randevunu yönet', text: 'Görüşmeye 24 saatten fazla varken iptal edersen ücretin tamamı iade edilir.' },
          ]}
        />

        <div className="order-1 flex flex-col justify-center rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200/80 sm:p-10 lg:order-2">
          <h1 className="text-3xl font-semibold">Danışan girişi</h1>
          <p className="mt-3 leading-7 text-slate-600">
            Mindora&apos;da şifre yok. Başvururken kullandığın e-posta adresini yaz, panel bağlantını hemen gönderelim.
            Birden fazla uzmanla çalışıyorsan her biri için bağlantın aynı e-postada gelir.
          </p>
          <ClientAccessForm />
          <div className="mt-8 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-900">Henüz başvurmadın mı?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/eslesme" className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:border-pine-600 hover:text-pine-900">Psikolog</Link>
              <Link href="/eslesme?meslek=diyetisyen" className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:border-pine-600 hover:text-pine-900">Diyetisyen</Link>
              <Link href="/eslesme?meslek=antrenor" className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:border-pine-600 hover:text-pine-900">Kişisel antrenör</Link>
            </div>
            <p className="mt-5 text-xs text-slate-500">
              Uzman mısın? <Link href="/expert/login" className="font-semibold text-pine-800 underline">Uzman girişine</Link> geç.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
