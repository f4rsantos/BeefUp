import { getSupabase, isConfigured } from './supabaseClient.js'
import { STORES } from './stores.js'
import { scopeOf, storesForScopes } from './sync/stores.js'

// Trainer-side access to sync_rows/trainer_links/trainer_invites through the
// shared Supabase client. Reads cover whatever the client shared; writes are
// confined to prescribing plans and workouts. Nutrition and measures are
// read-only here, and the database refuses a write to them regardless.

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// A trainer prescribes plans and workouts, nothing else. Sessions and custom
// exercises share the 'workouts' scope but belong to the client.
const PRESCRIBABLE = [STORES.plans, STORES.workouts]

export function isPrescribable(store) {
  return PRESCRIBABLE.includes(store)
}

function randomCode(len = 8) {
  let out = ''
  const bytes = crypto.getRandomValues(new Uint32Array(len))
  for (let i = 0; i < len; i++) out += CODE_CHARS[bytes[i] % CODE_CHARS.length]
  return out
}

// Resolves the signed-in trainer's id on the same client instance used for
// every query below. Returns null when unconfigured or signed out.
async function trainerClient() {
  if (!isConfigured()) return null
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const trainerId = data?.session?.user?.id ?? null
  return trainerId ? { supabase, trainerId } : null
}

// Accepted links for the signed-in trainer, with each client's shared scopes.
export async function listTrainerLinks() {
  const ctx = await trainerClient()
  if (!ctx) return []
  const { supabase, trainerId } = ctx

  const { data: links, error } = await supabase
    .from('trainer_links')
    .select('client_id, scopes, status, updated_at')
    .eq('trainer_id', trainerId)
    .eq('status', 'accepted')
  if (error) throw error
  if (!links?.length) return []

  const ids = links.map((l) => l.client_id)
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', ids)
  if (profileErr) throw profileErr
  const nameById = new Map((profiles || []).map((p) => [p.id, p.display_name]))

  return links.map((l) => ({
    clientId: l.client_id,
    name: nameById.get(l.client_id) || l.client_id,
    scopes: l.scopes || [],
    status: l.status,
    updatedAt: l.updated_at,
  }))
}

// One store's rows for a client, shaped exactly like db.js's getAll() —
// so planUtils/nutritionStats work on them unchanged.
export async function getClientRows(clientId, store) {
  if (!isConfigured()) return []
  const supabase = await getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('sync_rows')
    .select('data')
    .eq('user_id', clientId)
    .eq('store', store)
    .is('deleted_at', null)
  if (error) throw error
  return (data || []).map((r) => r.data)
}

// Every store a client's scopes cover, keyed by store name.
export async function getClientData(clientId, scopes) {
  const stores = storesForScopes(scopes)
  const pairs = await Promise.all(stores.map(async (store) => [store, await getClientRows(clientId, store)]))
  return Object.fromEntries(pairs)
}

// Writes a plan or workout into the client's own rows. Their sync engine
// pulls it like any other remote change. updated_at is never sent — the
// database stamps it, and the client's cursor depends on that.
export async function prescribeRow(clientId, store, row) {
  if (!isPrescribable(store)) throw new Error(`refusing to prescribe into ${store}`)
  const ctx = await trainerClient()
  if (!ctx) throw new Error('not signed in')
  const { supabase, trainerId } = ctx

  const key = row.id
  if (!key) throw new Error('prescribed row needs an id')

  // Marks the row as the trainer's, so the client's app can show it as
  // prescribed and keep it read-only on their side.
  const data = { ...row, prescribedBy: trainerId }

  const { error } = await supabase
    .from('sync_rows')
    .upsert(
      { user_id: clientId, store, row_key: key, scope: scopeOf(store), data, deleted_at: null },
      { onConflict: 'user_id,store,row_key' },
    )
  if (error) throw error
  return data
}

// Tombstones a prescribed row. A trainer has no DELETE policy on sync_rows,
// which matches the engine: deletions are an update, never a hard delete.
export async function unprescribeRow(clientId, store, rowKey) {
  if (!isPrescribable(store)) throw new Error(`refusing to write into ${store}`)
  const ctx = await trainerClient()
  if (!ctx) throw new Error('not signed in')
  const { supabase } = ctx

  const { error } = await supabase
    .from('sync_rows')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', clientId)
    .eq('store', store)
    .eq('row_key', rowKey)
  if (error) throw error
}

// Ends the link from the trainer's side. Revoking cuts their access straight
// away through RLS; the client's own rows are left untouched.
export async function unlinkClient(clientId) {
  const ctx = await trainerClient()
  if (!ctx) throw new Error('not signed in')
  const { supabase, trainerId } = ctx

  const { error } = await supabase
    .from('trainer_links')
    .update({ status: 'revoked' })
    .eq('trainer_id', trainerId)
    .eq('client_id', clientId)
  if (error) throw error
}

// Live (not revoked) invite codes for the signed-in trainer, newest first.
export async function listInvites() {
  const ctx = await trainerClient()
  if (!ctx) return []
  const { supabase, trainerId } = ctx

  const { data, error } = await supabase
    .from('trainer_invites')
    .select('code, created_at, expires_at, revoked')
    .eq('trainer_id', trainerId)
    .eq('revoked', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Generates a fresh invite code, retrying on the rare unique-constraint hit.
export async function createInvite() {
  const ctx = await trainerClient()
  if (!ctx) throw new Error('not signed in')
  const { supabase, trainerId } = ctx

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode()
    const { error } = await supabase.from('trainer_invites').insert({ code, trainer_id: trainerId })
    if (!error) return code
    if (error.code !== '23505') throw error
  }
  throw new Error('could not generate a unique code')
}

export async function revokeInvite(code) {
  if (!isConfigured()) throw new Error('sync not configured')
  const supabase = await getSupabase()
  if (!supabase) throw new Error('sync not configured')

  const { error } = await supabase.from('trainer_invites').update({ revoked: true }).eq('code', code)
  if (error) throw error
}
