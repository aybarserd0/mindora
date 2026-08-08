import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { getExpertIdFromRequest } from "@/lib/security/expert-session";
import {
  cleanMultilineText,
  cleanSlug,
  cleanText,
  toSafeNumber,
} from "@/lib/security/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ExpertStatus = "pending" | "approved" | "rejected" | "passive" | "review" | string;
type UnknownRecord = Record<string, unknown>;

type NormalizedExpert = {
  id: string;
  slug: string;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  city: string;
  status: ExpertStatus;
  accountStatus: "active" | "passive";
  approvedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  specialties: string[];
  focusAreas: string[];
  education: string[];
  certificates: string[];
  experienceYears: number;
  sessionPrice: number;
  sessionDurationMinutes: number;
  profileImageUrl: string | null;
  bio: string;
  publicBio: string;
  approach: string;
  totalClients: number;
  completedSessions: number;
  averageRating: number | null;
  totalEarnings: number;
};

const ROUTE_VERSION = "expert-profile-secure-v6";
const MAX_BODY_SIZE = 25_000;

const REVIEW_REQUIRED_KEYS = new Set([
  "title",
  "specialties",
  "focus_areas",
  "education",
  "certificates",
  "bio",
  "public_bio",
  "therapy_approach",
  "profile_image_url",
]);

function jsonOk(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...payload }, { status });
}

function jsonError(error: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(process.env.NODE_ENV !== "production" && details ? { details } : {}),
    },
    { status }
  );
}

function toText(value: unknown, fallback = "") {
  return cleanText(value, 5000) || fallback;
}

function toLongText(value: unknown, fallback = "") {
  const text = cleanMultilineText(value, 5000);
  return text || fallback;
}

function toNullableText(value: unknown, limit = 2000) {
  const text = cleanText(value, limit);
  return text || null;
}

function toNullableLongText(value: unknown, limit = 5000) {
  const text = cleanMultilineText(value, limit);
  return text || null;
}

function toNumber(value: unknown, fallback = 0) {
  return toSafeNumber(value, fallback);
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeStringArray(value: unknown, itemLimit = 120): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item, itemLimit)).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed) as unknown;

      if (Array.isArray(parsed)) {
        return parsed.map((item) => cleanText(item, itemLimit)).filter(Boolean);
      }
    } catch {
      // CSV fallback.
    }

    return trimmed
      .split(",")
      .map((item) => cleanText(item, itemLimit))
      .filter(Boolean);
  }

  return [];
}

function uniqueCleanList(value: unknown, maxItems = 30, itemLimit = 120) {
  const seen = new Set<string>();

  return normalizeStringArray(value, itemLimit)
    .filter((item) => {
      const key = item.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
}

function pick(row: UnknownRecord, keys: string[], fallback: unknown = "") {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }

  return fallback;
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR"))
    .join("");

  return initials || "M";
}

function normalizeStatus(status: unknown): ExpertStatus {
  const normalized = toText(status, "pending").toLowerCase();

  if (["pending", "approved", "rejected", "passive", "review"].includes(normalized)) {
    return normalized;
  }

  return normalized || "pending";
}

function statusLabel(status: ExpertStatus) {
  switch (status) {
    case "approved":
      return "Onaylandı";
    case "rejected":
      return "Reddedildi";
    case "passive":
      return "Pasif";
    case "review":
      return "İncelemede";
    case "pending":
    default:
      return "İncelemede";
  }
}

function isSafeImageUrl(value: unknown) {
  const text = cleanText(value, 1000);

  if (!text) return true;

  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeExpert(row: UnknownRecord) {
  const name = toText(pick(row, ["name", "full_name", "display_name"], "Mindora Uzmanı"), "Mindora Uzmanı");
  const title = toText(pick(row, ["title", "profession", "expert_title"], "Uzman"), "Uzman");
  const status = normalizeStatus(pick(row, ["status", "profile_status"], "pending"));
  const isActive = row.is_active !== false && status !== "passive" && status !== "rejected";
  const sessionDurationMinutes = toNumber(
    pick(row, ["session_duration_minutes", "session_duration", "duration_minutes"], 50),
    50
  );

  const internalProfile: NormalizedExpert = {
    id: toText(pick(row, ["id"])),
    slug: toText(pick(row, ["slug", "public_slug"])),
    name,
    title,
    email: toNullableText(pick(row, ["email", "contact_email"]), 320),
    phone: toNullableText(pick(row, ["phone", "phone_number", "contact_phone"]), 40),
    city: toText(pick(row, ["city", "location"], "Belirtilmedi"), "Belirtilmedi"),
    status,
    accountStatus: isActive ? "active" : "passive",
    approvedAt: toNullableText(pick(row, ["approved_at"]), 80),
    createdAt: toNullableText(pick(row, ["created_at"]), 80),
    updatedAt: toNullableText(pick(row, ["updated_at"]), 80),
    specialties: normalizeStringArray(pick(row, ["specialties", "specialty", "areas"])),
    focusAreas: normalizeStringArray(pick(row, ["focus_areas", "focusAreas", "working_areas"])),
    education: normalizeStringArray(pick(row, ["education", "educations"])),
    certificates: normalizeStringArray(pick(row, ["certificates", "certificate"])),
    experienceYears: toNumber(
      pick(row, ["experience_years", "experienceYears", "years_of_experience"]),
      0
    ),
    sessionPrice: toNumber(pick(row, ["session_price", "price", "session_fee"]), 0),
    sessionDurationMinutes,
    profileImageUrl: toNullableText(pick(row, ["profile_image_url", "photo_url", "avatar_url", "image_url"]), 1000),
    bio: toLongText(pick(row, ["bio", "internal_bio", "about"])),
    publicBio: toLongText(pick(row, ["public_bio", "bio", "about"])),
    approach: toLongText(pick(row, ["therapy_approach"])),
    totalClients: 0,
    completedSessions: 0,
    averageRating: null,
    totalEarnings: 0,
  };

  const publicProfile = {
    id: internalProfile.id,
    slug: internalProfile.slug,
    name: internalProfile.name,
    title: internalProfile.title,
    city: internalProfile.city,
    imageInitials: getInitials(internalProfile.name),
    profileImageUrl: internalProfile.profileImageUrl,
    specialties: internalProfile.specialties,
    focusAreas: internalProfile.focusAreas,
    education: internalProfile.education,
    certificates: internalProfile.certificates,
    experienceYears: internalProfile.experienceYears,
    sessionPrice: internalProfile.sessionPrice,
    sessionDuration: `${internalProfile.sessionDurationMinutes} dk`,
    bio: internalProfile.publicBio,
    publicBio: internalProfile.publicBio,
    approach: internalProfile.approach,
    isAvailableThisWeek: false,
    nextAvailableSlot: null,
    statusLabel: statusLabel(internalProfile.status),
  };

  return { internalProfile, publicProfile };
}

async function findExpert({ expertId, slug }: { expertId: string | null; slug: string | null }) {
  const supabase = getSupabaseAdmin() as any;

  let query = supabase.from("experts").select("*").limit(1);

  if (expertId) {
    query = query.eq("id", expertId);
  } else if (slug) {
    query = query.eq("slug", slug);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;

  return (data || null) as UnknownRecord | null;
}

function validatePatchPayload(body: UnknownRecord) {
  const name = cleanText(body.name, 120);
  const title = cleanText(body.title, 120);

  if (!name) return "Ad soyad alanı zorunludur.";
  if (!title) return "Unvan alanı zorunludur.";

  if (name.length > 120) return "Ad soyad alanı en fazla 120 karakter olabilir.";
  if (title.length > 120) return "Unvan alanı en fazla 120 karakter olabilir.";

  const city = cleanText(body.city, 80);
  if (city.length > 80) return "Şehir alanı en fazla 80 karakter olabilir.";

  const phone = cleanText(body.phone, 40);
  if (phone.length > 40) return "Telefon alanı en fazla 40 karakter olabilir.";

  const experienceYears = toNullableNumber(body.experienceYears ?? body.experience_years);
  if (
    (body.experienceYears !== undefined || body.experience_years !== undefined) &&
    (experienceYears === null || experienceYears < 0 || experienceYears > 80)
  ) {
    return "Deneyim yılı 0 ile 80 arasında olmalıdır.";
  }

  const sessionPrice = toNullableNumber(body.sessionPrice ?? body.session_price);
  if (
    (body.sessionPrice !== undefined || body.session_price !== undefined) &&
    (sessionPrice === null || sessionPrice < 0 || sessionPrice > 100000)
  ) {
    return "Seans ücreti geçerli bir tutar olmalıdır.";
  }

  const publicBio = cleanMultilineText(body.publicBio ?? body.public_bio, 1201);
  if (publicBio.length > 1200) return "Kısa tanıtım metni en fazla 1200 karakter olabilir.";

  const bio = cleanMultilineText(body.bio, 3001);
  if (bio.length > 3000) return "Bio metni en fazla 3000 karakter olabilir.";

  const therapyApproach = cleanMultilineText(body.approach ?? body.therapy_approach, 1601);
  if (therapyApproach.length > 1600) return "Çalışma yaklaşımı en fazla 1600 karakter olabilir.";

  if (!isSafeImageUrl(body.profileImageUrl ?? body.profile_image_url)) {
    return "Profil fotoğrafı için geçerli bir URL kullanılmalıdır.";
  }

  const listFields = [
    ["specialties", body.specialties],
    ["focusAreas", body.focusAreas ?? body.focus_areas],
    ["education", body.education],
    ["certificates", body.certificates],
  ] as const;

  for (const [fieldName, fieldValue] of listFields) {
    const items = uniqueCleanList(fieldValue, 30, 120);

    if (items.length > 30) {
      return `${fieldName} alanı en fazla 30 öğe içerebilir.`;
    }
  }

  return "";
}

function buildExpertUpdate(body: UnknownRecord) {
  const publicBio = toNullableLongText(body.publicBio ?? body.public_bio ?? body.bio, 1200);
  const name = cleanText(body.name, 120);

  return {
    name,
    full_name: name,
    title: cleanText(body.title, 120),
    phone: toNullableText(body.phone, 40),
    city: cleanText(body.city, 80) || "Belirtilmedi",
    specialties: uniqueCleanList(body.specialties, 30, 120),
    focus_areas: uniqueCleanList(body.focusAreas ?? body.focus_areas, 30, 120),
    experience_years: toNullableNumber(body.experienceYears ?? body.experience_years) ?? 0,
    session_price: toNullableNumber(body.sessionPrice ?? body.session_price) ?? 0,
    public_bio: publicBio || "",
    bio: toNullableLongText(body.bio, 3000) || publicBio || "",
    therapy_approach: toNullableLongText(body.approach ?? body.therapy_approach, 1600) || "",
    education: uniqueCleanList(body.education, 30, 160),
    certificates: uniqueCleanList(body.certificates, 30, 160),
    profile_image_url: toNullableText(body.profileImageUrl ?? body.profile_image_url, 1000),
    updated_at: new Date().toISOString(),
  };
}

function hasReviewRequiredChange(current: UnknownRecord, update: UnknownRecord) {
  return Object.entries(update).some(([key, value]) => {
    if (!REVIEW_REQUIRED_KEYS.has(key)) return false;

    const currentValue = current[key];

    if (Array.isArray(value) || Array.isArray(currentValue)) {
      return JSON.stringify(normalizeStringArray(currentValue)) !== JSON.stringify(normalizeStringArray(value));
    }

    return toText(currentValue) !== toText(value);
  });
}

export async function GET(req: NextRequest) {
  try {
    const limited = applyRateLimit(req, {
      scope: "expert-profile-get",
      limit: 60,
      windowMs: 60_000,
    });

    if (limited) return limited;

    const slugRaw = req.nextUrl.searchParams.get("slug");
    const modeParam = cleanText(
      req.nextUrl.searchParams.get("mode") || req.nextUrl.searchParams.get("scope"),
      20
    ).toLowerCase();

    const slug = slugRaw ? cleanSlug(slugRaw.toLowerCase()) : null;
    const mode = modeParam === "public" ? "public" : "internal";

    if (slugRaw && !slug) {
      return jsonError("Geçerli profil bağlantısı gerekli.", 400);
    }

    let expertId: string | null = null;

    if (mode === "internal") {
      expertId = await getExpertIdFromRequest(req);

      if (!expertId) {
        return jsonError("Uzman oturumu bulunamadı.", 401);
      }
    }

    const expert = await findExpert({ expertId, slug });

    if (!expert) {
      return jsonError("Uzman profili bulunamadı.", 404);
    }

    const normalized = normalizeExpert(expert);

    if (mode === "public") {
      return jsonOk({ profile: normalized.publicProfile, mode, routeVersion: ROUTE_VERSION });
    }

    return jsonOk({
      profile: normalized.internalProfile,
      publicProfile: normalized.publicProfile,
      mode,
      routeVersion: ROUTE_VERSION,
    });
  } catch (error) {
    console.error("EXPERT_PROFILE_API_ERROR", {
      routeVersion: ROUTE_VERSION,
      error,
    });

    return jsonError(
      "Uzman profili şu anda alınamadı.",
      500,
      error instanceof Error ? error.message : error
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const limited = applyRateLimit(req, {
      scope: "expert-profile-patch",
      limit: 12,
      windowMs: 60_000,
    });

    if (limited) return limited;

    const contentLength = Number(req.headers.get("content-length") || 0);

    if (contentLength > MAX_BODY_SIZE) {
      return jsonError("İstek boyutu çok büyük.", 413);
    }

    const expertId = await getExpertIdFromRequest(req);

    if (!expertId) {
      return jsonError("Uzman oturumu bulunamadı.", 401);
    }

    const body = (await req.json().catch(() => ({}))) as UnknownRecord;

    if (!body || typeof body !== "object") {
      return jsonError("Geçerli istek gövdesi gerekli.", 400);
    }

    const validationError = validatePatchPayload(body);

    if (validationError) {
      return jsonError(validationError, 422);
    }

    const currentExpert = await findExpert({ expertId, slug: null });

    if (!currentExpert) {
      return jsonError("Uzman profili bulunamadı.", 404);
    }

    const update: UnknownRecord = buildExpertUpdate(body);
    const pendingReview = hasReviewRequiredChange(currentExpert, update);

    const supabase = getSupabaseAdmin() as any;

    const { data, error } = await supabase
      .from("experts")
      .update(update)
      .eq("id", currentExpert.id)
      .select("*")
      .single();

    if (error) throw error;

    const normalized = normalizeExpert((data || currentExpert) as UnknownRecord);

    return jsonOk({
      profile: normalized.internalProfile,
      publicProfile: normalized.publicProfile,
      pendingReview,
      routeVersion: ROUTE_VERSION,
      message: pendingReview
        ? "Profil güncellendi. Kritik alanlar admin incelemesine alındı."
        : "Profil bilgileriniz başarıyla güncellendi.",
    });
  } catch (error) {
    console.error("EXPERT_PROFILE_PATCH_API_ERROR", {
      routeVersion: ROUTE_VERSION,
      error,
    });

    return jsonError(
      "Profil güncellenemedi.",
      500,
      error instanceof Error ? error.message : error
    );
  }
}
