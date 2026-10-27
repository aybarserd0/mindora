import Image from 'next/image'

type Tone = 'pine' | 'lilac' | 'none'
export type PhotoSource = { src: string; alt: string; label: string }

// Sayfa ve konuya göre kullanılan temsili fotoğraflar (Unsplash Lisansı, ücretsiz ticari kullanım).
// Gerçek uzman ya da danışan gibi sunulmaz; uzmanlar sayfasında temsili yüz kullanılmaz.
export const PHOTOS = {
  forestWalk: { label: 'Ağaçların altında yürüyüş', src: 'https://images.unsplash.com/photo-1531781760952-ffc164f36d13', alt: 'Ağaçların altında yürüyüş yapan biri' },
  forestLight: { label: 'Ormana süzülen gün ışığı', src: 'https://images.unsplash.com/photo-1762539683985-de22c1e2358f', alt: 'Ormandaki patikaya süzülen gün ışığı' },
  forestTrees: { label: 'Ağaçların arasından gün ışığı', src: 'https://images.unsplash.com/photo-1760645612099-569f42cacd74', alt: 'Yeşil bir ormanda ağaçların arasından süzülen ışık' },
  leaves: { label: 'Yapraklardan süzülen gün ışığı', src: 'https://images.unsplash.com/photo-1761488877637-be39d4c58968', alt: 'Yeşil yaprakların arasından süzülen gün ışığı' },
  journal: { label: 'Kahve eşliğinde not almak', src: 'https://images.unsplash.com/photo-1642543492457-39a2ce63bb59', alt: 'Bir fincan kahvenin yanında kâğıda not alan biri' },
  desk: { label: 'Bitkili çalışma masası', src: 'https://images.unsplash.com/photo-1768471125958-78556538fadc', alt: 'Bitkilerle dolu, gün ışığı alan bir çalışma masasında çalışan kadın' },
  laptopCall: { label: 'Bitkinin yanında görüntülü görüşme açık laptop', src: 'https://images.unsplash.com/photo-1616531770192-6eaea74c2456', alt: 'Bitkilerin yanında, ekranında görüntülü görüşme açık bir laptop' },
  tableCall: { label: 'Masada laptopla görüşen kadın', src: 'https://images.unsplash.com/photo-1648737966786-ceba53e643b1', alt: 'Masada laptopla görüşme yapan bir kadın' },
  onlineMeeting: { label: 'Laptopta görüntülü görüşmedeki kadın', src: 'https://images.unsplash.com/photo-1616587226157-48e49175ee20', alt: 'Laptopla görüntülü görüşme yapan bir kadın' },
} satisfies Record<string, PhotoSource>

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
  cover = false,
}: {
  photo: { src: string; alt: string }
  className?: string
  tone?: Tone
  sizes?: string
  priority?: boolean
  position?: string
  /** Kutunun tamamını kaplayan arka plan fotoğrafı */
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
        className="object-cover saturate-[0.9]"
        style={{ objectPosition: position }}
      />
      {tone !== 'none' ? <div aria-hidden="true" className={`absolute inset-0 ${toneOverlay[tone]}`} /> : null}
    </div>
  )
}
