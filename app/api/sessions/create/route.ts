import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { hasAdminSession } from "@/lib/security/admin-auth";
import { verifyConversationAccessToken } from "@/lib/chat-access-tokens";
import { cleanText, cleanUuid } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreatedBy = "client" | "expert" | "admin" | "system";

type ConversationRow = {
  id: string;
  client_application_id: string | null;
  expert_id: string | null;
  status: string | null;
  payment_status: string | null;
};

type SessionRow = {
  id: string;
  status: string;
  room_name: string;
  scheduled_at: string | null;
  conversation_id: string;
  started_at: string | null;
  created_at?: string | null;
};

const REUSABLE_SESSION_STATUSES = ["scheduled", "waiting", "active"] as const;
const MAX_ADVANCE_DAYS = 120;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

type CreatorResolution =
  | { ok: true; createdBy: CreatedBy }
  | { ok: false; response: NextResponse };

/**
 * Admins are trusted via their session cookie; clients and experts must
 * present a valid conversation access token for this exact conversation.
 * `createdBy` comes from whoever was verified, never from the request body.
 */
async function resolveCreator(
  req: NextRequest,
  bodyRecord: Record<string, unknown>,
  conversationId: string
): Promise<CreatorResolution> {
  if (hasAdminSession(req)) {
    return { ok: true, createdBy: "admin" };
  }

  const role = cleanText(
    req.headers.get("x-chat-access-role") || bodyRecord.role,
    20
  ).toLowerCase();
  const token = cleanText(
    req.headers.get("x-chat-access-token") || bodyRecord.token,
    200
  );

  if ((role !== "client" && role !== "expert") || !token) {
    return { ok: false, response: jsonError("Görüşme erişim bilgisi gerekli.", 401) };
  }

  const access = await verifyConversationAccessToken({ conversationId, role, token });

  if (!access.ok) {
    if (access.reason === "db_error") {
      return { ok: false, response: jsonError("Erişim doğrulanamadı.", 500) };
    }

    return {
      ok: false,
      response: jsonError("Bu görüşmeye erişim yetkiniz yok veya link süresi dolmuş.", 403),
    };
  }

  return { ok: true, createdBy: role };
}

function createRoomName(conversationId: string) {
  const safeConversationPart = conversationId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  const randomPart = crypto.randomBytes(16).toString("hex");

  return `mindora-${safeConversationPart || "session"}-${randomPart}`;
}

function parseScheduledAt(value: unknown) {
  const raw = cleanText(value, 80);

  if (!raw) return null;

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return "invalid" as const;
  }

  return parsed;
}

function isTooFarFuture(date: Date) {
  const max = Date.now() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000;
  return date.getTime() > max;
}

function serializeSession(session: SessionRow) {
  return {
    id: session.id,
    conversationId: session.conversation_id,
    status: session.status,
    roomName: session.room_name,
    scheduledAt: session.scheduled_at,
    startedAt: session.started_at,
    createdAt: session.created_at ?? null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const limited = applyRateLimit(req, {
      scope: "sessions-create",
      limit: 20,
      windowMs: 60_000,
    });

    if (limited) return limited;

    const contentLength = Number(req.headers.get("content-length") || 0);

    if (contentLength > 10_000) {
      return jsonError("İstek boyutu çok büyük.", 413);
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError("Geçerli istek gövdesi gerekli.", 400);
    }

    const bodyRecord = body as Record<string, unknown>;
    const conversationId = cleanUuid(bodyRecord.conversationId);
    const scheduledAtResult = parseScheduledAt(bodyRecord.scheduledAt);

    if (!conversationId) {
      return jsonError("Geçerli conversationId gerekli.", 400);
    }

    const creator = await resolveCreator(req, bodyRecord, conversationId);

    if (!creator.ok) return creator.response;

    const createdBy = creator.createdBy;

    if (scheduledAtResult === "invalid") {
      return jsonError("Geçerli scheduledAt değeri gerekli.", 400);
    }

    const scheduledAt = scheduledAtResult;

    if (scheduledAt) {
      if (scheduledAt.getTime() < Date.now() - 60_000) {
        return jsonError("Geçmiş zamana session oluşturulamaz.", 400);
      }

      if (isTooFarFuture(scheduledAt)) {
        return jsonError("Çok ileri bir tarihe session oluşturulamaz.", 400);
      }
    }

    const supabase = getSupabaseAdmin();

    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("id, client_application_id, expert_id, status, payment_status")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError) {
      console.error("SESSION_CREATE_CONVERSATION_QUERY_ERROR", conversationError);

      return jsonError("Konuşma bilgisi kontrol edilemedi.", 500);
    }

    const conversation = conversationData as ConversationRow | null;

    if (!conversation) {
      return jsonError("Konuşma bulunamadı.", 404);
    }

    if (conversation.status !== "active") {
      return jsonError("Konuşma aktif değil.", 403);
    }

    if (conversation.payment_status !== "paid") {
      return jsonError("Session oluşturmadan önce ödeme tamamlanmalıdır.", 402);
    }

    if (!conversation.client_application_id || !conversation.expert_id) {
      return jsonError("Konuşmada gerekli danışan veya uzman bilgisi eksik.", 409);
    }

    const { data: existingSessionsData, error: existingError } = await supabase
      .from("sessions")
      .select("id, status, room_name, scheduled_at, conversation_id, started_at, created_at")
      .eq("conversation_id", conversation.id)
      .in("status", REUSABLE_SESSION_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingError) {
      console.error("SESSION_CREATE_EXISTING_CHECK_ERROR", existingError);

      return jsonError("Mevcut session kontrol edilemedi.", 500);
    }

    const existingSession = (((existingSessionsData || []) as unknown) as SessionRow[])[0];

    if (existingSession) {
      return NextResponse.json({
        ok: true,
        reused: true,
        session: serializeSession(existingSession),
      });
    }

    const roomName = createRoomName(conversation.id);

    const { data: sessionData, error: insertError } = await supabase
      .from("sessions")
      .insert({
        conversation_id: conversation.id,
        client_application_id: conversation.client_application_id,
        expert_id: conversation.expert_id,
        status: scheduledAt ? "scheduled" : "waiting",
        provider: "livekit",
        room_name: roomName,
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
        created_by: createdBy,
      })
      .select("id, status, room_name, scheduled_at, conversation_id, started_at, created_at")
      .single();

    if (insertError || !sessionData) {
      console.error("SESSION_CREATE_INSERT_ERROR", insertError);

      return jsonError("Session oluşturulamadı.", 500);
    }

    return NextResponse.json({
      ok: true,
      reused: false,
      session: serializeSession(sessionData as SessionRow),
    });
  } catch (error) {
    console.error("SESSION_CREATE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Beklenmeyen bir hata oluştu." },
      { status: 500 }
    );
  }
}
