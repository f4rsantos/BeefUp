// In-memory stand-in for the real backend. Used by the sync tests and to
// exercise the engine without a network. Mirrors what Supabase will do:
// the server, not the client, stamps every row's updated_at.

export function createMemoryBackend({ startAt = 1000 } = {}) {
  const tables = new Map()
  let clock = startAt

  function tick() {
    clock += 1
    return clock
  }

  function tableFor(store) {
    if (!tables.has(store)) tables.set(store, new Map())
    return tables.get(store)
  }

  return {
    async push(store, items) {
      const table = tableFor(store)
      const acked = []
      for (const item of items) {
        const serverAt = tick()
        table.set(item.key, { key: item.key, row: item.row, serverAt, deleted: !!item.deleted })
        acked.push({ key: item.key, serverAt })
      }
      return { acked, serverNow: clock }
    },

    async pull(store, since = 0) {
      const table = tableFor(store)
      const items = [...table.values()].filter((r) => r.serverAt > since)
      return { items, serverNow: clock }
    },

    // Test helpers, not part of the backend contract.
    _dump(store) {
      return [...tableFor(store).values()]
    },
    _now() {
      return clock
    },
  }
}
