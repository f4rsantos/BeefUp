import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { SCHEMA_REVISION, needsSetupUpdate } from '../../src/lib/setupSql.js'

const dir = new URL('../../supabase/', import.meta.url)
const read = (name) => readFileSync(new URL(name, dir), 'utf8')
const setup = read('setup.sql')
const header = (key) => setup.match(new RegExp(`^-- ${key}: (\\S+)$`, 'm'))?.[1]

test('setup.sql was rebuilt after the last change to its sources', () => {
  const hash = createHash('sha256')
    .update(read('schema.sql') + read('functions.sql') + read('policies.sql'))
    .digest('hex')
    .slice(0, 16)
  assert.equal(header('schema-hash'), hash, 'run supabase/build-setup.sh')
})

test('the app, the header and schema_version() agree on the revision', () => {
  assert.equal(Number(header('schema-revision')), SCHEMA_REVISION)
  assert.match(setup, new RegExp(`function public\\.schema_version\\(\\)[\\s\\S]*?select ${SCHEMA_REVISION};`))
})

test('the trainer is told to re-run setup.sql only when the project is behind', () => {
  assert.equal(needsSetupUpdate(null), false, 'unknown never nags')
  assert.equal(needsSetupUpdate(0), true, 'a project from before schema_version()')
  assert.equal(needsSetupUpdate(SCHEMA_REVISION - 1), true)
  assert.equal(needsSetupUpdate(SCHEMA_REVISION), false)
  assert.equal(needsSetupUpdate(SCHEMA_REVISION + 1), false, 'an older cached app never asks to downgrade')
})
