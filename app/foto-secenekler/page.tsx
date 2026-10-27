import Link from 'next/link'
import { notFound } from 'next/navigation'
import Photo, { SESSION_PHOTOS } from '@/components/marketing/Photo'

// Yalnızca önizleme ortamında: fotoğraf adaylarını yan yana görmek için. Merge öncesi silinecek.
export const metadata = { title: 'Fotoğraf seçenekleri', robots: { index: false, follow: false } }

export default function PhotoOptionsPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">Fotoğraf seçenekleri</h1>
        <p className="mt-2 text-slate-600">
          Numaraya tıklayınca o fotoğraf ana sayfanın en üstünde denenir. Beğendiğin numaraları yaz yeter.
        </p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SESSION_PHOTOS.map((photo, i) => (
            <li key={photo.src} className="rounded-3xl bg-white p-3 ring-1 ring-slate-200">
              <Photo photo={photo} tone="none" sizes="(min-width: 1024px) 25vw, 50vw" className="aspect-[4/5] rounded-2xl" />
              <div className="mt-3 flex items-start justify-between gap-3 px-1">
                <p className="text-sm text-slate-600">
                  <span className="mr-1 font-display text-lg font-semibold text-slate-900">{i + 1}.</span>
                  {photo.label}
                </p>
              </div>
              <div className="mt-2 flex gap-2 px-1 pb-1 text-sm font-semibold">
                <Link href={`/?foto=${i + 1}`} className="rounded-full bg-pine-800 px-3 py-1.5 text-white">En üstte dene</Link>
                <Link href={`/?adim=${i + 1}#nasil`} className="rounded-full border border-slate-300 px-3 py-1.5">4. adımda dene</Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
