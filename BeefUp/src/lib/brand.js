import { db } from './db.js'
import { getSupabase } from './supabaseClient.js'
import { loadSupabaseConfig } from './supabaseConfig.js'
import { getSession } from './auth.js'

export const BRAND_NAME_MAX = 40
export const BRAND_LOGO_MAX = 120000
export const DEFAULT_BRAND_NAME = 'BeefUp'

const CACHE_KEY = 'brand:cache'
const COLOR_RE = /^#[0-9a-f]{6}$/i
const LOGO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/

// Server data is untrusted: keep only what is valid.
export function normalizeBrand(row) {
  if (!row || typeof row !== 'object') return null
  const name = typeof row.name === 'string' ? row.name.trim().slice(0, BRAND_NAME_MAX) : ''
  const color = typeof row.color === 'string' && COLOR_RE.test(row.color) ? row.color.toLowerCase() : null
  const logo = typeof row.logo === 'string' && row.logo.length <= BRAND_LOGO_MAX && LOGO_RE.test(row.logo) ? row.logo : null
  if (!name && !color && !logo) return null
  return { name, color, logo }
}

// Trainer colour is the default; a chosen colour wins.
export function resolveAccent({ brand, accentChosen, accentColor, customAccentHex }) {
  if (brand?.color && !accentChosen) return { accentColor: 'custom', customAccentHex: brand.color }
  return { accentColor, customAccentHex }
}

export function brandTitle(brand) {
  return brand?.name || DEFAULT_BRAND_NAME
}

// One snapshot per device, read synchronously.
let snapshot = null
const listeners = new Set()

export function getBrand() {
  return snapshot
}

export function subscribeBrand(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function store(next) {
  snapshot = next
  listeners.forEach((fn) => fn())
  try {
    await db.setSetting(CACHE_KEY, next)
  } catch {
    // The cache only saves a round trip.
  }
}

export async function loadBrandCache() {
  try {
    snapshot = normalizeBrand(await db.getSetting(CACHE_KEY, null))
  } catch {
    snapshot = null
  }
  listeners.forEach((fn) => fn())
}

export function clearBrand() {
  return store(null)
}

async function fetchBrand(trainerId) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('trainer_brand')
    .select('name, color, logo')
    .eq('trainer_id', trainerId)
    .maybeSingle()
  if (error) throw error
  return normalizeBrand(data)
}

// Student side. Any failure keeps the cache.
export async function refreshBrand(trainerId) {
  if (!trainerId || !(await loadSupabaseConfig()) || !(await getSession())) return
  try {
    await store(await fetchBrand(trainerId))
  } catch {
    // keep what is cached
  }
}

// Trainer side. Throws when unreachable.
export async function refreshOwnBrand() {
  const session = await getSession()
  if (!session || !(await loadSupabaseConfig())) throw new Error('not connected')
  const brand = await fetchBrand(session.user.id)
  await store(brand)
  return brand
}

export async function saveOwnBrand({ name, color, logo }) {
  const session = await getSession()
  if (!session) throw new Error('Sign in before saving a brand')
  const supabase = await getSupabase()
  const row = { trainer_id: session.user.id, name: name.trim() || null, color: color || null, logo: logo || null }
  const { error } = await supabase.from('trainer_brand').upsert(row)
  if (error) throw error
  const brand = normalizeBrand(row)
  await store(brand)
  return brand
}

export async function removeOwnBrand() {
  const session = await getSession()
  if (!session) throw new Error('Sign in before removing a brand')
  const supabase = await getSupabase()
  const { error } = await supabase.from('trainer_brand').delete().eq('trainer_id', session.user.id)
  if (error) throw error
  await store(null)
}
