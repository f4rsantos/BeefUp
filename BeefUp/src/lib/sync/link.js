import { getSupabase, isConfigured } from '../supabaseClient.js'
import { getSession } from '../auth.js'
import { getPref, setPref } from '../prefs.js'

// Typing an invite code is the consent step. Nothing shares until the
// student also picks scopes with setScopes(); redeeming alone shares nothing.

async function readCache() {
  const link = await getPref('syncLink', null)
  if (!link) return null
  const scopes = await getPref('syncScopes', [])
  return { ...link, scopes }
}

async function writeCache(link, scopes) {
  await setPref('syncLink', link ? { trainerId: link.trainerId, trainerName: link.trainerName, status: link.status } : null)
  await setPref('syncScopes', scopes)
}

// Cached state renders instantly and offline; the server is asked for the
// current truth whenever it is reachable and reconciled back into the cache.
export async function getLink() {
  const cached = await readCache()
  if (!isConfigured()) return cached

  const session = await getSession()
  if (!session) return cached

  try {
    const supabase = await getSupabase()
    const { data: row, error } = await supabase
      .from('trainer_links')
      .select('trainer_id, status, scopes')
      .eq('client_id', session.user.id)
      .eq('status', 'accepted')
      .maybeSingle()
    if (error || !row) return cached

    let trainerName = cached?.trainerName ?? null
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', row.trainer_id)
      .maybeSingle()
    if (profile?.display_name) trainerName = profile.display_name

    const fresh = { trainerId: row.trainer_id, trainerName, status: row.status, scopes: row.scopes || [] }
    await writeCache(fresh, fresh.scopes)
    return fresh
  } catch {
    return cached
  }
}

// Local-only check, never touches the network: safe to call on every render
// or as a gate before anything that must stay offline-silent.
export async function isLinked() {
  const link = await getPref('syncLink', null)
  return !!link && link.status === 'accepted'
}

export async function redeemInvite(code) {
  if (!isConfigured()) return null
  const session = await getSession()
  if (!session) throw new Error('Sign in before redeeming an invite')

  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('redeem_invite', {
    invite_code: code,
    want_scopes: [],
  })
  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  const trainerId = row?.trainer_id ?? row?.id ?? null
  const trainerName = row?.trainer_name ?? row?.display_name ?? null
  if (!trainerId) throw new Error('Invite code not accepted')

  const link = { trainerId, trainerName, status: 'accepted' }
  await writeCache(link, [])
  return { ...link, scopes: [] }
}

export async function setScopes(scopes) {
  const cached = await getPref('syncLink', null)
  await setPref('syncScopes', scopes)
  if (!cached) return getLink()

  if (isConfigured()) {
    const session = await getSession()
    if (session) {
      try {
        const supabase = await getSupabase()
        await supabase
          .from('trainer_links')
          .update({ scopes })
          .eq('trainer_id', cached.trainerId)
          .eq('client_id', session.user.id)
      } catch {
        // Offline edit stays cached; the next reachable getLink() reconciles it.
      }
    }
  }
  return getLink()
}

// Clears local link state and stops sync. Does NOT delete the sync_rows the
// student already uploaded — that data is theirs and stays in their own
// Supabase account. It only revokes the trainer_links row so the trainer's
// RLS-granted read/write access ends. Deleting a person's data is never a
// silent side effect of unlinking; that would need its own explicit action.
export async function unlink() {
  const cached = await getPref('syncLink', null)
  await setPref('syncLink', null)
  await setPref('syncScopes', [])
  await setPref('syncLastSyncAt', null)

  if (!isConfigured() || !cached) return
  const session = await getSession()
  if (!session) return

  try {
    const supabase = await getSupabase()
    await supabase
      .from('trainer_links')
      .update({ status: 'revoked' })
      .eq('trainer_id', cached.trainerId)
      .eq('client_id', session.user.id)
  } catch {
    // Local state is already unlinked; the revoke retries once reachable.
  }
}
