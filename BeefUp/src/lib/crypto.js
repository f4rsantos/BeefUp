// AES-GCM helpers for encrypting JSON payloads
const ENC_KEY_NAME = 'beefup_enc_key'

async function getKey() {
  const stored = sessionStorage.getItem(ENC_KEY_NAME)
  if (stored) {
    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const exported = await crypto.subtle.exportKey('raw', key)
  sessionStorage.setItem(ENC_KEY_NAME, btoa(String.fromCharCode(...new Uint8Array(exported))))
  return key
}

export async function encryptJSON(data) {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(data))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + cipher.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(cipher), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptJSON(b64) {
  try {
    const key = await getKey()
    const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const cipher = combined.slice(12)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
    return JSON.parse(new TextDecoder().decode(plain))
  } catch {
    return null
  }
}

// Plain (unencrypted) localStorage JSON helpers for ephemeral, per-tab UI
// state — draft recovery buffers that should not round-trip through
// IndexedDB prefs or backups. See src/lib/prefs.js for durable settings.
export function setLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getLS(key, fallback = null) {
  try {
    const v = localStorage.getItem(key)
    return v !== null ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

export function removeLS(key) {
  localStorage.removeItem(key)
}
