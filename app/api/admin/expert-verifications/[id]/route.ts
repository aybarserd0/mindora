import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail/smtp";
import {
  expertVerificationApprovedTemplate,
  expertVerificationRejectedTemplate,
} from "@/lib/mail/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type VerificationStatus = "approved" | "rejected" | "pending";

type VerificationRow = {
  id: string;
  expert_id: string | null;
  document_type: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  status: VerificationStatus | string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const allowedStatuses = new Set<VerificationStatus>([
  "approved",
  "rejected",
  "pending",
]);

const documentLabels: Record<string, string> = {
  diploma: "Diploma",
  license: "Lisans / Yetkinlik Belgesi",
  certificate: "Uzmanlık Sertifikası",
  identity: "Kimlik Doğrulama",
};

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

function getDocumentLabel(documentType: unknown) {
  const type = normalizeText(documentType);

  return documentLabels[type] || "Belge";
}

function getNotificationText({
  status,
  documentLabel,
  adminNote,
}: {
  status: VerificationStatus;
  documentLabel: string;
  adminNote: string;
}) {
  if (status === "approved") {
    return {
      title: `${documentLabel} onaylandı`,
      message: `${documentLabel} belgeniz incelendi ve onaylandı.`,
    };
  }

  if (status === "rejected") {
    return {
      title: `${documentLabel} reddedildi`,
      message: adminNote
        ? `${documentLabel} belgeniz reddedildi. Not: ${adminNote}`
        : `${documentLabel} belgeniz reddedildi. Lütfen belgeyi kontrol edip yeniden yükleyin.`,
    };
  }

  return {
    title: `${documentLabel} incelemeye alındı`,
    message: `${documentLabel} belgeniz tekrar inceleme sürecine alındı.`,
  };
}

async function createExpertNotification({
  supabase,
  verification,
  status,
  adminNote,
}: {
  supabase: any;
  verification: VerificationRow;
  status: VerificationStatus;
  adminNote: string;
}) {
  const expertId = normalizeText(verification.expert_id);

  if (!expertId) return;

  const documentLabel = getDocumentLabel(verification.document_type);
  const notificationText = getNotificationText({
    status,
    documentLabel,
    adminNote,
  });

  const { error } = await supabase.from("notifications").insert({
    user_type: "expert",
    user_id: expertId,
    title: notificationText.title,
    message: notificationText.message.slice(0, 500),
    type: "system",
    link: "/expert/dashboard/verification",
    metadata: {
      source: "expert_verification",
      verificationId: verification.id,
      documentType: verification.document_type,
      status,
    },
  });

  if (error) {
    console.error("EXPERT_VERIFICATION_NOTIFICATION_CREATE_ERROR", error);
  }
}

async function sendExpertVerificationEmail({
  supabase,
  verification,
  status,
  adminNote,
}: {
  supabase: any;
  verification: VerificationRow;
  status: VerificationStatus;
  adminNote: string;
}) {
  if (status !== "approved" && status !== "rejected") return;

  const expertId = normalizeText(verification.expert_id);
  if (!expertId) return;

  const { data: expert, error } = await supabase
    .from("experts")
    .select("name, email")
    .eq("id", expertId)
    .maybeSingle();

  if (error || !expert?.email) return;

  const documentLabel = getDocumentLabel(verification.document_type);
  const text =
    status === "approved"
      ? expertVerificationApprovedTemplate({
          expertName: expert.name || "Uzman",
          documentLabel,
        })
      : expertVerificationRejectedTemplate({
          expertName: expert.name || "Uzman",
          documentLabel,
          adminNote,
        });

  try {
    await sendMail({
      to: expert.email,
      subject:
        status === "approved"
          ? `${documentLabel} onaylandı`
          : `${documentLabel} hakkında`,
      text,
    });
  } catch (mailError) {
    console.error("EXPERT_VERIFICATION_MAIL_ERROR", mailError);
  }
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

    await createExpertNotification({
      supabase,
      verification: data as VerificationRow,
      status,
      adminNote,
    });

    await sendExpertVerificationEmail({
      supabase,
      verification: data as VerificationRow,
      status,
      adminNote,
    });

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
