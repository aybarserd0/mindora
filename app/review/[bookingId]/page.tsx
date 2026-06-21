'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'

type SubmitState = {
  status: 'idle' | 'submitting' | 'success' | 'error'
  message: string
}

const MAX_REVIEW_LENGTH = 1200
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeBookingId(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  const text = toText(raw)

  return UUID_REGEX.test(text) ? text : ''
}

function normalizeInitialRating(value: string | null) {
  const rating = Number(value)

  if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
    return rating
  }

  return 0
}

function cleanReviewText(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim()
}

function ratingLabel(rating: number) {
  if (rating === 5) return 'Çok iyi'
  if (rating === 4) return 'İyi'
  if (rating === 3) return 'Orta'
  if (rating === 2) return 'Geliştirilebilir'
  if (rating === 1) return 'Memnun kalmadım'

  return 'Puan seçilmedi'
}

export default function ReviewBookingPage() {
  const params = useParams<{ bookingId?: string | string[] }>()
  const searchParams = useSearchParams()

  const bookingId = useMemo(() => normalizeBookingId(params?.bookingId), [params])
  const initialRating = useMemo(
    () => normalizeInitialRating(searchParams.get('rating')),
    [searchParams]
  )

  const [rating, setRating] = useState(initialRating)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [state, setState] = useState<SubmitState>({
    status: 'idle',
    message: '',
  })

  const safeReviewText = cleanReviewText(reviewText)
  const remaining = Math.max(0, MAX_REVIEW_LENGTH - reviewText.length)
  const selectedLabel = ratingLabel(hoverRating || rating)

  async function submitReview() {
    if (!bookingId) {
      setState({
        status: 'error',
        message: 'Geçerli değerlendirme bağlantısı bulunamadı.',
      })
      return
    }

    if (!rating || rating < 1 || rating > 5) {
      setState({
        status: 'error',
        message: 'Lütfen 1 ile 5 arasında bir puan seçin.',
      })
      return
    }

    if (reviewText.length > MAX_REVIEW_LENGTH) {
      setState({
        status: 'error',
        message: `Yorum en fazla ${MAX_REVIEW_LENGTH} karakter olabilir.`,
      })
      return
    }

    if (safeReviewText && safeReviewText.length < 3) {
      setState({
        status: 'error',
        message: 'Yorum yazacaksan en az 3 karakter olmalıdır.',
      })
      return
    }

    setState({
      status: 'submitting',
      message: 'Değerlendirmeniz gönderiliyor...',
    })

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          rating,
          reviewText: safeReviewText,
        }),
      })

      const payload = await response.json().catch(() => null)
      const message =
        payload && typeof payload.error === 'string'
          ? payload.error
          : payload && typeof payload.message === 'string'
            ? payload.message
            : ''

      if (!response.ok || !payload?.ok) {
        setState({
          status: 'error',
          message: message || 'Değerlendirme gönderilemedi.',
        })
        return
      }

      setState({
        status: 'success',
        message:
          message ||
          'Teşekkür ederiz. Değerlendirmeniz moderasyon sürecine gönderildi.',
      })
      setReviewText('')
    } catch {
      setState({
        status: 'error',
        message: 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.',
      })
    }
  }

  if (!bookingId) {
    return (
      <main className="min-h-screen bg-[#f7f2eb] px-4 py-12 text-neutral-950">
        <section className="mx-auto max-w-xl rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Geçersiz bağlantı</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight">
            Değerlendirme bağlantısı doğrulanamadı.
          </h1>
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            Bu bağlantı hatalı, eksik veya artık geçerli olmayabilir. Mindora
            destek ekibiyle iletişime geçebilirsiniz.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-neutral-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800"
          >
            Ana sayfaya dön
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f2eb] px-4 py-10 text-neutral-950">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[36px] border border-black/10 bg-white shadow-sm">
        <div className="bg-neutral-950 px-6 py-7 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/55">
            Mindora Değerlendirme
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
            Seans deneyiminizi değerlendirir misiniz?
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/68">
            Geri bildiriminiz, Mindora deneyimini geliştirmemize ve diğer
            danışanların daha bilinçli seçim yapmasına yardımcı olur.
          </p>
        </div>

        <div className="px-6 py-7 sm:px-8 sm:py-8">
          {state.status === 'success' ? (
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-xl font-black text-white">
                ✓
              </div>
              <h2 className="mt-5 text-xl font-black tracking-tight">
                Değerlendirmeniz alındı
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-700">
                {state.message}
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex rounded-full bg-neutral-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800"
              >
                Ana sayfaya dön
              </Link>
            </div>
          ) : (
            <div className="space-y-7">
              <div>
                <label className="text-sm font-black text-neutral-900">
                  Puanınız
                </label>
                <div
                  className="mt-4 flex items-center gap-2"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((item) => {
                    const active = item <= (hoverRating || rating)

                    return (
                      <button
                        key={item}
                        type="button"
                        onMouseEnter={() => setHoverRating(item)}
                        onFocus={() => setHoverRating(item)}
                        onBlur={() => setHoverRating(0)}
                        onClick={() => setRating(item)}
                        aria-label={`${item} yıldız`}
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-3xl transition ${
                          active
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-black/10 bg-white hover:bg-neutral-50'
                        }`}
                      >
                        {active ? '★' : '☆'}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-sm font-semibold text-neutral-600">
                  {selectedLabel}
                </p>
              </div>

              <div>
                <label
                  htmlFor="reviewText"
                  className="text-sm font-black text-neutral-900"
                >
                  Yorumunuz <span className="font-semibold text-neutral-500">(isteğe bağlı)</span>
                </label>
                <textarea
                  id="reviewText"
                  value={reviewText}
                  onChange={(event) =>
                    setReviewText(event.target.value.slice(0, MAX_REVIEW_LENGTH))
                  }
                  rows={7}
                  placeholder="Deneyiminizi kısa ve yapıcı şekilde paylaşabilirsiniz."
                  className="mt-3 w-full resize-none rounded-[24px] border border-black/10 bg-white px-4 py-4 text-sm leading-6 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950"
                />
                <div className="mt-2 flex items-center justify-between gap-4 text-xs text-neutral-500">
                  <span>
                    Yorumlar moderasyon sonrası yayınlanır. Kişisel bilgi
                    paylaşmayın.
                  </span>
                  <span>{remaining}</span>
                </div>
              </div>

              {state.message ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    state.status === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-black/10 bg-neutral-50 text-neutral-700'
                  }`}
                >
                  {state.message}
                </div>
              ) : null}

              <button
                type="button"
                disabled={state.status === 'submitting'}
                onClick={submitReview}
                className="inline-flex w-full items-center justify-center rounded-full bg-neutral-950 px-6 py-4 text-sm font-black text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {state.status === 'submitting'
                  ? 'Gönderiliyor...'
                  : 'Değerlendirmeyi gönder'}
              </button>

              <p className="text-xs leading-5 text-neutral-500">
                Mindora acil kriz hattı değildir. Kendinize veya bir başkasına
                zarar verme riski varsa lütfen 112 ile iletişime geçin ya da en
                yakın sağlık kuruluşuna başvurun.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
