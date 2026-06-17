import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { cleanText, cleanUuid } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreatedBy = "admin" | "client" | "expert" | "system";

type BookSessionPayload = {
  expertId?: unknown;
  clientId?: unknown;
  conversationId?: unknown;
  startAt?: unknown;
  endAt?: unknown;
  timezone?: unknown;
  createdBy?: unknown;
};

type ExistingBookingRow = {
  id: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  status: string;
};

const DEFAULT_TIMEZONE = "Europe/Istanbul";
const ACTIVE_BOOKING_STATUSES = ["scheduled", "confirmed", "active"] as const;
const ALLOWED_CREATED_BY = ["admin", "client", "expert", "system"] as const;
const MIN_SESSION_MINUTES = 15;
const MAX_SESSION_MINUTES = 180;
const MAX_ADVANCE_DAYS = 120;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function normalizeTimezone(value: unknown) {
  const timezone = cleanText(value, 80) || DEFAULT_TIMEZONE;

  if (!/^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/.test(timezone)) {
    return DEFAULT_TIMEZONE;
  }

  return timezone;
}

function normalizeCreatedBy(value: unknown): CreatedBy {
  const createdBy = cleanText(value, 20).toLowerCase();

  if ((ALLOWED_CREATED_BY as readonly string[]).includes(createdBy)) {
    return createdBy as CreatedBy;
  }

  return "admin";
}

function getDurationMinutes(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function isTooFarFuture(date: Date) {
  const max = Date.now() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000;
  return date.getTime() > max;
}

function hasTimeConflict(existingBookings: ExistingBookingRow[], startAt: Date, endAt: Date) {
  return existingBookings.some((booking) => {
    const existingStart = new Date(booking.scheduled_start_at);
    const existingEnd = new Date(booking.scheduled_end_at);

    if (Number.isNaN(existingStart.getTime()) || Number.isNaN(existingEnd.getTime())) {
      return false;
    }

    return startAt < existingEnd && endAt > existingStart;
  });
}

export async function POST(req: NextRequest) {
  try {
    const limited = applyRateLimit(req, {
      scope: "sessions-book",
      limit: 20,
      windowMs: 60_000,
    });

    if (limited) return limited;

    const contentLength = Number(req.headers.get("content-length") || 0);

    if (contentLength > 10_000) {
      return jsonError("İstek boyutu çok büyük.", 413);
    }

    const supabase = getSupabaseAdmin();
    const body = (await req.json().catch(() => null)) as BookSessionPayload | null;

    if (!body || typeof body !== "object") {
      return jsonError("Geçerli istek gövdesi gerekli.");
    }

    const expertId = cleanUuid(body.expertId);
    const clientId = cleanUuid(body.clientId);
    const conversationId = cleanUuid(body.conversationId);
    const scheduledStartAt = parseDate(body.startAt);
    const scheduledEndAt = parseDate(body.endAt);
    const timezone = normalizeTimezone(body.timezone);
    const createdBy = normalizeCreatedBy(body.createdBy);

    if (!expertId) {
      return jsonError("Geçerli expertId gerekli.");
    }

    if (body.clientId && !clientId) {
      return jsonError("Geçerli clientId gerekli.");
    }

    if (body.conversationId && !conversationId) {
      return jsonError("Geçerli conversationId gerekli.");
    }

    if (!scheduledStartAt || !scheduledEndAt) {
      return jsonError("Geçerli startAt ve endAt gerekli.");
    }

    if (scheduledStartAt >= scheduledEndAt) {
      return jsonError("Başlangıç zamanı bitiş zamanından önce olmalı.");
    }

    if (scheduledStartAt.getTime() < Date.now() - 60_000) {
      return jsonError("Geçmiş zamana randevu oluşturulamaz.");
    }

    if (isTooFarFuture(scheduledStartAt)) {
      return jsonError("Çok ileri bir tarihe randevu oluşturulamaz.");
    }

    const durationMinutes = getDurationMinutes(scheduledStartAt, scheduledEndAt);

    if (durationMinutes < MIN_SESSION_MINUTES || durationMinutes > MAX_SESSION_MINUTES) {
      return jsonError(`Randevu süresi ${MIN_SESSION_MINUTES}-${MAX_SESSION_MINUTES} dakika arasında olmalıdır.`);
    }

    const { data: expert, error: expertError } = await supabase
      .from("experts" as never)
      .select("id, status, account_status")
      .eq("id", expertId as never)
      .maybeSingle();

    if (expertError) {
      return jsonError("Uzman bilgisi kontrol edilemedi.", 500);
    }

    if (!expert) {
      return jsonError("Uzman bulunamadı.", 404);
    }

    const { data: existingBookings, error: existingError } = await supabase
      .from("session_bookings" as never)
      .select("id, scheduled_start_at, scheduled_end_at, status")
      .eq("expert_id", expertId as never)
      .in("status" as never, ACTIVE_BOOKING_STATUSES as unknown as never)
      .lt("scheduled_start_at" as never, scheduledEndAt.toISOString() as never)
      .gt("scheduled_end_at" as never, scheduledStartAt.toISOString() as never);

    if (existingError) {
      return jsonError("Randevu uygunluğu kontrol edilemedi.", 500);
    }

    if (hasTimeConflict(((existingBookings || []) as unknown) as ExistingBookingRow[], scheduledStartAt, scheduledEndAt)) {
      return jsonError("Bu saat aralığı artık uygun değil.", 409);
    }

    const { data, error } = await supabase
      .from("session_bookings" as never)
      .insert({
        conversation_id: conversationId || null,
        expert_id: expertId,
        client_id: clientId || null,
        scheduled_start_at: scheduledStartAt.toISOString(),
        scheduled_end_at: scheduledEndAt.toISOString(),
        timezone,
        status: "scheduled",
        created_by: createdBy,
      } as never)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return jsonError("Bu saat aralığı artık uygun değil.", 409);
      }

      throw error;
    }

    return NextResponse.json({
      ok: true,
      booking: data,
    });
  } catch (err) {
    console.error("Session booking POST error:", err);

    return NextResponse.json(
      { ok: false, error: "Randevu oluşturulamadı." },
      { status: 500 }
    );
  }
}
