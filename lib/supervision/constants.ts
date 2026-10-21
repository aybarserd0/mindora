// Süpervizyon modülünde istemci ve sunucunun paylaştığı sabitler.

export const SUPERVISION_APPROACHES = [
  'Bilişsel Davranışçı Terapi',
  'Şema Terapi',
  'Psikodinamik',
  'EMDR',
  'Kabul ve Kararlılık Terapisi',
  'Sistemik / Aile Terapisi',
  'Çift Terapisi',
  'Varoluşçu / Hümanistik',
  'Çocuk ve Ergen',
  'Travma Odaklı',
] as const

export const CASE_TOPICS = [
  'Kaygı bozuklukları',
  'Depresyon',
  'Travma ve TSSB',
  'İlişki ve çift sorunları',
  'Kişilik örüntüleri',
  'Yeme sorunları',
  'Bağımlılık',
  'Yas ve kayıp',
  'Kriz ve risk değerlendirmesi',
  'Terapötik ilişki / aktarım',
  'Etik ikilem',
  'Diğer',
] as const

export const CASE_AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'] as const

export const CASE_GENDERS = [
  { value: 'kadin', label: 'Kadın' },
  { value: 'erkek', label: 'Erkek' },
  { value: 'diger', label: 'Diğer' },
  { value: 'belirtilmedi', label: 'Belirtmek istemiyorum' },
] as const

export const DEFAULT_COMMISSION_RATE = 0.15
export const SUPERVISION_SESSION_MINUTES = 50
export const INTRO_CALL_MINUTES = 15
export const MIN_SESSION_PRICE = 500
export const MAX_SESSION_PRICE = 10000
/** Seans başlangıcından ne kadar önce odaya girilebilir */
export const ROOM_OPEN_BEFORE_MINUTES = 10
/** Seans bitiminden ne kadar sonrasına kadar oda açık kalır */
export const ROOM_CLOSE_AFTER_MINUTES = 30
/** Kapatılan vaka kartları bu kadar gün sonra silinir */
export const CASE_RETENTION_DAYS = 90
/** Rozet: son N günde en az M onaylı seans */
export const BADGE_WINDOW_DAYS = 90
export const BADGE_MIN_SESSIONS = 2

export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  requested: 'Yanıt bekliyor',
  accepted: 'Ödeme bekliyor',
  declined: 'Reddedildi',
  confirmed: 'Onaylandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
  no_show: 'Katılım olmadı',
}

export type SupervisorStatus = 'pending' | 'approved' | 'rejected' | 'paused'

export const SUPERVISOR_STATUS_LABELS: Record<SupervisorStatus, string> = {
  pending: 'İnceleniyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
  paused: 'Duraklatıldı',
}
