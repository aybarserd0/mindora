"use client";

import Header from "@/components/Header";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SortOption = "recommended" | "rating" | "review_count" | "newest" | "price_low" | "price_high";

type Expert = {
  id: string;
  name: string;
  slug?: string | null;
  title: string | null;
  areas: string | null;
  experience: string | null;
  online: string | null;
  availability: string | null;
  photo_url: string | null;
  price?: number | string | null;
  session_price?: number | string | null;
  sessionDuration?: string | null;
  status?: string | null;
  average_rating?: number | string | null;
  review_count?: number | string | null;
  ranking_score?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ExpertsResponse = {
  ok?: boolean;
  experts?: Expert[];
  error?: string;
};

const SUPPORT_AREAS = [
  "Tümü",
  "Kaygı ve stres",
  "İlişki problemleri",
  "Özgüven",
  "Depresif duygu durumu",
  "Aile içi iletişim",
  "Sınav ve gelecek kaygısı",
  "Motivasyon eksikliği",
  "Tükenmişlik",
];

const SORT_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: "Önerilen", value: "recommended" },
  { label: "En yüksek puan", value: "rating" },
  { label: "En çok yorum", value: "review_count" },
  { label: "Yeni uzmanlar", value: "newest" },
  { label: "Ücret düşükten yükseğe", value: "price_low" },
  { label: "Ücret yüksekten düşüğe", value: "price_high" },
];

const TRUST_ITEMS = [
  {
    title: "Onaylı uzman profilleri",
    text: "Listelenen uzmanlar Mindora başvuru ve profil inceleme sürecinden sonra görünür olur.",
  },
  {
    title: "Gerçek değerlendirme altyapısı",
    text: "Yorumlar yalnızca tamamlanan seanslardan sonra alınır ve yayınlanmadan önce moderasyondan geçer.",
  },
  {
    title: "Tek yerden süreç",
    text: "Eşleşme, randevu, ödeme, mesajlaşma ve video görüşme akışı aynı platformda ilerler.",
  },
];

const PROCESS_ITEMS = [
  "Kısa ön eşleşme formunu doldur",
  "İhtiyacına uygun uzman profillerini incele",
  "Randevu, ödeme ve görüşme akışını güvenli şekilde tamamla",
];

function toText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatTitle(title: string | null) {
  const cleanTitle = toText(title, "Uzman Psikolog");
  return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0]?.charAt(0).toLocaleUpperCase("tr-TR") || "M";

  const first = parts[0]?.charAt(0) || "M";
  const last = parts[parts.length - 1]?.charAt(0) || "";

  return `${first}${last}`.toLocaleUpperCase("tr-TR");
}

function createSlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getExpertSlug(expert: Expert) {
  const slug = toText(expert.slug);
  if (slug) return slug;

  const generatedSlug = createSlug(expert.name);
  return generatedSlug || expert.id;
}

function splitAreas(areas: string | null) {
  if (!areas) return [];

  return areas
    .split(",")
    .map((area) => area.trim())
    .filter(Boolean);
}

function isPhotoUrlValid(url: string | null) {
  if (!url) return false;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeOnlineStatus(value: string | null) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) return "Online durum eşleşmede netleşir";
  if (["evet", "yes", "true", "online"].includes(normalized)) {
    return "Online görüşme yapıyor";
  }
  if (["hayır", "hayir", "no", "false"].includes(normalized)) {
    return "Online durum eşleşmede netleşir";
  }

  return value || "Eşleşmede netleşir";
}

function getPrice(expert: Expert) {
  const raw = expert.session_price ?? expert.price;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getAverageRating(expert: Expert) {
  const rating = toNumber(expert.average_rating, 0);
  if (rating < 0) return 0;
  if (rating > 5) return 5;
  return rating;
}

function getReviewCount(expert: Expert) {
  const count = Math.round(toNumber(expert.review_count, 0));
  return count > 0 ? count : 0;
}

function getRankingScore(expert: Expert) {
  const score = toNumber(expert.ranking_score, 0);
  if (score > 0) return score;

  const rating = getAverageRating(expert);
  const reviewCount = getReviewCount(expert);

  return reviewCount * 0.7 + rating * 20;
}

function getCreatedTime(expert: Expert) {
  const raw = expert.created_at || expert.updated_at;
  if (!raw) return 0;

  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatMoney(value: number | null) {
  if (!value) return "Eşleşmede netleşir";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRating(value: number) {
  if (!value) return "Yeni";
  return value.toFixed(1);
}

function getReviewLabel(count: number) {
  if (count <= 0) return "Henüz değerlendirme yok";
  return `${count} değerlendirme`;
}

function matchesSearch(expert: Expert, searchTerm: string) {
  const query = searchTerm.trim().toLocaleLowerCase("tr-TR");
  if (!query) return true;

  const searchableText = [
    expert.name,
    expert.title,
    expert.areas,
    expert.experience,
    expert.availability,
    getAverageRating(expert) ? `${getAverageRating(expert).toFixed(1)} puan` : "",
    getReviewCount(expert) ? `${getReviewCount(expert)} değerlendirme` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  return searchableText.includes(query);
}

function sortExperts(experts: Expert[], sortOption: SortOption) {
  return [...experts].sort((a, b) => {
    const aPrice = getPrice(a) ?? Number.MAX_SAFE_INTEGER;
    const bPrice = getPrice(b) ?? Number.MAX_SAFE_INTEGER;

    if (sortOption === "rating") {
      return (
        getAverageRating(b) - getAverageRating(a) ||
        getReviewCount(b) - getReviewCount(a) ||
        getRankingScore(b) - getRankingScore(a) ||
        a.name.localeCompare(b.name, "tr")
      );
    }

    if (sortOption === "review_count") {
      return (
        getReviewCount(b) - getReviewCount(a) ||
        getAverageRating(b) - getAverageRating(a) ||
        getRankingScore(b) - getRankingScore(a) ||
        a.name.localeCompare(b.name, "tr")
      );
    }

    if (sortOption === "newest") {
      return getCreatedTime(b) - getCreatedTime(a) || a.name.localeCompare(b.name, "tr");
    }

    if (sortOption === "price_low") {
      return aPrice - bPrice || getRankingScore(b) - getRankingScore(a);
    }

    if (sortOption === "price_high") {
      return bPrice - aPrice || getRankingScore(b) - getRankingScore(a);
    }

    return (
      getRankingScore(b) - getRankingScore(a) ||
      getAverageRating(b) - getAverageRating(a) ||
      getReviewCount(b) - getReviewCount(a) ||
      a.name.localeCompare(b.name, "tr")
    );
  });
}

function StarRating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  if (reviewCount <= 0 || rating <= 0) {
    return (
      <div className="inline-flex items-center justify-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-black text-neutral-600 ring-1 ring-black/5">
        Yeni uzman
      </div>
    );
  }

  const roundedRating = Math.round(rating);

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-100">
      <span aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= roundedRating ? "text-amber-400" : "text-amber-200"}>
            ★
          </span>
        ))}
      </span>
      <span>{rating.toFixed(1)}</span>
      <span className="text-amber-700/70">({reviewCount})</span>
    </div>
  );
}

export default function UzmanlarPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState("Tümü");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("recommended");

  const fetchExperts = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const res = await fetch("/api/experts", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Uzmanlar yüklenemedi. Kod: ${res.status}`);
      }

      const data = (await res.json()) as ExpertsResponse;

      if (!data.ok) {
        throw new Error(data.error || "Uzmanlar alınamadı.");
      }

      setExperts(Array.isArray(data.experts) ? data.experts : []);
    } catch (error) {
      console.error("Uzmanlar alınamadı:", error);
      setErrorMessage("Uzmanlar şu anda yüklenemedi. Lütfen biraz sonra tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadExperts() {
      if (!isActive) return;
      await fetchExperts();
    }

    loadExperts();

    return () => {
      isActive = false;
    };
  }, [fetchExperts]);

  const visibleExperts = useMemo(
    () =>
      experts.filter((expert) => {
        const status = toText(expert.status).toLowerCase();
        const isHidden = ["rejected", "passive", "inactive", "hidden"].includes(status);

        return Boolean(expert.id && expert.name?.trim() && !isHidden);
      }),
    [experts]
  );

  const filteredExperts = useMemo(() => {
    const filtered = visibleExperts.filter((expert) => {
      const expertAreas = splitAreas(expert.areas);
      const areaMatches = selectedArea === "Tümü" || expertAreas.includes(selectedArea);

      return areaMatches && matchesSearch(expert, searchTerm);
    });

    return sortExperts(filtered, sortOption);
  }, [searchTerm, selectedArea, sortOption, visibleExperts]);

  const hasFilters = selectedArea !== "Tümü" || searchTerm.trim().length > 0 || sortOption !== "recommended";
  const approvedExpertCount = visibleExperts.length;
  const reviewedExpertCount = visibleExperts.filter((expert) => getReviewCount(expert) > 0).length;
  const totalReviewCount = visibleExperts.reduce((total, expert) => total + getReviewCount(expert), 0);
  const averagePlatformRating =
    reviewedExpertCount > 0
      ? visibleExperts.reduce((total, expert) => total + getAverageRating(expert), 0) / reviewedExpertCount
      : 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f2eb] text-[#171717]">
      <Header />

      <section className="mx-auto w-full max-w-7xl px-5 pb-10 pt-12 sm:px-6 md:pb-14 md:pt-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-neutral-500">
              Mindora Uzman Ağı
            </p>

            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              Sana uygun uzmanı güvenle bul.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
              Mindora, yalnızca uzman listeleyen bir platform değil; ihtiyacını,
              uygun zamanını, beklentini ve gerçek danışan değerlendirmelerini
              birlikte dikkate alan daha güvenli bir başlangıç deneyimidir.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/eslesme"
                className="rounded-2xl bg-black px-8 py-4 text-center font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
              >
                Ücretsiz ön eşleşme başlat
              </Link>

              <Link
                href="#uzman-listesi"
                className="rounded-2xl border border-black/10 bg-white px-8 py-4 text-center font-black text-black transition hover:-translate-y-0.5 hover:bg-white/80"
              >
                Uzmanları incele
              </Link>
            </div>
          </div>

          <HeroTrustCard
            approvedExpertCount={approvedExpertCount}
            reviewedExpertCount={reviewedExpertCount}
            totalReviewCount={totalReviewCount}
            averagePlatformRating={averagePlatformRating}
          />
        </div>

        <div className="mt-12 grid gap-4 rounded-[2rem] bg-white/80 p-5 shadow-sm ring-1 ring-black/5 md:grid-cols-3 md:p-7">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="rounded-3xl bg-[#f7f2eb] p-5">
              <h2 className="text-lg font-black">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="uzman-listesi" className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 md:py-14 lg:px-8">
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-neutral-500">
              Uzmanlar
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
              Onaylı uzman profilleri.
            </h2>
          </div>

          <p className="text-base leading-7 text-neutral-600 lg:justify-self-end lg:text-right">
            Uzman seçimini kolaylaştırmak için destek konusu, uzmanlık alanı,
            ücret, görüşme tipi, uygunluk bilgisi ve doğrulanmış değerlendirme verileri birlikte gösterilir.
          </p>
        </div>

        <div className="mb-8 rounded-[2rem] border border-black/5 bg-white/95 p-4 shadow-sm md:p-5">
          <div className="grid gap-4 xl:grid-cols-[0.75fr_1.1fr_0.65fr] xl:items-start">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-neutral-700">Uzman ara</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="İsim, alan, puan veya deneyim ara..."
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-neutral-400 focus:border-black"
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-black text-neutral-700">Destek alanı</p>
              <div className="flex flex-wrap gap-2">
                {SUPPORT_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setSelectedArea(area)}
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${
                      selectedArea === area
                        ? "bg-black text-white"
                        : "bg-[#f7f2eb] text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-neutral-700">Sıralama</span>
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as SortOption)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-neutral-800 outline-none transition focus:border-black"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-black/5 pt-4 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {loading ? "Uzmanlar yükleniyor..." : `${filteredExperts.length} uzman listeleniyor`}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedArea("Tümü");
                  setSortOption("recommended");
                }}
                className="w-fit rounded-full bg-[#f7f2eb] px-4 py-2 text-xs font-black text-neutral-700 ring-1 ring-black/5 transition hover:bg-neutral-100"
              >
                Filtreleri temizle
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <ExpertSkeleton />
        ) : errorMessage ? (
          <EmptyState
            title="Uzmanlar yüklenemedi."
            text={errorMessage}
            actionLabel="Tekrar dene"
            onAction={fetchExperts}
          />
        ) : visibleExperts.length === 0 ? (
          <EmptyState
            title="Henüz onaylı uzman yok."
            text="Uzman başvuruları incelendikten sonra onaylanan profiller bu sayfada listelenecek. Bu sırada ücretsiz ön eşleşme formunu doldurabilirsin."
            href="/eslesme"
            actionLabel="Ön eşleşme başlat"
          />
        ) : filteredExperts.length === 0 ? (
          <EmptyState
            title="Bu filtreyle uzman bulunamadı."
            text="Arama kelimesini, destek alanını veya sıralama tercihini değiştirerek tekrar deneyebilirsin."
            actionLabel={hasFilters ? "Filtreleri temizle" : undefined}
            onAction={
              hasFilters
                ? () => {
                    setSearchTerm("");
                    setSelectedArea("Tümü");
                    setSortOption("recommended");
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredExperts.map((expert, index) => (
              <ExpertCard key={expert.id} expert={expert} priorityRank={index + 1} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 md:py-14 lg:px-8">
        <div className="grid gap-8 rounded-[2rem] bg-black p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-400">
              Eşleşme mantığı
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Herkes için aynı uzman değil, sana uygun başlangıç.
            </h2>
          </div>

          <div className="space-y-5 text-lg leading-8 text-neutral-300">
            <p>
              Mindora’da amaç rastgele yönlendirme yapmak değil; kişinin ihtiyacını
              anlayarak uygun uzmanla daha güvenli bir başlangıç yapmasını sağlamaktır.
            </p>

            <div className="space-y-3">
              {PROCESS_ITEMS.map((item, index) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-2xl bg-white/10 p-4 text-sm font-bold text-white"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <Link
              href="/eslesme"
              className="inline-block rounded-2xl bg-white px-7 py-3 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-neutral-200"
            >
              Eşleşme formunu doldur
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 md:py-14 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neutral-500">
            Destek alanları
          </p>

          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            Hangi konuda destek alabilirsin?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-neutral-600">
            Konunu tam tarif edemesen bile ön eşleşme formu ihtiyacını daha anlaşılır
            hale getirmek için tasarlanmıştır.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {SUPPORT_AREAS.filter((area) => area !== "Tümü").map((area) => (
            <div
              key={area}
              className="rounded-2xl bg-white/80 p-5 text-center font-bold text-neutral-700 shadow-sm ring-1 ring-black/5"
            >
              {area}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5 md:p-14">
          <h2 className="text-4xl font-black md:text-5xl">
            Sana uygun uzmanı birlikte bulalım.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Kısa formu doldur, ihtiyacına uygun psikolojik destek süreci için ücretsiz
            ön eşleşmeyi başlat.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/eslesme"
              className="rounded-2xl bg-black px-9 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Ücretsiz ön eşleşme başlat
            </Link>

            <Link
              href="/uzman-basvuru"
              className="rounded-2xl border border-black/10 bg-[#f7f2eb] px-9 py-4 font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
            >
              Uzman olarak başvur
            </Link>
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-xs leading-6 text-neutral-500">
            Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme
            riski varsa lütfen en yakın sağlık kuruluşuna başvur ya da 112 ile
            iletişime geç.
          </p>
        </div>
      </section>
    </main>
  );
}

function ExpertCard({ expert, priorityRank }: { expert: Expert; priorityRank: number }) {
  const expertAreas = splitAreas(expert.areas);
  const showPhoto = isPhotoUrlValid(expert.photo_url);
  const slug = getExpertSlug(expert);
  const profileHref = `/uzmanlar/${slug}`;
  const matchHref = `/eslesme?expert=${encodeURIComponent(slug)}`;
  const price = getPrice(expert);
  const averageRating = getAverageRating(expert);
  const reviewCount = getReviewCount(expert);
  const isTopListed = priorityRank <= 3 && getRankingScore(expert) > 0;

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md">
      <div className="p-7 text-center">
        <div className="relative mx-auto h-28 w-28">
          {showPhoto ? (
            <Image
              src={expert.photo_url || ""}
              alt={`${expert.name} profil fotoğrafı`}
              fill
              sizes="112px"
              className="rounded-full object-cover shadow-lg ring-4 ring-white"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-black text-3xl font-black text-white shadow-lg">
              {getInitials(expert.name)}
            </div>
          )}

          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f7f2eb] px-3 py-1 text-[11px] font-black text-neutral-700 ring-1 ring-black/5">
            Onaylı profil
          </span>

          {isTopListed ? (
            <span className="absolute -right-5 -top-2 rounded-full bg-black px-3 py-1 text-[11px] font-black text-white shadow-sm">
              Öne çıkan
            </span>
          ) : null}
        </div>

        <h3 className="mt-8 text-2xl font-black tracking-tight">{expert.name}</h3>

        <p className="mt-1 text-sm font-bold text-neutral-500">{formatTitle(expert.title)}</p>

        <div className="mt-4 flex justify-center">
          <StarRating rating={averageRating} reviewCount={reviewCount} />
        </div>

        <div className="mt-5 flex min-h-[2.5rem] flex-wrap justify-center gap-2">
          {expertAreas.length > 0 ? (
            <>
              {expertAreas.slice(0, 3).map((area) => (
                <span
                  key={area}
                  className="rounded-full bg-[#f7f2eb] px-3 py-1 text-xs font-bold text-neutral-700 ring-1 ring-black/5"
                >
                  {area}
                </span>
              ))}

              {expertAreas.length > 3 ? (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600 ring-1 ring-black/5">
                  +{expertAreas.length - 3}
                </span>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-neutral-500">Uzmanlık alanı eşleşmede netleşir.</p>
          )}
        </div>
      </div>

      <div className="mx-5 flex-1 rounded-3xl bg-[#f7f2eb] p-5 text-left text-sm text-neutral-700">
        <div className="grid gap-3">
          <InfoLine label="Değerlendirme" value={`${formatRating(averageRating)} · ${getReviewLabel(reviewCount)}`} />
          <InfoLine label="Deneyim" value={expert.experience || "Belirtilmedi"} />
          <InfoLine label="Görüşme" value={normalizeOnlineStatus(expert.online)} />
          <InfoLine label="Müsaitlik" value={expert.availability || "Eşleşmede netleşir"} />
          <InfoLine label="Ücret" value={formatMoney(price)} />
        </div>
      </div>

      <div className="grid gap-3 p-5 pt-6">
        <Link
          href={profileHref}
          className="rounded-2xl bg-black px-6 py-3 text-center text-sm font-black text-white transition hover:bg-neutral-800"
        >
          Profili incele
        </Link>

        <Link
          href={matchHref}
          className="rounded-2xl border border-black/10 bg-white px-6 py-3 text-center text-sm font-black text-black transition hover:bg-[#f7f2eb]"
        >
          Bu uzman için eşleşme iste
        </Link>
      </div>
    </article>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-start justify-between gap-4 border-b border-black/5 pb-3 last:border-b-0 last:pb-0">
      <b className="shrink-0 text-neutral-950">{label}</b>
      <span className="text-right text-neutral-600">{value}</span>
    </p>
  );
}

function HeroTrustCard({
  approvedExpertCount,
  reviewedExpertCount,
  totalReviewCount,
  averagePlatformRating,
}: {
  approvedExpertCount: number;
  reviewedExpertCount: number;
  totalReviewCount: number;
  averagePlatformRating: number;
}) {
  const ratingText = averagePlatformRating > 0 ? averagePlatformRating.toFixed(1) : "Yeni";
  const reviewText =
    totalReviewCount > 0
      ? `${totalReviewCount} doğrulanmış değerlendirme`
      : "İlk değerlendirmeler moderasyon sonrası yayınlanır";

  return (
    <aside className="rounded-[2.25rem] border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <div className="rounded-[1.75rem] bg-black p-6 text-white">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-white/50">
              Güvenli başlangıç
            </p>
            <p className="mt-3 text-4xl font-black tracking-tight">{ratingText}</p>
            <p className="mt-1 text-sm font-semibold text-white/70">
              {averagePlatformRating > 0 ? "Ortalama memnuniyet puanı" : "Değerlendirme altyapısı hazır"}
            </p>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 text-right text-black shadow-sm">
            <p className="text-2xl font-black">★</p>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500">
              Mindora
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-white/70">{reviewText}</p>
      </div>

      <div className="mt-5 grid gap-3">
        <TrustLine
          title="Onaylı uzman profilleri"
          text={
            approvedExpertCount > 0
              ? `${approvedExpertCount} uzman profili inceleme sürecinden geçti.`
              : "Uzman profilleri yayınlanmadan önce kontrol edilir."
          }
        />
        <TrustLine
          title="Gerçek değerlendirmeler"
          text={
            reviewedExpertCount > 0
              ? `${reviewedExpertCount} uzman için danışan yorumu bulunuyor.`
              : "Yorumlar yalnızca tamamlanan seanslardan sonra alınır."
          }
        />
        <TrustLine
          title="Güvenli ödeme ve online görüşme"
          text="Randevu, ödeme, mesajlaşma ve video görüşme tek platformda ilerler."
        />
        <TrustLine
          title="Kişiye özel ön eşleşme"
          text="İhtiyacına, uygun zamanına ve beklentine göre daha doğru başlangıç yapılır."
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/eslesme"
          className="rounded-2xl bg-black px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
        >
          Eşleşmeyi başlat
        </Link>
        <Link
          href="#uzman-listesi"
          className="rounded-2xl border border-black/10 bg-[#f7f2eb] px-5 py-3 text-center text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
        >
          Uzmanları gör
        </Link>
      </div>
    </aside>
  );
}

function TrustLine({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-3xl bg-[#f7f2eb] p-4 ring-1 ring-black/5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-xs font-black text-white">
        ✓
      </span>
      <div>
        <p className="text-sm font-black text-neutral-950">{title}</p>
        <p className="mt-1 text-sm leading-5 text-neutral-600">{text}</p>
      </div>
    </div>
  );
}

function ExpertSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-[2rem] bg-white/75 p-7 shadow-sm ring-1 ring-black/5">
          <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-neutral-200" />
          <div className="mx-auto mt-8 h-6 w-44 animate-pulse rounded-full bg-neutral-200" />
          <div className="mx-auto mt-3 h-4 w-32 animate-pulse rounded-full bg-neutral-200" />
          <div className="mx-auto mt-4 h-6 w-36 animate-pulse rounded-full bg-neutral-200" />
          <div className="mt-6 h-44 animate-pulse rounded-3xl bg-[#f7f2eb]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  text,
  href,
  actionLabel,
  onAction,
}: {
  title: string;
  text: string;
  href?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] bg-white/85 p-8 text-center shadow-sm ring-1 ring-black/5">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-3 leading-7 text-neutral-600">{text}</p>

      {href && actionLabel ? (
        <Link
          href={href}
          className="mt-6 inline-block rounded-2xl bg-black px-7 py-3 font-black text-white transition hover:bg-neutral-800"
        >
          {actionLabel}
        </Link>
      ) : null}

      {!href && actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-2xl bg-black px-7 py-3 font-black text-white transition hover:bg-neutral-800"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
