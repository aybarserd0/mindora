import { permanentRedirect } from 'next/navigation'

// Eski Google Form sayfası; başvurular artık /uzman-basvuru üzerinden alınıyor
export default function PsikologBasvuru() {
  permanentRedirect('/uzman-basvuru')
}
