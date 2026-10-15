import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchAuthSettings } from '../../src/lib/supabaseConfig.js'

const cfg = { url: 'https://abc.supabase.co', anonKey: 'key' }

function stubFetch(response) {
  const original = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    stubFetch.last = { url, init }
    if (response instanceof Error) throw response
    return response
  }
  return () => { globalThis.fetch = original }
}

test('email confirmation on means sign-ups need a click', async () => {
  const restore = stubFetch({ ok: true, json: async () => ({ mailer_autoconfirm: false }) })
  try {
    assert.deepEqual(await fetchAuthSettings(cfg), { confirmEmail: true })
    assert.equal(stubFetch.last.url, 'https://abc.supabase.co/auth/v1/settings')
    assert.equal(stubFetch.last.init.headers.apikey, 'key')
  } finally { restore() }
})

test('autoconfirm on means no confirmation is needed', async () => {
  const restore = stubFetch({ ok: true, json: async () => ({ mailer_autoconfirm: true }) })
  try {
    assert.deepEqual(await fetchAuthSettings(cfg), { confirmEmail: false })
  } finally { restore() }
})

test('anything unexpected is unknown, never a block', async () => {
  for (const response of [
    { ok: false, json: async () => ({}) },
    { ok: true, json: async () => ({ something: 1 }) },
    new Error('offline'),
  ]) {
    const restore = stubFetch(response)
    try {
      assert.deepEqual(await fetchAuthSettings(cfg), { confirmEmail: null })
    } finally { restore() }
  }
})
