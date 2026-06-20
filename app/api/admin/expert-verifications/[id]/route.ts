import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type VerificationStatus = "approved" | "rejected" | "pending";

const allowedStatuses = new Set<VerificationStatus>([
  "approved",
  "rejected",
  "pending",
]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeStatus(value: unknown): VerificationStatus | "" {
  const status = normalizeText(value).toLowerCase();

  if (allowedStatuses.has(status as VerificationStatus)) {
    return status as VerificationStatus;
  }

  return "";
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const verificationId = normalizeText(id);

    if (!verificationId) {
      return jsonError("Doğrulama kaydı bulunamadı.");
    }

    const body = (await request.json().catch(() => ({}))) as {
      status?: unknown;
      adminNote?: unknown;
      admin_note?: unknown;
    };

    const status = normalizeStatus(body.status);
    const adminNote = normalizeText(body.adminNote ?? body.admin_note);

    if (!status) {
      return jsonError("Geçerli bir durum seçilmelidir.");
    }

    if (status === "rejected" && !adminNote) {
      return jsonError("Reddetme işlemi için admin notu gereklidir.");
    }

    const supabase = getSupabaseAdmin() as any;

    const patch = {
      status,
      admin_note: adminNote || null,
      reviewed_at: status === "pending" ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("expert_verifications")
      .update(patch)
      .eq("id", verificationId)
      .select(
        "id, expert_id, document_type, file_name, file_path, file_size, status, admin_note, reviewed_at, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error("ADMIN_EXPERT_VERIFICATION_UPDATE_ERROR", error);
      return jsonError("Doğrulama kaydı güncellenemedi.", 500);
    }

    return NextResponse.json({
      ok: true,
      verification: data,
      message:
        status === "approved"
          ? "Belge onaylandı."
          : status === "rejected"
            ? "Belge reddedildi."
            : "Belge tekrar incelemeye alındı.",
    });
  } catch (error) {
    console.error("PATCH /api/admin/expert-verifications/[id] error:", error);

    return jsonError("Beklenmeyen bir hata oluştu.", 500);
  }
}
