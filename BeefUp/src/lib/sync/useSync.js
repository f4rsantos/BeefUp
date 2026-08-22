import { useCallback, useEffect, useRef, useState } from 'react'
import { syncAll } from './engine.js'
import { createSupabaseBackend } from './backends/supabase.js'
import { isLinked } from './link.js'
import { getPref, setPref } from '../prefs.js'
import { isConfigured } from '../supabaseClient.js'

// The in-flight guard below is per hook instance, so two mounted callers
// would each start a run and race each other's cursor writes. Share the
// actual engine pass across every caller instead.
let enginePass = null

function runEngineOnce(backend, scopes) {
  if (!enginePass) {
    enginePass = syncAll(backend, { scopes }).finally(() => { enginePass = null })
  }
  return enginePass
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
      if (!isConfigured()) {
        if (mounted.current) setStatus('off')
        return
      }
      const linked = await isLinked()
      if (!linked) {
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
