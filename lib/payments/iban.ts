/** Türkiye IBAN'ı: TR + 24 hane, mod-97 kontrolü. Boşluklar yok sayılır. */
export function normalizeIban(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .toUpperCase()
}

export function isValidTrIban(value: unknown) {
  const iban = normalizeIban(value)
  if (!/^TR\d{24}$/.test(iban)) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55))
  let remainder = 0
  for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97
  return remainder === 1
}

/** Ekranda göstermek için: TR12 **** **** **** **** 1234 */
export function maskIban(value: unknown) {
  const iban = normalizeIban(value)
  if (iban.length < 8) return ''
  return `${iban.slice(0, 4)} •••• •••• •••• •••• ${iban.slice(-4)}`
}

/** Okunaklı biçim: TR12 3456 7890 ... */
export function formatIban(value: unknown) {
  return normalizeIban(value).replace(/(.{4})/g, '$1 ').trim()
}
