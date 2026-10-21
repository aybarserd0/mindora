// Vaka kartlarındaki serbest metinlerde kişiyi tanımlayabilecek ifadeleri
// yakalayan kural tabanlı tarama. Kesin koruma değildir; psikoloğun gözden
// kaçırabileceği bariz bilgileri işaretlemek için vardır. Hem tarayıcıda hem
// sunucuda aynı kurallar çalışır.

export type PiiFinding = {
  type: 'email' | 'phone' | 'tckn' | 'iban' | 'url' | 'handle' | 'name' | 'date'
  match: string
  label: string
}

const LABELS: Record<PiiFinding['type'], string> = {
  email: 'E-posta adresi',
  phone: 'Telefon numarası',
  tckn: 'T.C. kimlik numarası olabilir',
  iban: 'IBAN',
  url: 'Web adresi',
  handle: 'Sosyal medya kullanıcı adı',
  name: 'Kişi adı olabilir',
  date: 'Tam tarih (doğum tarihi olabilir)',
}

// Yaygın Türkçe adlar. Büyük harfle başlayan ve bu listede olan kelimeler işaretlenir.
const COMMON_NAMES = new Set(
  `ahmet mehmet mustafa ali hüseyin hasan ibrahim ismail osman yusuf murat ömer
  ramazan halil süleyman abdullah mahmut recep salih fatih kadir emre hakan adem
  kemal yaşar bayram burak serkan metin cengiz orhan erkan ercan volkan uğur
  onur cem can kaan berk baran eren emir mert deniz arda efe yiğit alp kerem
  furkan enes oğuz tolga sinan selim tarık umut yunus zafer gökhan erdem barış
  fatma ayşe emine hatice zeynep elif meryem şerife sultan zehra hanife merve
  özlem yasemin hülya esra leyla gül songül derya sevgi ebru büşra tuğba gamze
  dilek sibel melek nur seda aslı ceren damla ece irem buse pınar gizem cansu
  sena ezgi ilayda nisa defne asya azra duru eylül ela beren melis selin şeyma
  kübra rabia hande burcu didem filiz aysel nermin nazlı naz yeliz tuba gülşen`
    .split(/\s+/)
    .filter(Boolean)
)

const PATTERNS: Array<{ type: PiiFinding['type']; regex: RegExp }> = [
  { type: 'email', regex: /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[a-z]{2,}/giu },
  { type: 'iban', regex: /\bTR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/gi },
  { type: 'url', regex: /\b(?:https?:\/\/|www\.)\S+/gi },
  { type: 'phone', regex: /(?:\+?90[\s-]?)?\(?0?5\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g },
  { type: 'tckn', regex: /\b[1-9]\d{10}\b/g },
  { type: 'handle', regex: /(?:^|\s)@[a-z0-9_.]{3,}/gi },
  { type: 'date', regex: /\b(?:0?[1-9]|[12]\d|3[01])[./-](?:0?[1-9]|1[0-2])[./-](?:19|20)\d{2}\b/g },
]

export function scanForPii(text: string | null | undefined): PiiFinding[] {
  if (!text) return []

  const findings: PiiFinding[] = []
  const seen = new Set<string>()

  const push = (type: PiiFinding['type'], match: string) => {
    const key = `${type}:${match.trim().toLocaleLowerCase('tr')}`
    if (seen.has(key)) return
    seen.add(key)
    findings.push({ type, match: match.trim(), label: LABELS[type] })
  }

  for (const { type, regex } of PATTERNS) {
    for (const m of text.matchAll(regex)) push(type, m[0])
  }

  // Cümle başı olmayan, büyük harfle başlayan ve yaygın ad listesinde olan kelimeler
  const words = text.split(/(\s+)/)
  let sentenceStart = true
  for (const token of words) {
    if (/^\s+$/.test(token)) continue
    const clean = token.replace(/[^\p{L}]/gu, '')
    const isCapitalized = clean.length > 1 && clean[0] === clean[0].toLocaleUpperCase('tr') && clean[0] !== clean[0].toLocaleLowerCase('tr')
    if (!sentenceStart && isCapitalized && COMMON_NAMES.has(clean.toLocaleLowerCase('tr'))) {
      push('name', clean)
    }
    sentenceStart = /[.!?]$/.test(token)
  }

  return findings
}

/** Psikoloğun "bu bir isim değil" diye onayladığı ifadeler çıkarıldıktan sonra kalan bulgular */
export function unresolvedFindings(findings: PiiFinding[], dismissed: string[]) {
  const ok = new Set(dismissed.map((d) => d.toLocaleLowerCase('tr')))
  return findings.filter((f) => !(f.type === 'name' && ok.has(f.match.toLocaleLowerCase('tr'))))
}
