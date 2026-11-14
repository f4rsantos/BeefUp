import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lockAxis } from '../../src/lib/swipeAxis.js'

test('a small movement locks nothing yet', () => {
  assert.equal(lockAxis(null, -5, 6), null)
  assert.equal(lockAxis(null, 0, 0), null)
})

test('a vertical scroll with sideways drift stays vertical', () => {
  assert.equal(lockAxis(null, -30, 200), 'y')
  assert.equal(lockAxis(null, -9, 12), 'y')
})

test('a clear horizontal drag locks to x', () => {
  assert.equal(lockAxis(null, -40, 12), 'x')
})

test('once locked the axis never changes', () => {
  assert.equal(lockAxis('y', -300, 5), 'y')
  assert.equal(lockAxis('x', 2, 400), 'x')
})
