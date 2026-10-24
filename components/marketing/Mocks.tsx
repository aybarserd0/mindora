// Ürünü anlatan, kodla çizilmiş arayüz kurguları. Fotoğraf yerine kullanılır;
// isimler ve değerler örnektir. Hepsi sunucu bileşenidir, hareketler CSS ile çalışır.
import type { CSSProperties, ReactNode } from 'react'

function vars(v: Record<string, string>) {
  return v as CSSProperties
}

function Check({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={`h-4 w-4 shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  )
}

/** Logodaki çizgiden türeyen avatar: baş harfler ve lavanta-nane geçişi */
export function Avatar({ initials, size = 'md', tone = 'lilac' }: { initials: string; size?: 'sm' | 'md' | 'lg'; tone?: 'lilac' | 'pine' }) {
  const sizes = { sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-lg' }
  const tones = {
    lilac: 'bg-[linear-gradient(135deg,#d3c8ec,#b8e0d2)] text-lilac-900',
    pine: 'bg-[linear-gradient(135deg,#b8d1c5,#e9e3f6)] text-pine-900',
  }
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold ${sizes[size]} ${tones[tone]}`}>
      {initials}
    </span>
  )
}

export function Chip({ children, tone = 'pine', icon }: { children: ReactNode; tone?: 'pine' | 'lilac' | 'neutral'; icon?: ReactNode }) {
  const tones = {
    pine: 'bg-pine-50 text-pine-800 ring-pine-100',
    lilac: 'bg-lilac-50 text-lilac-800 ring-lilac-100',
    neutral: 'bg-white text-slate-700 ring-slate-200',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  )
}

/** Havada asılı duran küçük bilgi kartı */
export function FloatingNote({
  children,
  className = '',
  tilt = '0deg',
  delay = '0s',
  icon,
}: {
  children: ReactNode
  className?: string
  tilt?: string
  delay?: string
  icon?: ReactNode
}) {
  return (
    <div
      className={`animate-drift absolute flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg ring-1 ring-slate-200/70 ${className}`}
      style={vars({ '--tilt': tilt, '--drift-delay': delay })}
    >
      {icon}
      {children}
    </div>
  )
}

export function IconBadge({ children, tone = 'pine' }: { children: ReactNode; tone?: 'pine' | 'lilac' | 'rose' }) {
  const tones = { pine: 'bg-pine-50 text-pine-700', lilac: 'bg-lilac-50 text-lilac-700', rose: 'bg-rose-50 text-rose-700' }
  return <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{children}</span>
}

export const Icons = {
  shield: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  people: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.7-3 2.9-4.6 5.5-4.6s4.8 1.6 5.5 4.6" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.6c2.2.2 3.8 1.6 4.4 4.4" /></svg>
  ),
  noRecord: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6.5" width="12.5" height="11" rx="2.5" /><path d="m15.5 10.5 5-3v9l-5-3" /><path d="M3 3l18 18" /></svg>
  ),
  tag: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 12.5V4.5h8l9 9-8 8z" /><circle cx="8" cy="9" r="1.4" /></svg>
  ),
  spark: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>
  ),
  calendar: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
  ),
}

/** Eşleşme önerisi kartı */
export function MatchCardMock({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200/80 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-pine-700">Senin için önerilen uzman</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Örnek öneri</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Avatar initials="DA" />
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-slate-900">Uzm. Klinik Psk. Deniz A.</p>
          <p className="text-xs text-slate-500">Bilişsel Davranışçı Terapi, 8 yıl</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Chip icon={Icons.shield}>Belgeleri doğrulandı</Chip>
        <Chip tone="lilac" icon={Icons.people}>Süpervizyonlu</Chip>
      </div>
      <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-700">
        <li className="flex items-center gap-2"><Check className="text-pine-600" />Kaygı ve stres alanında çalışıyor</li>
        <li className="flex items-center gap-2"><Check className="text-pine-600" />Hafta içi akşamları müsait</li>
        <li className="flex items-center gap-2"><Check className="text-pine-600" />Seans ücreti 1.500 ₺, ek ücret yok</li>
      </ul>
      <div className="mt-5 rounded-full bg-pine-800 px-4 py-2.5 text-center text-sm font-semibold text-white">Tanışmak istiyorum</div>
    </div>
  )
}

/** Görüntülü görüşme penceresi */
export function VideoCallMock({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 p-3 shadow-xl ${className}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[radial-gradient(120%_90%_at_30%_20%,#2f5a4d_0%,#1b2420_60%)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="animate-soft-pulse rounded-full"><Avatar initials="DA" size="lg" /></span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">Uzm. Klinik Psk. Deniz A.</span>
          </div>
        </div>
        <div className="absolute bottom-3 right-3 flex h-20 w-16 items-center justify-center rounded-xl bg-[linear-gradient(160deg,#46376c,#241c3a)] ring-2 ring-white/20">
          <Avatar initials="Sen" size="sm" tone="pine" />
        </div>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {Icons.noRecord}
          Kayıt yok
        </span>
      </div>
      <div className="flex items-center justify-center gap-3 pb-1 pt-3">
        {['mic', 'cam'].map((k) => (
          <span key={k} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80">
            <span className="h-2 w-2 rounded-full bg-white/70" />
          </span>
        ))}
        <span className="flex h-9 w-12 items-center justify-center rounded-full bg-rose-500 text-white">
          <span className="h-1 w-4 rounded-full bg-white" />
        </span>
      </div>
    </div>
  )
}

/** Vaka kartının anonimleşmesi: kişisel bilgiler işaretlenip kapatılır */
export function CaseRedactionMock({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full max-w-md rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200/80 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-lilac-700">Vaka kartı</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-lilac-50 px-2 py-0.5 text-[11px] font-semibold text-lilac-800">
          {Icons.shield}
          Otomatik tarama
        </span>
      </div>
      <p className="mt-4 text-[0.95rem] leading-7 text-slate-700">
        25–34 yaş, kaygı belirtileri iş yerinde artmış.{' '}
        <span className="redact" style={vars({ '--redact-delay': '0s' })}>Ayşe</span> seanslarda en çok uykusuzluktan bahsediyor.
        Bana <span className="redact" style={vars({ '--redact-delay': '0.25s' })}>0532 418 22 90</span> üzerinden ulaşıyor,{' '}
        <span className="redact" style={vars({ '--redact-delay': '0.5s' })}>Karşıyaka</span>&apos;daki işyerinden söz etti.
      </p>
      <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">Süpervizöre sorusu:</span> Kaçınma davranışında hangi müdahaleyle ilerlemeliyim?
      </div>
    </div>
  )
}

/** Haftalık müsaitlik ve saat seçimi */
export function CalendarMock({ className = '' }: { className?: string }) {
  const days = [
    { d: 'Pzt', n: 12 },
    { d: 'Sal', n: 13 },
    { d: 'Çar', n: 14 },
    { d: 'Per', n: 15 },
    { d: 'Cum', n: 16 },
  ]
  return (
    <div className={`w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200/80 ${className}`}>
      <div className="flex items-center gap-3">
        <Avatar initials="DA" size="sm" />
        <div>
          <p className="text-sm font-semibold text-slate-900">İlk seansını planla</p>
          <p className="text-xs text-slate-500">Online görüşme, 50 dakika</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-5 gap-2 text-center">
        {days.map((day, i) => (
          <div key={day.n} className={`rounded-xl py-2 ${i === 2 ? 'bg-pine-800 text-white' : 'bg-slate-50 text-slate-700'}`}>
            <p className="text-[11px] opacity-75">{day.d}</p>
            <p className="font-display text-base font-semibold">{day.n}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        {['18.00', '19.00', '20.30'].map((t, i) => (
          <span
            key={t}
            className={`rounded-xl border py-2 text-center font-medium ${i === 1 ? 'animate-soft-pulse border-pine-600 bg-pine-50 text-pine-900' : 'border-slate-200 text-slate-700'}`}
          >
            {t}
          </span>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">Ödemeden önce toplam ücreti görürsün.</p>
    </div>
  )
}

/** Platform içi mesajlaşma */
export function ChatMock({ className = '' }: { className?: string }) {
  const messages = [
    { me: false, text: 'Merhaba, ilk görüşmemiz için hazır mısın?', delay: '0s' },
    { me: true, text: 'Biraz gerginim ama evet, hazırım.', delay: '1.4s' },
    { me: false, text: 'Bu çok doğal. Acele etmeden başlarız.', delay: '2.8s' },
  ]
  return (
    <div className={`w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200/80 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <Avatar initials="DA" size="sm" />
          <p className="text-sm font-semibold text-slate-900">Deniz A.</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">{Icons.shield}Şifreli bağlantı</span>
      </div>
      <div className="mt-4 space-y-2.5">
        {messages.map((m) => (
          <div key={m.text} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
            <p
              className={`bubble max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-6 ${m.me ? 'rounded-br-md bg-pine-800 text-white' : 'rounded-bl-md bg-slate-100 text-slate-800'}`}
              style={vars({ '--bubble-delay': m.delay })}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Konu seçici kartının küçük versiyonu (adım vitrini için) */
export function TopicPickerMock({ className = '' }: { className?: string }) {
  const topics = ['Kaygı ve stres', 'İlişki ve aile', 'Özgüven', 'Tükenmişlik', 'Henüz adını koyamadım']
  return (
    <div className={`w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200/80 ${className}`}>
      <p className="font-display text-lg font-semibold text-slate-900">Şu sıralar seni en çok ne yoruyor?</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {topics.map((t, i) => (
          <span
            key={t}
            className={`rounded-full border px-3.5 py-2 text-sm ${i === 0 ? 'border-pine-600 bg-pine-50 font-semibold text-pine-900' : 'border-slate-200 text-slate-700'}`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/3 rounded-full bg-pine-600" />
      </div>
      <p className="mt-2 text-xs text-slate-500">1 / 3 adım, yaklaşık 3 dakika</p>
    </div>
  )
}

/** Saat defteri özeti (psikologlara yönelik) */
export function LogbookMock({ className = '' }: { className?: string }) {
  const rows = [
    ['12 Eki', 'Şema Terapi', '50 dk'],
    ['28 Eyl', 'Şema Terapi', '50 dk'],
    ['14 Eyl', 'BDT', '50 dk'],
  ]
  return (
    <div className={`w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200/80 ${className}`}>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-lilac-700">Saat defteri</p>
          <p className="mt-1 font-display text-3xl font-semibold text-slate-900">24,5 saat</p>
        </div>
        <Chip tone="lilac" icon={Icons.people}>Süpervizyonlu Uzman</Chip>
      </div>
      <ul className="mt-4 divide-y divide-slate-100 text-sm">
        {rows.map(([d, a, m]) => (
          <li key={d} className="flex items-center justify-between py-2.5 text-slate-700">
            <span className="w-16 text-slate-500">{d}</span>
            <span className="flex-1">{a}</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700"><Check />{m}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Bağ çizgisi: logodaki iç içe geçen M formundan türetilmiş, kendini çizen eğri */
export function ThreadLine({ className = '', d, length = 1200 }: { className?: string; d: string; length?: number }) {
  return (
    <svg aria-hidden="true" className={`pointer-events-none ${className}`} fill="none" preserveAspectRatio="none">
      <defs>
        <linearGradient id="mindora-thread" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b6a6dd" />
          <stop offset="100%" stopColor="#8fd4bd" />
        </linearGradient>
      </defs>
      <path d={d} className="thread-line" stroke="url(#mindora-thread)" strokeWidth="3" strokeLinecap="round" style={vars({ '--line-length': String(length) })} />
    </svg>
  )
}

export function SampleCaption({ className = '' }: { className?: string }) {
  return <p className={`text-xs text-slate-400 ${className}`}>Örnek arayüz. İsimler temsilidir.</p>
}
