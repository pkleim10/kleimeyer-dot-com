// Sealed-list fingerprinting — the single source of truth for turning a pasted
// list into a fingerprint, imported by BOTH the browser and the server.
//
// This must never be duplicated. The browser computes the fingerprint when a
// player seals their list; the server recomputes it from the plaintext they
// paste back after the season opens. Any divergence between the two would
// reject every honest player, so both sides run exactly this code.
//
// Implemented on WebCrypto (`globalThis.crypto.subtle`), which exists in
// browsers and in the Node runtime the server routes run on. The Jest
// environment is polyfilled in jest.setup.js for the same reason.

export const SEAL_VERSION = 'FRHDP-SEAL-v1'

// Leading list decoration a player's own file is likely to contain:
// "1. ", "01) ", "- ", "* ", "• ".
const LIST_MARKER = /^\s*(?:[-*•]|\d{1,3}[.)])\s*/

/**
 * Pull names out of free-form pasted text. Tolerant on purpose: the player
 * keeps this list in their own notes file, so it may arrive numbered,
 * bulleted, or bare, with blank lines anywhere.
 * Order is preserved here; canonicalization is what makes order irrelevant.
 */
export function parseList(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(LIST_MARKER, ''))
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 0)
}

/** Trim, collapse runs of whitespace, and NFC-normalize so visually identical
 *  strings (e.g. differently-composed accents) compare equal. */
export function normalizeWhitespace(value) {
  return String(value || '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * The exact bytes that get hashed.
 *
 * Case-folded and sorted so that re-pasting the same list with different
 * capitalisation or in a different order still matches — the player is pasting
 * from their own file months apart, and an incidental edit must not lock them
 * out. Only genuinely different names change the fingerprint.
 *
 * `.sort()` default ordering is used deliberately: it compares UTF-16 code
 * units and is identical everywhere. `localeCompare` is NOT safe here, as its
 * result varies by locale and would produce different fingerprints on
 * different machines.
 *
 * The version tag and season year are domain separators, so a fingerprint is
 * only ever valid for the season it was sealed in.
 */
export function canonicalize({ names, secret, seasonYear }) {
  const folded = names.map((name) => normalizeWhitespace(name).toLowerCase()).sort()
  return [SEAL_VERSION, String(seasonYear), normalizeWhitespace(secret), ...folded].join('\n')
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** The public fingerprint for a list. */
export async function computeFingerprint({ names, secret, seasonYear }) {
  return sha256Hex(canonicalize({ names, secret, seasonYear }))
}

/** Convenience for the paste boxes: raw text in, fingerprint + parsed names out. */
export async function fingerprintPastedList({ text, secret, seasonYear }) {
  const names = parseList(text)
  const fingerprint = await computeFingerprint({ names, secret, seasonYear })
  return { names, fingerprint }
}

/** Short form for display; the full value is always what's compared. */
export function shortFingerprint(fingerprint) {
  return String(fingerprint || '').slice(0, 12)
}
