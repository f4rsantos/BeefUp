// Lazily creates and memoises the Supabase client. When the env vars are
// absent this stays completely silent: no throw, no console noise, no
// network — the app runs fully local, which is the normal path.
//
// The SDK is imported dynamically (only once a client is actually needed)
// so an unconfigured app never even resolves the module.

let clientPromise = null

function readEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return url && key ? { url, key } : null
}

export function isConfigured() {
  return !!readEnv()
}

// Always returns a Promise<client | null>, never throws.
export function getSupabase() {
  const env = readEnv()
  if (!env) return Promise.resolve(null)

  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(env.url, env.key)
    )
  }
  return clientPromise
}
