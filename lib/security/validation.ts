export function cleanText(value: unknown, limit = 2000) {
  if (typeof value !== "string") return "";

  return value
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

export function cleanMultilineText(value: unknown, limit = 5000) {
  if (typeof value !== "string") return "";

  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, limit);
}

export function cleanUuid(value: unknown) {
  if (typeof value !== "string") return "";

  const text = value.trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    return "";
  }

  return text;
}

export function cleanSlug(value: unknown) {
  if (typeof value !== "string") return "";

  const text = value.trim();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(text)) {
    return "";
  }

  return text;
}

export function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toSafeInteger(value: unknown, fallback = 0) {
  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : fallback;
}

export function isSafeRating(value: unknown) {
  const rating = Number(value);

  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export function jsonParseSafe<T = unknown>(value: string) {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
