import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getExpertIdFromRequest } from "@/lib/security/expert-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerificationRow = {
  id: string;
  expert_id: string | null;
  document_type: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  status: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

const documentLabels: Record<string, string> = {
  diploma: "Diploma",
  license: "Lisans / Yetkinlik Belgesi",
  certificate: "Uzmanlık Sertifikası",
  identity: "Kimlik Doğrulama",
};

const documentOrder = ["diploma", "license", "certificate", "identity"];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeStatus(value: unknown) {
  const status = normalizeText(value).toLowerCase();

  if (["pending", "approved", "rejected"].includes(status)) {
    return status;
  }

  return "pending";
}

async function resolveExpertId(request: NextRequest) {
  return getExpertIdFromRequest(request);
}

function getLatestByDocumentType(rows: VerificationRow[]) {
  const map = new Map<string, VerificationRow>();

  for (const row of rows) {
    const type = normalizeText(row.document_type);
    if (!type) continue;

    if (!map.has(type)) {
      map.set(type, row);
    }
  }

  return map;
}

export async function GET(request: NextRequest) {
  try {
    const expertId = await resolveExpertId(request);

    if (!expertId) {
      return jsonError("Uzman kimliği bulunamadı.", 401);
    }

    const supabase = getSupabaseAdmin() as any;

    const { data, error } = await supabase
      .from("expert_verifications")
      .select(
        "id, expert_id, document_type, file_name, file_path, file_size, status, admin_note, reviewed_at, created_at, updated_at"
      )
      .eq("expert_id", expertId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("EXPERT_VERIFICATION_LIST_ERROR", error);
      return jsonError("Doğrulama belgeleri alınamadı.", 500);
    }

    const rows = ((data || []) as VerificationRow[]).map((row) => ({
      ...row,
      status: normalizeStatus(row.status),
    }));

    const latestByType = getLatestByDocumentType(rows);

    const documents = documentOrder.map((type) => {
      const row = latestByType.get(type);

      return {
        documentType: type,
        documentLabel: documentLabels[type] || type,
        status: row?.status || "missing",
        verificationId: row?.id || null,
        fileName: row?.file_name || null,
        fileSize: row?.file_size || 0,
        adminNote: row?.admin_note || null,
        reviewedAt: row?.reviewed_at || null,
        createdAt: row?.created_at || null,
      };
    });

    const requiredDocuments = documents.filter((item) =>
      ["diploma", "license"].includes(item.documentType)
    );

    const completedRequiredCount = requiredDocuments.filter((item) =>
      ["pending", "approved"].includes(item.status)
    ).length;

    const approvedRequiredCount = requiredDocuments.filter((item) =>
      item.status === "approved"
    ).length;

    const progress =
      requiredDocuments.length > 0
        ? Math.round((completedRequiredCount / requiredDocuments.length) * 100)
        : 0;

    return NextResponse.json({
      ok: true,
      expertId,
      documents,
      history: rows,
      summary: {
        totalRecords: rows.length,
        progress,
        isReadyForReview: completedRequiredCount === requiredDocuments.length,
        isVerified: approvedRequiredCount === requiredDocuments.length,
        pending: rows.filter((row) => row.status === "pending").length,
        approved: rows.filter((row) => row.status === "approved").length,
        rejected: rows.filter((row) => row.status === "rejected").length,
      },
    });
  } catch (error) {
    console.error("GET /api/expert/verification error:", error);

    return jsonError("Beklenmeyen bir hata oluştu.", 500);
  }
}
