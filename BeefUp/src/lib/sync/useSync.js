import { useCallback, useEffect, useRef, useState } from 'react'
import { syncAll, pushAll } from './engine.js'
import { createSupabaseBackend } from './backends/supabase.js'
import { getLink, getCachedLink } from './link.js'
import { getPref, setPref } from '../prefs.js'
import { loadSupabaseConfig, getConfigEpoch } from '../supabaseConfig.js'
import { LOCAL_WRITE_EVENT } from '../db.js'

const PULL_INTERVAL_MS = 5 * 60 * 1000
const REQUEST_EVENT = 'beefup:sync-request'

// The in-flight guard below is per hook instance, so two mounted callers
// would each start a run and race each other's cursor writes. Share the
// actual engine pass across every caller instead, keyed by scopes so a
// caller with a different scope set gets its own pass instead of silently
// riding along on whatever the first caller happened to pass in.
const enginePasses = new Map()

// A push and a full pass must never overlap: both stamp rows as synced.
let chain = Promise.resolve()
function serial(task) {
  const next = chain.then(task, task)
  chain = next.catch(() => {})
  return next
}

// Epoch in the key too: a pass in flight when the project switches must not
// be reused by (or block) a pass meant for the new project.
function passKey(mode, scopes, epoch) {
  return JSON.stringify([mode, epoch, [...scopes].sort()])
}

function runEngineOnce(backend, scopes, mode) {
  const key = passKey(mode, scopes, getConfigEpoch())
  let pass = enginePasses.get(key)
  if (!pass) {
    const engine = mode === 'push' ? pushAll : syncAll
    pass = serial(() => engine(backend, { scopes })).finally(() => {
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
  const queued = useRef(null)
  const lastPull = useRef(0)
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
  const run = useCallback(async (mode = 'full', force = false) => {
    if (mode === 'full' && !force && Date.now() - lastPull.current < PULL_INTERVAL_MS) return
    if (inFlight.current) {
      const wasFull = queued.current?.mode === 'full'
      queued.current = { mode: wasFull || mode === 'full' ? 'full' : 'push', force: force || !!queued.current?.force }
      return
    }
    inFlight.current = true
    // Yield once so every setState below lands in a microtask, never inside
    // the synchronous body of the effect that called run().
    await Promise.resolve()
    const pulling = mode === 'full'
    try {
      if (!(await loadSupabaseConfig())) {
        if (mounted.current) setStatus('off')
        return
      }
      // Revoke takes effect immediately via server check, not cache.
      const link = pulling ? await getLink() : await getCachedLink()
      if (!link || link.status !== 'accepted') {
        if (mounted.current) setStatus('off')
        return
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (mounted.current && pulling) setStatus('offline')
        return
      }

      if (mounted.current && pulling) {
        setStatus('syncing')
        setError(null)
      }

      const scopes = await getPref('syncScopes', [])
      if (!backendRef.current) backendRef.current = createSupabaseBackend()
      await runEngineOnce(backendRef.current, scopes, mode)

      if (pulling) {
        const now = Date.now()
        lastPull.current = now
        await setPref('syncLastSyncAt', now)
        if (mounted.current) {
          setLastSyncAt(now)
          setStatus('idle')
        }
      }
    } catch (err) {
      if (mounted.current) {
        setStatus('error')
        setError(err)
      }
    } finally {
      inFlight.current = false
      const next = queued.current
      queued.current = null
      if (next && mounted.current) {
        window.dispatchEvent(new CustomEvent(REQUEST_EVENT, { detail: next }))
      }
    }
  }, [])

  const syncNow = useCallback(() => run('full', true), [run])

  useEffect(() => {
    Promise.resolve().then(() => run('full'))
  }, [run])

  useEffect(() => {
    const onWrite = () => run('push')
    const onRequest = (e) => run(e.detail.mode, e.detail.force)
    window.addEventListener(LOCAL_WRITE_EVENT, onWrite)
    window.addEventListener(REQUEST_EVENT, onRequest)
    return () => {
      window.removeEventListener(LOCAL_WRITE_EVENT, onWrite)
      window.removeEventListener(REQUEST_EVENT, onRequest)
    }
  }, [run])

  useEffect(() => {
    const onOnline = () => {
      run('push')
      run('full')
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [run])

  // Mount and 'online' alone leave a session open for hours never syncing
  // again; the timer is what brings the server's changes down.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      run('push')
      run('full')
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => run('full', true), PULL_INTERVAL_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [run])

  return { status, lastSyncAt, syncNow, error }
}
