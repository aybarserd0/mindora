import Image from 'next/image'

type Tone = 'pine' | 'lilac' | 'none'

// Temsili atmosfer fotoğrafları (Unsplash Lisansı). Gerçek uzman/danışan gibi sunulmaz.
export const PHOTOS = {
  tea: {
    src: 'https://images.unsplash.com/photo-1514488034139-5905ab173d22',
    alt: 'Elinde bir fincan çayla sakin bir an yaşayan kadın',
  },
  walk: {
    src: 'https://images.unsplash.com/photo-1531781760952-ffc164f36d13',
    alt: 'Ağaçların altında yürüyüş yapan biri',
  },
  desk: {
    src: 'https://images.unsplash.com/photo-1768471125958-78556538fadc',
    alt: 'Bitkilerle dolu, gün ışığı alan bir çalışma masasında çalışan kadın',
  },
  trail: {
    src: 'https://images.unsplash.com/photo-1464880963754-5cb06fbff95f',
    alt: 'Orman yolunda yürüyen biri',
  },
} as const

const toneOverlay: Record<Tone, string> = {
  pine: 'bg-pine-700/25 mix-blend-multiply',
  lilac: 'bg-lilac-600/25 mix-blend-multiply',
  none: '',
}

export default function Photo({
  photo,
  className = '',
  tone = 'pine',
  sizes = '(min-width: 1024px) 50vw, 100vw',
  priority = false,
  position = 'center',
  cover = false,
}: {
  photo: { src: string; alt: string }
  className?: string
  tone?: Tone
  sizes?: string
  priority?: boolean
  position?: string
  cover?: boolean
}) {
  return (
    <div className={`${cover ? 'absolute inset-0' : 'relative'} overflow-hidden ${className}`}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover saturate-[0.85]"
        style={{ objectPosition: position }}
      />
      {tone !== 'none' ? <div aria-hidden="true" className={`absolute inset-0 ${toneOverlay[tone]}`} /> : null}
    </div>
  )
}
