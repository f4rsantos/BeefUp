import { test } from 'node:test'
import assert from 'node:assert/strict'
import { friendlyError } from './friendlyError.js'
import strings from '../strings.js'

const t = strings.pt
console.warn = () => {}

test('network failure -> connection message', () => {
  assert.equal(friendlyError(new TypeError('Failed to fetch'), t), t.errNetwork)
})

test('a code bug is not blamed on the network', () => {
  assert.equal(friendlyError(new TypeError("Cannot read properties of undefined (reading 'x')"), t), t.errGeneric)
})

test('supabase auth messages', () => {
  assert.equal(friendlyError({ message: 'Invalid login credentials' }, t), t.errBadCredentials)
  assert.equal(friendlyError({ message: 'User already registered' }, t), t.errAlreadyRegistered)
  assert.equal(friendlyError({ message: 'Password should be at least 6 characters.' }, t), t.errWeakPassword)
  assert.equal(friendlyError({ message: 'Email not confirmed' }, t), t.errEmailNotConfirmed)
})

test('SQL exceptions from redeem_invite and the trainer guard', () => {
  assert.equal(friendlyError({ message: 'this invite code has expired' }, t), t.errInviteExpired)
  assert.equal(friendlyError({ message: 'this invite code has been revoked' }, t), t.errInviteRevoked)
  assert.equal(friendlyError({ message: 'invalid invite code' }, t), t.errInviteInvalid)
  assert.equal(friendlyError({ message: 'profiles: this project already has a trainer' }, t), t.trainerSetupTrainerTaken)
})

test('must be signed in to redeem is a session problem, not an invite one', () => {
  assert.equal(friendlyError({ message: 'must be signed in to redeem an invite' }, t), t.errSession)
})

test('RLS by code or by message', () => {
  assert.equal(friendlyError({ code: '42501', message: 'x' }, t), t.errPermission)
  assert.equal(friendlyError({ message: 'new row violates row-level security policy for table "sync_rows"' }, t), t.errPermission)
})

test('status codes and unknown errors', () => {
  assert.equal(friendlyError({ status: 401, message: 'x' }, t), t.errSession)
  assert.equal(friendlyError({ status: 429, message: 'x' }, t), t.errRateLimit)
  assert.equal(friendlyError('boom', t), t.errGeneric)
  assert.equal(friendlyError(null, t), t.errGeneric)
})
