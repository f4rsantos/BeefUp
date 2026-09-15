// Owns the per-trainer Supabase config, stored in IndexedDB. Separated from
// supabaseClient.js so the wizard can validate/save without pulling in the SDK.
import { db } from './db.js'
import { setPref } from './prefs.js'

const CONFIG_KEY = 'supabase:config'

let snapshot = null
let loadPromise = null
let epoch = 0
const listeners = new Set()

function notify() {
  epoch++
  listeners.forEach((cb) => cb())
}

export function isConfigured() {
  return !!snapshot
}

export function getConfigSync() {
  return snapshot
}

export function getConfigEpoch() {
  return epoch
}

export function subscribeConfig(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function projectRefOf(url) {
  return new URL(url).hostname.split('.')[0]
}

// Reason codes only, never sentences — the wizard maps these through
// src/strings.js so pt/en stay in sync. Never surface these to a human directly.
export function validateConfig({ url, anonKey }) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('bad-url')
  }
  if (parsed.protocol !== 'https:') throw new Error('not-https')
  if (!parsed.hostname.endsWith('.supabase.co')) throw new Error('bad-host')

  const isJwt = /^[\w-]+\.[\w-]+\.[\w-]+$/.test(anonKey || '')
  const isPublishable = (anonKey || '').startsWith('sb_publishable_')
  if (!anonKey || !(isJwt || isPublishable)) throw new Error('bad-key')

  return { url: url.replace(/\/+$/, ''), anonKey, projectRef: projectRefOf(url) }
}

// Only kicks in when nothing was ever saved — a real config always wins.
function devFallback() {
  if (!import.meta.env.DEV) return null
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  try {
    return { ...validateConfig({ url, anonKey }), savedAt: 0 }
  } catch {
    return null
  }
}

// Memoized: tolerates a missing indexedDB (node tests) by resolving null.
export function loadSupabaseConfig() {
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    if (typeof indexedDB === 'undefined') return null
    const stored = await db.getSetting(CONFIG_KEY, null)
    snapshot = stored ?? devFallback()
    return snapshot
  })()
  return loadPromise
}

export async function setSupabaseConfig(input) {
  const validated = validateConfig(input)
  const config = { ...validated, savedAt: Date.now() }
  await db.setSetting(CONFIG_KEY, config)
  snapshot = config
  loadPromise = Promise.resolve(config)
  notify()
  return config
}

// Also clears syncLink/syncScopes/syncLastSyncAt — otherwise a stale syncLink
// keeps pointing at a trainer this device can no longer reach.
export async function clearSupabaseConfig() {
  await db.setSetting(CONFIG_KEY, null)
  snapshot = null
  loadPromise = Promise.resolve(null)
  await setPref('syncLink', null)
  await setPref('syncScopes', [])
  await setPref('syncLastSyncAt', null)
  notify()
}

export function __setConfigForTests(cfg) {
  snapshot = cfg
  loadPromise = Promise.resolve(cfg)
}

// has_scope is the only function granted to anon, so it's the only probe
// possible before login. A missing-function error means setup.sql never ran.
export async function testConnection(cfg) {
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(cfg.url, cfg.anonKey)

  try {
    const { error } = await client.rpc('has_scope', {
      target_user: '00000000-0000-0000-0000-000000000000',
      want_scope: 'workouts',
    })
    if (!error) return { ok: true }
    if (/could not find the function/i.test(error.message)) {
      return { ok: false, reason: 'schema-missing' }
    }
    // supabase-js's error shape for a bad key vs. other rejections isn't
    // reliable enough to classify with confidence — surface it, don't guess.
    return { ok: false, reason: 'unknown', message: error.message }
  } catch (err) {
    return { ok: false, reason: 'unreachable', message: String(err?.message || err) }
  }
}
