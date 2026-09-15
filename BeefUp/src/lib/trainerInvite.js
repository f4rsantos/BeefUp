// Encode/decode a trainer invite link: which Supabase project plus the 8-char code.
// base64url (not workoutShare.js's base64) so the output is query-string safe as-is.
const VERSION = 1

export function encodeTrainerInvite({ url, anonKey, code }) {
  const payload = JSON.stringify({ v: VERSION, url, anonKey, code })
  const bytes = new TextEncoder().encode(payload)
  return toBase64Url(bytes)
}

export function decodeTrainerInvite(str) {
  try {
    const bytes = fromBase64Url(str)
    const data = JSON.parse(new TextDecoder().decode(bytes))
    if (data.v !== VERSION) return null
    if (typeof data.url !== 'string' || typeof data.anonKey !== 'string' || typeof data.code !== 'string') return null
    if (!data.url.startsWith('https:')) return null
    if (data.code.length !== 8) return null
    return { url: data.url, anonKey: data.anonKey, code: data.code }
  } catch {
    return null
  }
}

function toBase64Url(bytes) {
  let binary = ''
  // Byte-by-byte, not spread -- avoids a stack overflow on large payloads.
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (base64.length % 4)) % 4
  const binary = atob(base64 + '='.repeat(pad))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
