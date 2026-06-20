import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
};

type ExpertRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  title?: string | null;
};

const documentLabels: Record<string, string> = {
  diploma: "Diploma",
  license: "Lisans / Yetkinlik",
  certificate: "Uzmanlık Sertifikası",
  identity: "Kimlik Doğrulama",
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalize(value: unknown) {
  return String(value || "").trim();
}

function normalizeStatus(value: unknown) {
  const status = normalize(value).toLowerCase();

  if (["approved", "rejected", "pending"].includes(status)) return status;

  return "pending";
}

function formatDocumentType(value: unknown) {
  const key = normalize(value);
  return documentLabels[key] || key || "Belge";
}

async function fetchExpertsMap(expertIds: string[]) {
  const ids = Array.from(new Set(expertIds.filter(Boolean)));
  const map = new Map<string, ExpertRow>();

  if (ids.length === 0) return map;

  const supabase = getSupabaseAdmin() as any;

  const { data, error } = await supabase
    .from("experts")
    .select("id, name, full_name, title")
    .in("id", ids);

  if (error) {
    console.warn("ADMIN_EXPERT_VERIFICATIONS_EXPERTS_ERROR", error.message);
    return map;
  }

  for (const expert of (data || []) as ExpertRow[]) {
    map.set(expert.id, expert);
  }

  return map;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin() as any;

    const { data, error } = await supabase
      .from("expert_verifications")
      .select(
        "id, expert_id, document_type, file_name, file_path, file_size, status, admin_note, reviewed_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("ADMIN_EXPERT_VERIFICATIONS_QUERY_ERROR", error);
      return jsonError("Uzman doğrulama kayıtları alınamadı.", 500);
    }

    const rows = ((data || []) as VerificationRow[]).map((row) => ({
      ...row,
      status: normalizeStatus(row.status),
    }));

    const expertsById = await fetchExpertsMap(
      rows.map((row) => normalize(row.expert_id))
    );

    const items = rows.map((row) => {
      const expert = row.expert_id ? expertsById.get(row.expert_id) : null;

      return {
        id: row.id,
        expertId: row.expert_id,
        expertName:
          normalize(expert?.name) ||
          normalize(expert?.full_name) ||
          "İsimsiz Uzman",
        expertTitle: normalize(expert?.title) || null,
        documentType: row.document_type,
        documentLabel: formatDocumentType(row.document_type),
        fileName: row.file_name,
        filePath: row.file_path,
        fileSize: row.file_size || 0,
        status: row.status,
        adminNote: row.admin_note,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
      };
    });

    return NextResponse.json({
      ok: true,
      stats: {
        total: rows.length,
        pending: rows.filter((row) => row.status === "pending").length,
        approved: rows.filter((row) => row.status === "approved").length,
        rejected: rows.filter((row) => row.status === "rejected").length,
      },
      items,
    });
  } catch (error) {
    console.error("GET /api/admin/expert-verifications error:", error);

    return jsonError("Beklenmeyen bir hata oluştu.", 500);
  }
}
