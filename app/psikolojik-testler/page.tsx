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
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    }
  }

  if (ratio < 0.67) {
    return {
      label: 'Orta düzey farkındalık sinyali',
      description:
        'Yanıtların bu alanda zaman zaman zorlanma yaşayabileceğini gösteriyor. Günlük yaşamını etkileyen durumlar için bir uzmanla görüşmek iyi bir başlangıç olabilir.',
      tone: 'border-amber-200 bg-amber-50 text-amber-800',
    }
  }

  return {
    label: 'Yüksek düzey farkındalık sinyali',
    description:
      'Yanıtların bu alanda belirgin zorlanmalar yaşayabileceğini düşündürüyor. Bu sonuç tanı değildir; ancak bir uzmanla görüşerek ihtiyacını değerlendirmek önemlidir.',
    tone: 'border-rose-200 bg-rose-50 text-rose-800',
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <section className="mx-auto max-w-7xl px-5 pb-14 pt-16 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Psikolojik Testler
          </p>

          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
            Kendini daha iyi anlamak için kısa farkındalık testleri.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-500">
            Mindora testleri, destek ihtiyacını daha net fark etmene yardımcı
            olmak için hazırlanır. Sonuçlar tanı koymaz; farkındalık ve doğru
            destek sürecine yönlendirme amacı taşır.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {NOTES.map((note) => (
              <span
                key={note}
                className="rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm"
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid gap-4 md:grid-cols-4">
          {TESTS.map((test, index) => {
            const isActive = test.key === activeKey

            return (
              <button
                key={test.key}
                type="button"
                onClick={() => selectTest(test.key)}
                style={{ animationDelay: `${index * 60}ms` }}
                className={`animate-fade-in-up rounded-xl border p-5 text-left shadow-sm transition-all duration-200 ease-out ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200/80 bg-white text-slate-900 hover:border-slate-300'
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    isActive ? 'text-slate-400' : 'text-slate-400'
                  }`}
                >
                  Aktif test
                </p>
                <h2 className="mt-3 text-lg font-bold">{test.shortTitle}</h2>
                <p
                  className={`mt-2 text-sm leading-6 ${
                    isActive ? 'text-slate-300' : 'text-slate-500'
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
        <aside className="h-fit rounded-xl border border-slate-200/80 bg-white p-7 shadow-sm lg:sticky lg:top-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Seçili test
          </p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">{activeTest.title}</h2>
          <p className="mt-4 leading-7 text-slate-500">{activeTest.audience}</p>

          <div className="mt-6 rounded-lg border border-slate-200/80 bg-slate-50 p-5">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>İlerleme</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-slate-900 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-500">
              {answeredCount}/{totalQuestions} soru tamamlandı
            </p>
          </div>

          <div className="mt-6 rounded-lg bg-slate-900 p-5 text-white">
            <p className="font-semibold">Önemli not</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Bu test tıbbi/klinik tanı koymaz. Sonuçların seni düşündürüyorsa
              bir uzmanla görüşerek durumunu değerlendirebilirsin.
            </p>
          </div>
        </aside>

        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Test soruları
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">{activeTest.title}</h2>
            </div>

            <button
              type="button"
              onClick={resetActiveTest}
              className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900"
            >
              Testi sıfırla
            </button>
          </div>

          <div className="mt-8 space-y-5">
            {activeTest.questions.map((question, index) => (
              <div
                key={question.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className="animate-fade-in-up rounded-lg border border-slate-200/80 bg-slate-50 p-5"
              >
                <p className="font-semibold text-slate-900">
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
                        className={`rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ease-out ${
                          selected
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200/80 bg-white text-slate-700 hover:border-slate-300'
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
              className="rounded-lg bg-slate-900 px-8 py-4 font-semibold text-white transition-all duration-200 ease-out hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Sonucumu göster
            </button>

            <a
              href="/eslesme"
              className="rounded-lg border border-slate-200 bg-white px-8 py-4 text-center font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900"
            >
              Uzmanla değerlendirmek istiyorum
            </a>
          </div>

          {!isComplete ? (
            <p className="mt-4 text-sm font-medium text-slate-400">
              Sonucu görmek için tüm soruları yanıtla.
            </p>
          ) : null}

          {showResult ? (
            <div className="animate-fade-in-up mt-8 rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Test sonucu
              </p>

              <div className={`mt-4 rounded-lg border p-5 ${result.tone}`}>
                <h3 className="text-xl font-bold">{result.label}</h3>
                <p className="mt-3 leading-7">{result.description}</p>
                <p className="mt-4 text-sm font-semibold">
                  Puan: {score}/{maxScore}
                </p>
              </div>

              <div className="mt-6 rounded-lg border border-slate-200/80 bg-slate-50 p-5">
                <h4 className="text-lg font-bold text-slate-900">Sonraki adım ne olabilir?</h4>
                <p className="mt-3 leading-7 text-slate-500">
                  Sonucunu tek başına yorumlamak yerine, destek ihtiyacını bir
                  uzmanla değerlendirmek daha sağlıklı olur. Mindora ön eşleşme
                  formu ücretsizdir ve seans satın alma zorunluluğu oluşturmaz.
                </p>

                <a
                  href="/eslesme"
                  className="mt-5 inline-block rounded-lg bg-slate-900 px-7 py-3 font-semibold text-white transition-all duration-200 ease-out hover:bg-slate-800"
                >
                  Ücretsiz ön eşleşme başlat
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 rounded-xl bg-slate-900 p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Testten sonra ne olacak?
            </p>

            <h2 className="mt-4 text-3xl font-bold md:text-4xl">
              Sonuca göre değil, ihtiyacına göre destek planlanır.
            </h2>
          </div>

          <div>
            <p className="text-lg leading-8 text-slate-300">
              Testler yalnızca farkındalık sağlar. Asıl eşleşme; destek almak
              istediğin konu, uzman tercihin, uygun zamanın ve beklentin
              değerlendirilerek yapılır.
            </p>

            <a
              href="/eslesme"
              className="mt-8 inline-block rounded-lg bg-white px-9 py-4 font-semibold text-slate-900 transition-all duration-200 ease-out hover:bg-slate-100"
            >
              Ücretsiz ön eşleşme başlat
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
