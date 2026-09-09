// Lazily creates and memoises the Supabase client, keyed by url|anonKey so a
// trainer switching config never gets handed the previous project's client.
//
// The SDK is imported dynamically (only once a client is actually needed) so
// an unconfigured app never even resolves the module.
import { getConfigSync, isConfigured } from './supabaseConfig.js'

export { isConfigured }

let clientKey = null
let clientPromise = null

// Always returns a Promise<client | null>, never throws.
export function getSupabase() {
  const cfg = getConfigSync()
  if (!cfg) return Promise.resolve(null)

  const key = `${cfg.url}|${cfg.anonKey}`
  if (key !== clientKey) {
    clientKey = key
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(cfg.url, cfg.anonKey)
    )
  }
  return clientPromise
}

// Clears the memo first so nobody can grab the outgoing client mid-swap.
export async function resetSupabase({ signOut = false } = {}) {
  const oldPromise = clientPromise
  const projectRef = getConfigSync()?.projectRef
  clientKey = null
  clientPromise = null

  if (signOut && oldPromise) {
    const old = await oldPromise
    // scope: 'local' never hits the network — works offline.
    await old?.auth.signOut({ scope: 'local' })
  }

  if (typeof localStorage !== 'undefined') {
    for (const k of Object.keys(localStorage)) {
      if (/^sb-.+-auth-token/.test(k) && !k.startsWith(`sb-${projectRef}-`)) {
        localStorage.removeItem(k)
      }
    }
  }
}
