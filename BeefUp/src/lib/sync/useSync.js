import { useCallback, useEffect, useRef, useState } from 'react'
import { syncAll } from './engine.js'
import { createSupabaseBackend } from './backends/supabase.js'
import { getLink } from './link.js'
import { getPref, setPref } from '../prefs.js'
import { loadSupabaseConfig, getConfigEpoch } from '../supabaseConfig.js'

// The in-flight guard below is per hook instance, so two mounted callers
// would each start a run and race each other's cursor writes. Share the
// actual engine pass across every caller instead, keyed by scopes so a
// caller with a different scope set gets its own pass instead of silently
// riding along on whatever the first caller happened to pass in.
const enginePasses = new Map()

// Epoch in the key too: a pass in flight when the project switches must not
// be reused by (or block) a pass meant for the new project.
function scopesKey(scopes, epoch) {
  return JSON.stringify([epoch, [...scopes].sort()])
}

function runEngineOnce(backend, scopes) {
  const key = scopesKey(scopes, getConfigEpoch())
  let pass = enginePasses.get(key)
  if (!pass) {
    pass = syncAll(backend, { scopes }).finally(() => {
      if (enginePasses.get(key) === pass) enginePasses.delete(key)
    })
    enginePasses.set(key, pass)
  }
  return pass
}

// status: 'off' | 'idle' | 'syncing' | 'offline' | 'error'
export function useSync() {
  const [status, setStatus] = useState('off')
  const [lastSyncAt, setLastSyncAt] = useState(null)
  const [error, setError] = useState(null)

  // Reentrancy guard set synchronously, before any await, so two triggers
  // arriving back to back can never both slip past it.
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const backendRef = useRef(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    getPref('syncLastSyncAt', null).then((at) => {
      if (!cancelled) setLastSyncAt(at)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Keyed off nothing but its own closure over stable module-level values,
  // so this identity never changes and effects depending on it never re-fire.
  const run = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    // Yield once so every setState below lands in a microtask, never inside
    // the synchronous body of the effect that called run().
    await Promise.resolve()
    try {
      if (!(await loadSupabaseConfig())) {
        if (mounted.current) setStatus('off')
        return
      }
      // Revoke takes effect immediately via server check, not cache.
      const link = await getLink()
      if (!link || link.status !== 'accepted') {
        if (mounted.current) setStatus('off')
        return
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (mounted.current) setStatus('offline')
        return
      }

      if (mounted.current) {
        setStatus('syncing')
        setError(null)
      }

      const scopes = await getPref('syncScopes', [])
      if (!backendRef.current) backendRef.current = createSupabaseBackend()
      await runEngineOnce(backendRef.current, scopes)

      const now = Date.now()
      await setPref('syncLastSyncAt', now)
      if (mounted.current) {
        setLastSyncAt(now)
        setStatus('idle')
      }
    } catch (err) {
      if (mounted.current) {
        setStatus('error')
        setError(err)
      }
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(run)
  }, [run])

  useEffect(() => {
    window.addEventListener('online', run)
    return () => window.removeEventListener('online', run)
  }, [run])

  return { status, lastSyncAt, syncNow: run, error }
}
