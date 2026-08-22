// Supabase backend for the sync engine. Reads/writes the generic `sync_rows`
// table; mirrors what backends/memory.js does, engine.js drives both the
// same way. The pure mapping below has no SDK dependency so it stays
// testable without a live Supabase project.

import { getSupabase } from '../../supabaseClient.js'
import { scopeOf } from '../stores.js'

const PUSH_BATCH_SIZE = 500

// A server row -> the shape engine.js expects from pull().
export function rowToItem(row) {
  return {
    key: row.row_key,
    row: row.data,
    serverAt: new Date(row.updated_at).getTime(),
    deleted: row.deleted_at != null,
  }
}

// A push() item -> the row to upsert. updated_at is never sent, the
// server stamps it. deleted_at just needs to be non-null to mark a
// tombstone, its exact value isn't part of the sync ordering.
export function itemToRow(item, store, userId) {
  return {
    user_id: userId,
    store,
    row_key: item.key,
    scope: scopeOf(store),
    data: item.deleted ? null : item.row,
    deleted_at: item.deleted ? new Date().toISOString() : null,
  }
}

export function chunkForPush(items, size = PUSH_BATCH_SIZE) {
  const out = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function requireClient() {
  const client = await getSupabase()
  if (!client) throw new Error('supabase: not configured')
  return client
}

// getSession reads the cached token; getUser would hit the network on every
// store, in both directions, for the caller's own id.
async function currentUserId(client) {
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  const id = data?.session?.user?.id
  if (!id) throw new Error('supabase: no authenticated user')
  return id
}

// Server time, never Date.now() — client clocks are not trusted. Needs a
// `server_now()` SQL function returning `now()`, see report.
async function serverNowMs(client) {
  const { data, error } = await client.rpc('server_now')
  if (error) throw error
  return new Date(data).getTime()
}

export function createSupabaseBackend() {
  return {
    async pull(store, sinceMs = 0) {
      const client = await requireClient()
      const userId = await currentUserId(client)
      const sinceIso = new Date(sinceMs || 0).toISOString()

      // Read the clock BEFORE the select. A row committed while the query
      // runs is missing from the results, so the cursor must stay behind it
      // or the next pull skips past it and it is lost for good. Reading
      // early can only re-pull a row, which merges to a no-op.
      const serverNow = await serverNowMs(client)

      const { data, error } = await client
        .from('sync_rows')
        .select('row_key, data, updated_at, deleted_at')
        .eq('store', store)
        .eq('user_id', userId)
        .gt('updated_at', sinceIso)

      if (error) throw error

      return { items: (data || []).map(rowToItem), serverNow }
    },

    async push(store, items) {
      if (!items.length) return { acked: [], serverNow: 0 }

      const client = await requireClient()
      const userId = await currentUserId(client)
      const acked = []

      for (const batch of chunkForPush(items)) {
        const rows = batch.map((item) => itemToRow(item, store, userId))
        const { data, error } = await client
          .from('sync_rows')
          .upsert(rows, { onConflict: 'user_id,store,row_key' })
          .select('row_key, updated_at')

        if (error) throw error
        for (const row of data || []) {
          acked.push({ key: row.row_key, serverAt: new Date(row.updated_at).getTime() })
        }
      }

      const serverNow = await serverNowMs(client)
      return { acked, serverNow }
    },
  }
}
