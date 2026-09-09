import test from 'node:test'
import assert from 'node:assert/strict'

import { encodeTrainerInvite, decodeTrainerInvite } from './trainerInvite.js'

const SAMPLE = { url: 'https://abcxyzproj.supabase.co', anonKey: 'anon.key.value', code: 'ABCD2345' }

test('round-trip preserves url, anonKey, and code exactly', () => {
  const decoded = decodeTrainerInvite(encodeTrainerInvite(SAMPLE))
  assert.deepEqual(decoded, SAMPLE)
})

test('encoded output contains no +, / or = -- the workoutShare.js bug this guards against', () => {
  const payloads = [
    SAMPLE,
    { url: 'https://a.supabase.co', anonKey: '???///+++===', code: 'AAAAAAAA' },
    { url: 'https://xyz123.supabase.co/path?a=b&c=d', anonKey: 'x'.repeat(300), code: '23456789' },
  ]
  for (const payload of payloads) {
    const encoded = encodeTrainerInvite(payload)
    assert.ok(!/[+/=]/.test(encoded), `encoded invite must be query-safe as-is: ${encoded}`)
  }
})

test('survives a round trip through URLSearchParams', () => {
  const encoded = encodeTrainerInvite(SAMPLE)
  const query = new URLSearchParams({ t: encoded }).toString()
  const recovered = new URLSearchParams(query).get('t')
  assert.deepEqual(decodeTrainerInvite(recovered), SAMPLE, 'URLSearchParams must not mangle the payload')
})

test('garbage input decodes to null instead of throwing', () => {
  assert.equal(decodeTrainerInvite(''), null, 'empty string')
  assert.equal(decodeTrainerInvite('not-valid-base64!!'), null, 'invalid base64url')

  const wrongShape = btoa(JSON.stringify({ v: 1, foo: 'bar' }))
  assert.equal(decodeTrainerInvite(wrongShape), null, 'valid JSON, wrong shape')

  const missingCode = btoa(JSON.stringify({ v: 1, url: 'https://a.supabase.co', anonKey: 'key' }))
  assert.equal(decodeTrainerInvite(missingCode), null, 'missing field')

  const httpUrl = btoa(JSON.stringify({ v: 1, url: 'http://a.supabase.co', anonKey: 'key', code: 'ABCD2345' }))
  assert.equal(decodeTrainerInvite(httpUrl), null, 'http: url is rejected, only https: allowed')

  const shortCode = btoa(JSON.stringify({ v: 1, url: 'https://a.supabase.co', anonKey: 'key', code: 'ABCD' }))
  assert.equal(decodeTrainerInvite(shortCode), null, 'code must be 8 characters')
})

test('a realistic anon key round-trips', () => {
  const segment = (n) => Array.from({ length: n }, () => 'aZ09-_'[Math.floor(Math.random() * 6)]).join('')
  const jwtLike = { url: 'https://abcxyzproj.supabase.co', anonKey: `${segment(36)}.${segment(160)}.${segment(43)}`, code: 'ABCD2345' }
  assert.equal(jwtLike.anonKey.length, 36 + 1 + 160 + 1 + 43)
  assert.deepEqual(decodeTrainerInvite(encodeTrainerInvite(jwtLike)), jwtLike)
})

test('non-ASCII characters in the payload survive', () => {
  const payload = { url: 'https://abcxyzproj.supabase.co/açentos-ção-🎉', anonKey: 'chave-não-ascii-áéíóú', code: 'ABCD2345' }
  assert.deepEqual(decodeTrainerInvite(encodeTrainerInvite(payload)), payload)
})
