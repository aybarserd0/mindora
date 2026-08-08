"use client";

import { useState } from "react";

type VerificationStatus = "approved" | "rejected" | "pending";

type ActionResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
};

type SignedUrlResponse = {
  ok?: boolean;
  signedUrl?: string;
  error?: string;
};

function normalizeText(value: string) {
  return value.trim();
}

async function openSignedUrl(verificationId: string, mode: "preview" | "download") {
  const response = await fetch(
    `/api/admin/expert-verifications/${verificationId}/signed-url?mode=${mode}`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const data = (await response.json().catch(() => ({}))) as SignedUrlResponse;

  if (!response.ok || data.ok === false || !data.signedUrl) {
    throw new Error(data.error || "Güvenli belge bağlantısı oluşturulamadı.");
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export default function VerificationActions({
  verificationId,
  status,
  onChanged,
}: {
  verificationId: string;
  status: string;
  onChanged?: () => void;
}) {
  const [loadingAction, setLoadingAction] = useState<VerificationStatus | "">("");
  const [fileAction, setFileAction] = useState<"preview" | "download" | "">("");
  const [adminNote, setAdminNote] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function handleFileAction(mode: "preview" | "download") {
    try {
      setNotice("");
      setError("");
      setFileAction(mode);

      await openSignedUrl(verificationId, mode);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Güvenli belge bağlantısı oluşturulamadı."
      );
    } finally {
      setFileAction("");
    }
  }

  async function updateStatus(nextStatus: VerificationStatus) {
    try {
      setNotice("");
      setError("");

      const safeNote = normalizeText(adminNote);

      if (nextStatus === "rejected" && !safeNote) {
        setError("Reddetme işlemi için admin notu zorunludur.");
        return;
      }

      setLoadingAction(nextStatus);

      const response = await fetch(`/api/admin/expert-verifications/${verificationId}`, {
        method: "PATCH",
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          adminNote: safeNote,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as ActionResponse;

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "İşlem tamamlanamadı.");
      }

      setNotice(data.message || "İşlem başarıyla tamamlandı.");
      setAdminNote("");

      if (typeof onChanged === "function") {
        onChanged();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "İşlem tamamlanamadı.");
    } finally {
      setLoadingAction("");
    }
  }

  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  return (
    <div className="min-w-[280px] space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={Boolean(fileAction)}
          onClick={() => void handleFileAction("preview")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {fileAction === "preview" ? "Açılıyor..." : "Önizle"}
        </button>

        <button
          type="button"
          disabled={Boolean(fileAction)}
          onClick={() => void handleFileAction("download")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {fileAction === "download" ? "Hazırlanıyor..." : "İndir"}
        </button>
      </div>

      <textarea
        value={adminNote}
        onChange={(event) => setAdminNote(event.target.value)}
        rows={2}
        placeholder="Admin notu"
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={Boolean(loadingAction) || isApproved}
          onClick={() => void updateStatus("approved")}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingAction === "approved" ? "Onaylanıyor..." : "Onayla"}
        </button>

        <button
          type="button"
          disabled={Boolean(loadingAction) || isRejected}
          onClick={() => void updateStatus("rejected")}
          className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingAction === "rejected" ? "Reddediliyor..." : "Reddet"}
        </button>

        <button
          type="button"
          disabled={Boolean(loadingAction) || status === "pending"}
          onClick={() => void updateStatus("pending")}
          className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingAction === "pending" ? "Alınıyor..." : "İnceleme"}
        </button>
      </div>

      {notice ? (
        <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
