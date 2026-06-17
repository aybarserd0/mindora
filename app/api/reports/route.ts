import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { cleanMultilineText, cleanText, cleanUuid } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REPORT_CATEGORIES = [
  "no_show",
  "inappropriate_behavior",
  "harassment",
  "spam",
  "payment_dispute",
  "technical_issue",
  "safety_concern",
  "other",
] as const;

type ReporterType = "client" | "expert" | "admin";
type ReportedUserType = "client" | "expert";
type ReportCategory = (typeof REPORT_CATEGORIES)[number];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeReporterType(value: unknown): ReporterType | "" {
  const text = cleanText(value, 20).toLowerCase();

  if (text === "client" || text === "expert" || text === "admin") return text;

  return "";
}

function normalizeReportedUserType(value: unknown): ReportedUserType | "" {
  const text = cleanText(value, 20).toLowerCase();

  if (text === "client" || text === "expert") return text;

  return "";
}

function normalizeCategory(value: unknown): ReportCategory {
  const text = cleanText(value, 80).toLowerCase();

  if ((REPORT_CATEGORIES as readonly string[]).includes(text)) {
    return text as ReportCategory;
  }

  return "other";
}

function isSuspiciousDescription(value: string) {
  if (!value) return false;

  const linkCount = (value.match(/https?:\/\//gi) || []).length;
  const repeatedChars = /(.)\1{15,}/.test(value);
  const tooManyMentions = (value.match(/@/g) || []).length > 6;
  const tooManyHashtags = (value.match(/#/g) || []).length > 8;

  return linkCount > 3 || repeatedChars || tooManyMentions || tooManyHashtags;
}

function hasValidReference({
  reportedUserId,
  conversationId,
  bookingId,
  sessionId,
}: {
  reportedUserId: string;
  conversationId: string;
  bookingId: string;
  sessionId: string;
}) {
  return Boolean(reportedUserId || conversationId || bookingId || sessionId);
}

export async function POST(req: Request) {
  try {
    const limited = applyRateLimit(req, {
      scope: "reports-post",
      limit: 8,
      windowMs: 60_000,
    });

    if (limited) return limited;

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const contentLength = Number(req.headers.get("content-length") || 0);

    if (contentLength > 15_000) {
      return jsonError("İstek boyutu çok büyük.", 413);
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError("Geçerli istek gövdesi gerekli.");
    }

    const payload = body as {
      reporterType?: unknown;
      reporterId?: unknown;
      reportedUserType?: unknown;
      reportedUserId?: unknown;
      conversationId?: unknown;
      bookingId?: unknown;
      sessionId?: unknown;
      category?: unknown;
      description?: unknown;
    };

    const reporterType = normalizeReporterType(payload.reporterType);
    const reporterId = cleanUuid(payload.reporterId);
    const reportedUserType = normalizeReportedUserType(payload.reportedUserType);
    const reportedUserId = cleanUuid(payload.reportedUserId);
    const conversationId = cleanUuid(payload.conversationId);
    const bookingId = cleanUuid(payload.bookingId);
    const sessionId = cleanUuid(payload.sessionId);
    const category = normalizeCategory(payload.category);
    const description = cleanMultilineText(payload.description, 3000);

    if (!reporterType) {
      return jsonError("Geçerli reporterType gerekli.");
    }

    if (!reportedUserType) {
      return jsonError("Geçerli reportedUserType gerekli.");
    }

    if (!description || description.length < 10) {
      return jsonError("Rapor açıklaması en az 10 karakter olmalıdır.");
    }

    if (description.length > 3000) {
      return jsonError("Rapor açıklaması en fazla 3000 karakter olabilir.");
    }

    if (isSuspiciousDescription(description)) {
      return jsonError("Rapor açıklaması güvenlik kontrolünden geçemedi.");
    }

    if (
      !hasValidReference({
        reportedUserId,
        conversationId,
        bookingId,
        sessionId,
      })
    ) {
      return jsonError("Rapor için en az bir kullanıcı, konuşma, booking veya session referansı gerekli.");
    }

    if (reporterId && reportedUserId && reporterId === reportedUserId) {
      return jsonError("Kendi hesabınız için rapor oluşturamazsınız.");
    }

    const { data, error } = await supabase
      .from("reports")
      .insert({
        reporter_type: reporterType,
        reporter_id: reporterId || null,
        reported_user_type: reportedUserType,
        reported_user_id: reportedUserId || null,
        conversation_id: conversationId || null,
        booking_id: bookingId || null,
        session_id: sessionId || null,
        category,
        description,
        status: "open",
      })
      .select("id, reporter_type, reported_user_type, category, status, created_at")
      .single();

    if (error) {
      return jsonError(error.message || "Rapor oluşturulamadı.", 500);
    }

    return NextResponse.json({
      ok: true,
      message: "Raporunuz Mindora ekibine iletildi.",
      report: data,
    });
  } catch (error) {
    console.error("POST /api/reports error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
