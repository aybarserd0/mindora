import Image from 'next/image'

type Tone = 'pine' | 'lilac' | 'none'
export type PhotoSource = { src: string; alt: string; label: string }

// Online görüşme anını anlatan temsili fotoğraflar (Unsplash Lisansı, ücretsiz).
// Gerçek uzman ya da danışan gibi sunulmaz. Taslak: biri seçilince public/ altına indirilecek.
export const SESSION_PHOTOS: PhotoSource[] = [
  { label: 'Görüntülü görüşmede el sallayan kadın', src: 'https://images.unsplash.com/photo-1758521541324-d304c5303fe5', alt: 'Evinde laptopla görüntülü görüşme yapan bir kadın' },
  { label: 'Görüntülü görüşmede selam veren kadın', src: 'https://images.unsplash.com/photo-1758521541657-fd70465a5c54', alt: 'Laptop başında görüntülü görüşmeye katılan bir kadın' },
  { label: 'Bitkinin yanında görüntülü görüşme açık laptop', src: 'https://images.unsplash.com/photo-1616531770192-6eaea74c2456', alt: 'Bitkilerin yanında, ekranında görüntülü görüşme açık bir laptop' },
  { label: 'Masada laptopla görüşen kadın', src: 'https://images.unsplash.com/photo-1648737966786-ceba53e643b1', alt: 'Masada laptopla görüşme yapan bir kadın' },
  { label: 'Laptopta görüntülü görüşmedeki kadın', src: 'https://images.unsplash.com/photo-1616587226157-48e49175ee20', alt: 'Laptopla görüntülü görüşme yapan bir kadın' },
  { label: 'Laptop başındaki erkek', src: 'https://images.unsplash.com/photo-1616587226960-4a03badbe8bf', alt: 'Laptop başında görüşme yapan bir erkek' },
  { label: 'Masasında bilgisayar başındaki kadın', src: 'https://images.unsplash.com/photo-1648128126771-238106c2cc30', alt: 'Masasında bilgisayar başında oturan bir kadın' },
  { label: 'Tabletle görüşen kişi', src: 'https://images.unsplash.com/photo-1612831455359-970e23a1e4e9', alt: 'Tablet bilgisayarla görüşme yapan biri' },
]

export function pickPhoto(value: string | string[] | undefined, fallback: number) {
  const n = Number(Array.isArray(value) ? value[0] : value)
  const index = Number.isInteger(n) && n >= 1 && n <= SESSION_PHOTOS.length ? n - 1 : fallback - 1
  return { photo: SESSION_PHOTOS[index], number: index + 1 }
}

const toneOverlay: Record<Tone, string> = {
  pine: 'bg-pine-700/15 mix-blend-multiply',
  lilac: 'bg-lilac-600/15 mix-blend-multiply',
  none: '',
}

export default function Photo({
  photo,
  className = '',
  tone = 'pine',
  sizes = '(min-width: 1024px) 50vw, 100vw',
  priority = false,
  position = 'center',
}: {
  photo: { src: string; alt: string }
  className?: string
  tone?: Tone
  sizes?: string
  priority?: boolean
  position?: string
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover saturate-[0.9]"
        style={{ objectPosition: position }}
      />
      {tone !== 'none' ? <div aria-hidden="true" className={`absolute inset-0 ${toneOverlay[tone]}`} /> : null}
    </div>
  )
}
