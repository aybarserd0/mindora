import type { CSSProperties, ReactNode } from 'react'
import { Avatar, Chip, Icons } from './Mocks'

// Diyetisyen ve antrenör sayfaları ile ana sayfa için konuya özel ekran kurguları.
// İçerikler örnektir; tıbbi iddia ya da sonuç vaadi içermez.

const vars = (v: Record<string, string>) => v as CSSProperties

function Tick({ delay }: { delay: string }) {
  return (
    <span className="tick-in flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pine-100 text-pine-800" style={vars({ '--tick-delay': delay })}>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
      </svg>
    </span>
  )
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200/80 ${className}`}>{children}</div>
}

/** Diyetisyenin paylaştığı haftalık beslenme planı */
export function MealPlanMock({ className = '' }: { className?: string }) {
  const meals = [
    ['Kahvaltı', 'Yulaf, yoğurt, mevsim meyvesi'],
    ['Öğle', 'Mercimek çorbası, bol salata'],
    ['Ara öğün', 'Bir avuç çiğ badem'],
    ['Akşam', 'Izgara tavuk, bulgur pilavı'],
  ]
  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar initials="EK" size="sm" tone="pine" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Bu haftaki planın</p>
            <p className="text-xs text-slate-500">Dyt. Elif K. paylaştı</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Örnek</span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1.5 text-center text-[11px] font-semibold">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum'].map((d, i) => (
          <span key={d} className={`rounded-lg py-1.5 ${i === 1 ? 'bg-pine-800 text-white' : 'bg-slate-50 text-slate-500'}`}>{d}</span>
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {meals.map(([meal, food], i) => (
          <li key={meal} className="bubble flex items-start gap-3 rounded-2xl bg-slate-50 px-3.5 py-2.5" style={vars({ '--bubble-delay': `${i * 0.7}s` })}>
            <span className="mt-0.5 w-16 shrink-0 text-xs font-semibold text-pine-800">{meal}</span>
            <span className="text-sm leading-5 text-slate-700">{food}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-xs text-slate-500">Plan, kontrol görüşmelerinde birlikte güncellenir.</p>
    </Card>
  )
}

/** Diyetisyenle haftalık kontrol: alışkanlık hedefleri (kilo değil) */
export function CheckInMock({ className = '' }: { className?: string }) {
  const goals = [
    ['Günde 8 bardak su', 6, 7],
    ['Her öğünde sebze', 5, 7],
    ['Akşam 21:00 sonrası atıştırmamak', 4, 7],
  ] as const
  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Haftalık kontrol</p>
        <Chip icon={Icons.calendar}>Perşembe 19:00</Chip>
      </div>
      <ul className="mt-5 space-y-4">
        {goals.map(([goal, done, total], i) => (
          <li key={goal}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-slate-700">{goal}</span>
              <span className="shrink-0 font-semibold text-slate-900">{done}/{total} gün</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="fill-bar h-full rounded-full bg-pine-600" style={{ width: `${(done / total) * 100}%`, ...vars({ '--fill-delay': `${i * 0.5}s` }) }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="bubble mt-5 rounded-2xl rounded-bl-md bg-lilac-50 px-3.5 py-2.5 text-sm leading-6 text-slate-700" style={vars({ '--bubble-delay': '2s' })}>
        Su hedefin çok iyi gidiyor. Bu hafta akşamları için birlikte bir plan yapalım.
      </div>
    </Card>
  )
}

/** Antrenörün hazırladığı salon / ev programı */
export function WorkoutMock({ className = '', place = 'salon' }: { className?: string; place?: 'salon' | 'ev' }) {
  const salon = [
    ['Goblet squat', '3 × 10'],
    ['Lat pulldown', '3 × 12'],
    ['Dumbbell omuz press', '3 × 10'],
    ['Plank', '3 × 40 sn'],
  ]
  const ev = [
    ['Sandalyeye squat', '3 × 12'],
    ['Duvarda şınav', '3 × 10'],
    ['Glute bridge', '3 × 15'],
    ['Plank', '3 × 30 sn'],
  ]
  const rows = place === 'salon' ? salon : ev
  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar initials="MA" size="sm" />
          <div>
            <p className="text-sm font-semibold text-slate-900">A günü · Tüm vücut</p>
            <p className="text-xs text-slate-500">Mert A. hazırladı</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-0.5 rounded-full bg-slate-100 p-0.5 text-[11px] font-semibold">
          <span className={`rounded-full px-2.5 py-1 ${place === 'salon' ? 'bg-white text-pine-900 shadow-sm' : 'text-slate-500'}`}>Salon</span>
          <span className={`rounded-full px-2.5 py-1 ${place === 'ev' ? 'bg-white text-pine-900 shadow-sm' : 'text-slate-500'}`}>Ev</span>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-slate-100">
        {rows.map(([move, sets], i) => (
          <li key={move} className="flex items-center gap-3 py-2.5">
            <Tick delay={`${0.6 + i * 0.8}s`} />
            <span className="flex-1 text-sm text-slate-800">{move}</span>
            <span className="text-sm font-semibold text-slate-900">{sets}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-xs text-slate-500">Isınma 8 dk · Program seviyene göre ayarlanır</p>
    </Card>
  )
}

/** Görüntülü antrenmanda form düzeltme */
export function FormCheckMock({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 p-3 shadow-xl ${className}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[radial-gradient(120%_90%_at_30%_20%,#2f5a4d_0%,#1b2420_60%)]">
        {/* Hareket eden basit figür: squat */}
        <svg aria-hidden="true" viewBox="0 0 200 150" className="absolute inset-0 h-full w-full">
          <g stroke="rgb(255 255 255 / 0.85)" strokeWidth="4" strokeLinecap="round" fill="none" className="animate-drift" style={vars({ '--tilt': '0deg' })}>
            <circle cx="100" cy="40" r="10" />
            <path d="M100 50 L100 85 M100 60 L80 75 M100 60 L120 75 M100 85 L85 110 L88 132 M100 85 L115 110 L112 132" />
          </g>
          <path d="M70 134 H130" stroke="rgb(255 255 255 / 0.25)" strokeWidth="2" />
        </svg>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white">
          <span className="animate-soft-pulse h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Canlı antrenman · 24:10
        </span>
        <div className="absolute bottom-3 right-3 h-16 w-12 overflow-hidden rounded-lg bg-slate-700 ring-2 ring-white/20">
          <div className="flex h-full items-center justify-center text-[10px] font-semibold text-white/70">Mert</div>
        </div>
        <p className="bubble absolute bottom-3 left-3 max-w-[70%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-xs leading-5 text-slate-800" style={vars({ '--bubble-delay': '1s' })}>
          Dizlerini ayak uçlarınla aynı yöne aç, sırtın dik kalsın.
        </p>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3 text-white/70">
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs">Kamera</span>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs">Mikrofon</span>
        <span className="rounded-full bg-rose-500/80 px-3 py-1.5 text-xs text-white">Bitir</span>
      </div>
    </div>
  )
}

/** Ana sayfa: üç hizmetin tek platformda buluştuğu kompozisyon */
export function ThreeServicesMock({ className = '' }: { className?: string }) {
  const cards = [
    {
      key: 'psychologist',
      label: 'Psikolog',
      tone: 'lilac' as const,
      icon: Icons.people,
      body: (
        <p className="bubble rounded-2xl rounded-bl-md bg-slate-100 px-3 py-2 text-sm leading-5 text-slate-700" style={vars({ '--bubble-delay': '0.4s' })}>
          Bu hafta nasıl geçti, biraz anlatır mısın?
        </p>
      ),
      pos: 'left-0 top-0 sm:-left-4',
      tilt: '-2deg',
      delay: '0s',
    },
    {
      key: 'dietitian',
      label: 'Diyetisyen',
      tone: 'pine' as const,
      icon: Icons.spark,
      body: (
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-3"><span className="text-slate-500">Öğle</span><span className="font-medium text-slate-800">Mercimek, salata</span></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500">Su</span><span className="font-medium text-slate-800">6/8 bardak</span></div>
        </div>
      ),
      pos: 'right-0 top-1/3 sm:-right-4',
      tilt: '2deg',
      delay: '1.2s',
    },
    {
      key: 'trainer',
      label: 'Kişisel antrenör',
      tone: 'pine' as const,
      icon: Icons.calendar,
      body: (
        <div className="flex items-center gap-2 text-sm">
          <Tick delay="1.4s" />
          <span className="flex-1 text-slate-800">Goblet squat</span>
          <span className="font-semibold text-slate-900">3 × 10</span>
        </div>
      ),
      pos: 'bottom-0 left-4 sm:left-10',
      tilt: '-1deg',
      delay: '2.2s',
    },
  ]
  return (
    <div className={`relative h-[460px] w-full max-w-xl sm:h-[500px] ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 560 500" className="pointer-events-none absolute inset-0 h-full w-full" fill="none" preserveAspectRatio="none">
        <path d="M120 90 C 260 120, 300 220, 440 210 M440 230 C 380 330, 260 340, 200 410" stroke="url(#three-line)" strokeWidth="3" strokeLinecap="round" className="thread-line autoplay" style={vars({ '--line-length': '900' })} />
        <defs>
          <linearGradient id="three-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b6a6dd" />
            <stop offset="100%" stopColor="#8fd4bd" />
          </linearGradient>
        </defs>
      </svg>
      {cards.map((c) => (
        <div key={c.key} className={`animate-drift absolute w-[78%] max-w-[300px] ${c.pos}`} style={vars({ '--tilt': c.tilt, '--drift-delay': c.delay })}>
          <div className="rounded-3xl bg-white p-4 shadow-xl ring-1 ring-slate-200/80">
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${c.tone === 'lilac' ? 'bg-lilac-100 text-lilac-800' : 'bg-pine-100 text-pine-800'}`}>{c.icon}</span>
              <span className="text-sm font-semibold text-slate-900">{c.label}</span>
            </div>
            {c.body}
          </div>
        </div>
      ))}
      <div className="absolute right-2 top-[69%] -translate-y-1/2 sm:right-6">
        <span className="animate-soft-pulse inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-pine-800 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {Icons.shield}
          Belgesi doğrulanmış uzmanlar
        </span>
      </div>
    </div>
  )
}
