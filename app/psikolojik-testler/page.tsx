'use client'

import Header from '@/components/Header'
import { useMemo, useState } from 'react'

type TestKey = 'kaygi' | 'stres' | 'depresif' | 'ozguven'

type TestQuestion = {
  id: string
  text: string
}

type TestItem = {
  key: TestKey
  title: string
  shortTitle: string
  text: string
  audience: string
  questions: TestQuestion[]
}

type AnswerMap = Record<string, number>

type ResultLevel = {
  label: string
  description: string
  tone: string
}

const TESTS: TestItem[] = [
  {
    key: 'kaygi',
    title: 'Kaygı Farkındalık Testi',
    shortTitle: 'Kaygı',
    text: 'Yoğun düşünceler, belirsizlik, endişe ve bedensel gerginlik düzeyini fark etmene yardımcı olur.',
    audience: 'Gelecek, okul, iş veya ilişki konularında sık endişe yaşayan kişiler için.',
    questions: [
      { id: 'k1', text: 'Son günlerde zihnimi durdurmakta zorlanıyorum.' },
      { id: 'k2', text: 'Kötü bir şey olacakmış gibi gergin hissediyorum.' },
      { id: 'k3', text: 'Belirsizlik karşısında sakin kalmakta zorlanıyorum.' },
      { id: 'k4', text: 'Endişelerim günlük işlerime odaklanmamı zorlaştırıyor.' },
      { id: 'k5', text: 'Kaygı yaşadığımda bedensel belirtiler de hissediyorum.' },
      { id: 'k6', text: 'Sürekli olasılıkları düşünmek beni yoruyor.' },
    ],
  },
  {
    key: 'stres',
    title: 'Stres Farkındalık Testi',
    shortTitle: 'Stres',
    text: 'Günlük yaşam, iş, okul ve sorumluluk kaynaklı stres yükünü daha net görmene yardımcı olur.',
    audience: 'Yoğun tempo, sorumluluk baskısı veya zihinsel yorgunluk yaşayan kişiler için.',
    questions: [
      { id: 's1', text: 'Son günlerde kendimi sürekli yetişmeye çalışırken buluyorum.' },
      { id: 's2', text: 'Küçük aksaklıklar bile beni normalden fazla yoruyor.' },
      { id: 's3', text: 'Dinlensem bile zihinsel olarak toparlanmakta zorlanıyorum.' },
      { id: 's4', text: 'Sorumluluklarımın üzerimde baskı oluşturduğunu hissediyorum.' },
      { id: 's5', text: 'Gün içinde sık sık gergin veya sabırsız oluyorum.' },
      { id: 's6', text: 'Stresim uyku, iştah veya enerjimi etkiliyor.' },
    ],
  },
  {
    key: 'depresif',
    title: 'Depresif Duygu Durumu Testi',
    shortTitle: 'Ruh hali',
    text: 'Enerji, motivasyon, keyif alma ve ruh hali değişimlerini fark etmene yardımcı olur.',
    audience: 'Son dönemde isteksizlik, yorgunluk veya keyifsizlik yaşayan kişiler için.',
    questions: [
      { id: 'd1', text: 'Eskiden keyif aldığım şeylere karşı ilgim azaldı.' },
      { id: 'd2', text: 'Günlük işleri başlatmakta zorlanıyorum.' },
      { id: 'd3', text: 'Kendimi sık sık yorgun veya isteksiz hissediyorum.' },
      { id: 'd4', text: 'Ruh halim gün içinde belirgin şekilde düşebiliyor.' },
      { id: 'd5', text: 'Kendime karşı daha eleştirel veya umutsuz hissediyorum.' },
      { id: 'd6', text: 'Uyku veya iştah düzenimde değişiklik fark ediyorum.' },
    ],
  },
  {
    key: 'ozguven',
    title: 'Özgüven Farkındalık Testi',
    shortTitle: 'Özgüven',
    text: 'Kendini ifade etme, karar alma, sınır koyma ve öz değerlendirme alanlarında farkındalık sağlar.',
    audience: 'Kendini ifade etmekte, karar vermekte veya sınır koymakta zorlanan kişiler için.',
    questions: [
      { id: 'o1', text: 'Fikirlerimi açıkça ifade etmekte zorlanıyorum.' },
      { id: 'o2', text: 'Karar verirken başkalarının onayına fazla ihtiyaç duyuyorum.' },
      { id: 'o3', text: 'Hata yapma ihtimali beni denemekten alıkoyabiliyor.' },
      { id: 'o4', text: 'Sınır koymam gerektiğinde suçluluk hissediyorum.' },
      { id: 'o5', text: 'Kendimi başkalarıyla sık sık kıyaslıyorum.' },
      { id: 'o6', text: 'Başarılarımı yeterince değerli görmediğim oluyor.' },
    ],
  },
]

const OPTIONS = [
  { label: 'Hiç', value: 0 },
  { label: 'Nadiren', value: 1 },
  { label: 'Bazen', value: 2 },
  { label: 'Sık sık', value: 3 },
]

const NOTES = [
  'Bu testler tanı koymaz.',
  'Sonuçlar yalnızca farkındalık amacı taşır.',
  'Acil kriz durumlarında 112 ile iletişime geçilmelidir.',
]

function getResult(score: number, maxScore: number): ResultLevel {
  const ratio = maxScore === 0 ? 0 : score / maxScore

  if (ratio < 0.34) {
    return {
      label: 'Düşük düzey farkındalık sinyali',
      description:
        'Yanıtların bu alanda şu an düşük düzeyde belirti yaşadığını düşündürüyor. Yine de tekrar eden zorlanmalar varsa destek almak faydalı olabilir.',
      tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    }
  }

  if (ratio < 0.67) {
    return {
      label: 'Orta düzey farkındalık sinyali',
      description:
        'Yanıtların bu alanda zaman zaman zorlanma yaşayabileceğini gösteriyor. Günlük yaşamını etkileyen durumlar için bir uzmanla görüşmek iyi bir başlangıç olabilir.',
      tone: 'bg-amber-50 text-amber-800 ring-amber-200',
    }
  }

  return {
    label: 'Yüksek düzey farkındalık sinyali',
    description:
      'Yanıtların bu alanda belirgin zorlanmalar yaşayabileceğini düşündürüyor. Bu sonuç tanı değildir; ancak bir uzmanla görüşerek ihtiyacını değerlendirmek önemlidir.',
    tone: 'bg-rose-50 text-rose-800 ring-rose-200',
  }
}

export default function PsikolojikTestler() {
  const [activeKey, setActiveKey] = useState<TestKey>('kaygi')
  const [answers, setAnswers] = useState<Record<TestKey, AnswerMap>>({
    kaygi: {},
    stres: {},
    depresif: {},
    ozguven: {},
  })
  const [showResult, setShowResult] = useState(false)

  const activeTest = useMemo(
    () => TESTS.find((test) => test.key === activeKey) || TESTS[0],
    [activeKey],
  )

  const activeAnswers = answers[activeKey] || {}
  const answeredCount = activeTest.questions.filter(
    (question) => activeAnswers[question.id] !== undefined,
  ).length
  const totalQuestions = activeTest.questions.length
  const progress = Math.round((answeredCount / totalQuestions) * 100)
  const score = Object.values(activeAnswers).reduce((total, value) => total + value, 0)
  const maxScore = totalQuestions * 3
  const result = getResult(score, maxScore)
  const isComplete = answeredCount === totalQuestions

  function selectTest(key: TestKey) {
    setActiveKey(key)
    setShowResult(false)
  }

  function setAnswer(questionId: string, value: number) {
    setAnswers((current) => ({
      ...current,
      [activeKey]: {
        ...current[activeKey],
        [questionId]: value,
      },
    }))
  }

  function resetActiveTest() {
    setAnswers((current) => ({
      ...current,
      [activeKey]: {},
    }))
    setShowResult(false)
  }

  return (
    <main className="min-h-screen bg-[#f7f2eb] text-[#171717]">
      <Header />

      <section className="mx-auto max-w-7xl px-5 pb-14 pt-16 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
            Psikolojik Testler
          </p>

          <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Kendini daha iyi anlamak için kısa farkındalık testleri.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            Mindora testleri, destek ihtiyacını daha net fark etmene yardımcı
            olmak için hazırlanır. Sonuçlar tanı koymaz; farkındalık ve doğru
            destek sürecine yönlendirme amacı taşır.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {NOTES.map((note) => (
              <span
                key={note}
                className="rounded-full bg-white/75 px-4 py-2 text-sm font-bold text-neutral-700 shadow-sm ring-1 ring-black/5"
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid gap-4 md:grid-cols-4">
          {TESTS.map((test) => {
            const isActive = test.key === activeKey

            return (
              <button
                key={test.key}
                type="button"
                onClick={() => selectTest(test.key)}
                className={`rounded-[1.5rem] p-5 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 ${
                  isActive
                    ? 'bg-black text-white ring-black'
                    : 'bg-white/75 text-black ring-black/5 hover:bg-white'
                }`}
              >
                <p
                  className={`text-xs font-black uppercase tracking-[0.2em] ${
                    isActive ? 'text-neutral-300' : 'text-neutral-500'
                  }`}
                >
                  Aktif test
                </p>
                <h2 className="mt-3 text-xl font-black">{test.shortTitle}</h2>
                <p
                  className={`mt-2 text-sm leading-6 ${
                    isActive ? 'text-neutral-300' : 'text-neutral-600'
                  }`}
                >
                  {test.text}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="h-fit rounded-[2rem] bg-white/80 p-7 shadow-sm ring-1 ring-black/5 lg:sticky lg:top-24">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
            Seçili test
          </p>
          <h2 className="mt-3 text-3xl font-black">{activeTest.title}</h2>
          <p className="mt-4 leading-7 text-neutral-600">{activeTest.audience}</p>

          <div className="mt-6 rounded-3xl bg-[#f7f2eb] p-5">
            <div className="flex items-center justify-between text-sm font-black">
              <span>İlerleme</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-black transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-bold text-neutral-600">
              {answeredCount}/{totalQuestions} soru tamamlandı
            </p>
          </div>

          <div className="mt-6 rounded-3xl bg-black p-5 text-white">
            <p className="font-black">Önemli not</p>
            <p className="mt-2 text-sm leading-6 text-neutral-300">
              Bu test tıbbi/klinik tanı koymaz. Sonuçların seni düşündürüyorsa
              bir uzmanla görüşerek durumunu değerlendirebilirsin.
            </p>
          </div>
        </aside>

        <div className="rounded-[2rem] bg-white/80 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-black/10 pb-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
                Test soruları
              </p>
              <h2 className="mt-2 text-3xl font-black">{activeTest.title}</h2>
            </div>

            <button
              type="button"
              onClick={resetActiveTest}
              className="rounded-2xl border border-black/10 bg-[#f7f2eb] px-5 py-3 text-sm font-black text-black transition hover:bg-white"
            >
              Testi sıfırla
            </button>
          </div>

          <div className="mt-8 space-y-5">
            {activeTest.questions.map((question, index) => (
              <div key={question.id} className="rounded-3xl bg-[#f7f2eb] p-5">
                <p className="font-black">
                  {index + 1}. {question.text}
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  {OPTIONS.map((option) => {
                    const selected = activeAnswers[question.id] === option.value

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAnswer(question.id, option.value)}
                        className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                          selected
                            ? 'bg-black text-white'
                            : 'bg-white text-neutral-700 ring-1 ring-black/5 hover:bg-neutral-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={!isComplete}
              onClick={() => setShowResult(true)}
              className="rounded-2xl bg-black px-8 py-4 font-black text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
            >
              Sonucumu göster
            </button>

            <a
              href="/eslesme"
              className="rounded-2xl border border-black/10 bg-white px-8 py-4 text-center font-black text-black transition hover:bg-neutral-50"
            >
              Uzmanla değerlendirmek istiyorum
            </a>
          </div>

          {!isComplete ? (
            <p className="mt-4 text-sm font-bold text-neutral-500">
              Sonucu görmek için tüm soruları yanıtla.
            </p>
          ) : null}

          {showResult ? (
            <div className="mt-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
                Test sonucu
              </p>

              <div className={`mt-4 rounded-3xl p-5 ring-1 ${result.tone}`}>
                <h3 className="text-2xl font-black">{result.label}</h3>
                <p className="mt-3 leading-7">{result.description}</p>
                <p className="mt-4 text-sm font-black">
                  Puan: {score}/{maxScore}
                </p>
              </div>

              <div className="mt-6 rounded-3xl bg-[#f7f2eb] p-5">
                <h4 className="text-xl font-black">Sonraki adım ne olabilir?</h4>
                <p className="mt-3 leading-7 text-neutral-600">
                  Sonucunu tek başına yorumlamak yerine, destek ihtiyacını bir
                  uzmanla değerlendirmek daha sağlıklı olur. Mindora ön eşleşme
                  formu ücretsizdir ve seans satın alma zorunluluğu oluşturmaz.
                </p>

                <a
                  href="/eslesme"
                  className="mt-5 inline-block rounded-2xl bg-black px-7 py-3 font-black text-white transition hover:bg-neutral-800"
                >
                  Ücretsiz ön eşleşme başlat
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 rounded-[2rem] bg-black p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-400">
              Testten sonra ne olacak?
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Sonuca göre değil, ihtiyacına göre destek planlanır.
            </h2>
          </div>

          <div>
            <p className="text-lg leading-8 text-neutral-300">
              Testler yalnızca farkındalık sağlar. Asıl eşleşme; destek almak
              istediğin konu, uzman tercihin, uygun zamanın ve beklentin
              değerlendirilerek yapılır.
            </p>

            <a
              href="/eslesme"
              className="mt-8 inline-block rounded-2xl bg-white px-9 py-4 font-black text-black transition hover:-translate-y-0.5 hover:bg-neutral-200"
            >
              Ücretsiz ön eşleşme başlat
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
