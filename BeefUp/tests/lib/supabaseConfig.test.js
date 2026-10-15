import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { validateConfig, sanitizeUrlInput, sanitizeKeyInput } from '../../src/lib/supabaseConfig.js'

const jwt = (payload) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`
const ANON = jwt({ role: 'anon', ref: 'abcdefgh' })
const SERVICE = jwt({ role: 'service_role', ref: 'abcdefgh' })

test('the Data API URL keeps only the project origin', () => {
  for (const pasted of [
    'https://abcdefgh.supabase.co',
    'https://abcdefgh.supabase.co/',
    'https://abcdefgh.supabase.co/rest/v1/',
    '  "https://abcdefgh.supabase.co/rest/v1/?apikey=x"  ',
    'ABCDEFGH.supabase.co/rest/v1',
    'Project URL: https://abcdefgh.supabase.co/rest/v1/ (copy)',
  ]) {
    assert.equal(sanitizeUrlInput(pasted), 'https://abcdefgh.supabase.co', pasted)
  }
})

test('validateConfig stores the origin even if a path slips through', () => {
  const config = validateConfig({ url: 'https://abcdefgh.supabase.co/rest/v1/', anonKey: ANON })
  assert.equal(config.url, 'https://abcdefgh.supabase.co')
  assert.equal(config.projectRef, 'abcdefgh')
})

test('a key pasted with quotes or a label is cleaned', () => {
  assert.equal(sanitizeKeyInput(`  "${ANON}"  `), ANON)
  assert.equal(sanitizeKeyInput(`anon public ${ANON}`), ANON)
  assert.equal(sanitizeKeyInput('sb_publishable_abc123_XYZ'), 'sb_publishable_abc123_XYZ')
})

test('the anon and publishable keys pass, the secret ones never do', () => {
  const url = 'https://abcdefgh.supabase.co'
  assert.equal(validateConfig({ url, anonKey: ANON }).anonKey, ANON)
  assert.equal(validateConfig({ url, anonKey: 'sb_publishable_abc123' }).anonKey, 'sb_publishable_abc123')
  assert.throws(() => validateConfig({ url, anonKey: SERVICE }), { message: 'secret-key' })
  assert.throws(() => validateConfig({ url, anonKey: 'sb_secret_abc123' }), { message: 'secret-key' })
})

test('bad urls and keys keep their reason codes', () => {
  assert.throws(() => validateConfig({ url: 'not a url', anonKey: ANON }), { message: 'bad-url' })
  assert.throws(() => validateConfig({ url: 'http://abcdefgh.supabase.co', anonKey: ANON }), { message: 'not-https' })
  assert.throws(() => validateConfig({ url: 'https://example.com', anonKey: ANON }), { message: 'bad-host' })
  assert.throws(() => validateConfig({ url: 'https://abcdefgh.supabase.co', anonKey: 'nope' }), { message: 'bad-key' })
})
