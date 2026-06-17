import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enforceAdminRequest } from "@/lib/security/admin-auth";
import { cleanMultilineText, cleanText, cleanUuid } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ReportStatus = "open" | "investigating" | "resolved" | "rejected";

type ReportRow = {
  id: string;
  reporter_type: string;
  reporter_id: string | null;
  reported_user_type: string;
  reported_user_id: string | null;
  conversation_id: string | null;
  booking_id: string | null;
  session_id: string | null;
  category: string;
  description: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string | null;
};

type ReportStatsRow = {
  id: string;
  status: string;
  category: string;
};

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

function normalizeStatus(value: unknown): ReportStatus | "" {
  const status = cleanText(value, 40).toLowerCase();

  if (
    status === "open" ||
    status === "investigating" ||
    status === "resolved" ||
    status === "rejected"
  ) {
    return status;
  }

  return "";
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    no_show: "Seansa katılmadı",
    inappropriate_behavior: "Uygunsuz davranış",
    harassment: "Taciz / hakaret",
    spam: "Spam",
    payment_dispute: "Ödeme anlaşmazlığı",
    technical_issue: "Teknik problem",
    safety_concern: "Güvenlik riski",
    other: "Diğer",
  };

  return labels[category] || "Diğer";
}

function mapReport(report: ReportRow) {
  return {
    id: report.id,
    reporterType: report.reporter_type,
    reporterId: report.reporter_id,
    reportedUserType: report.reported_user_type,
    reportedUserId: report.reported_user_id,
    conversationId: report.conversation_id,
    bookingId: report.booking_id,
    sessionId: report.session_id,
    category: report.category,
    categoryLabel: categoryLabel(report.category),
    description: report.description,
    status: report.status,
    adminNote: report.admin_note,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
  };
}

export async function GET(req: Request) {
  try {
    const blocked = enforceAdminRequest(req);
    if (blocked) return blocked;

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const url = new URL(req.url);
    const status = normalizeStatus(url.searchParams.get("status"));

    let query = supabase
      .from("reports")
      .select(
        [
          "id",
          "reporter_type",
          "reporter_id",
          "reported_user_type",
          "reported_user_id",
          "conversation_id",
          "booking_id",
          "session_id",
          "category",
          "description",
          "status",
          "admin_note",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return jsonError(error.message || "Raporlar alınamadı.", 500);
    }

    const { data: allReportsData, error: statsError } = await supabase
      .from("reports")
      .select("id, status, category");

    if (statsError) {
      return jsonError(statsError.message || "Rapor istatistikleri alınamadı.", 500);
    }

    const reports = (((data || []) as unknown) as ReportRow[]).map(mapReport);

    const allReports = (((allReportsData || []) as unknown) as ReportStatsRow[]);

    return NextResponse.json({
      ok: true,
      stats: {
        totalReports: allReports.length,
        openReports: allReports.filter((report) => report.status === "open").length,
        investigatingReports: allReports.filter((report) => report.status === "investigating").length,
        resolvedReports: allReports.filter((report) => report.status === "resolved").length,
        rejectedReports: allReports.filter((report) => report.status === "rejected").length,
        safetyReports: allReports.filter((report) => report.category === "safety_concern").length,
      },
      reports,
    });
  } catch (error) {
    console.error("GET /api/admin/reports error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const blocked = enforceAdminRequest(req);
    if (blocked) return blocked;

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Sunucu Supabase ayarları eksik.", 500);
    }

    const body = await req.json().catch(() => null);
    const reportId = cleanUuid(body?.reportId);
    const status = normalizeStatus(body?.status);
    const adminNote = cleanMultilineText(body?.adminNote, 3000);

    if (!reportId) {
      return jsonError("Geçerli reportId gerekli.");
    }

    if (!status) {
      return jsonError("Geçerli rapor durumu gerekli.");
    }

    const patch: Record<string, unknown> = {
      status,
    };

    if (typeof body?.adminNote === "string") {
      patch.admin_note = adminNote || null;
    }

    const { data, error } = await supabase
      .from("reports")
      .update(patch)
      .eq("id", reportId)
      .select("id, status, admin_note, updated_at")
      .single();

    if (error) {
      return jsonError(error.message || "Rapor güncellenemedi.", 500);
    }

    return NextResponse.json({
      ok: true,
      message: "Rapor durumu güncellendi.",
      report: data,
    });
  } catch (error) {
    console.error("PATCH /api/admin/reports error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
