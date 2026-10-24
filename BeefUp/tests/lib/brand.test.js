import 'fake-indexeddb/auto'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { db } from '../../src/lib/db.js'
import { isLocalOnlySetting } from '../../src/lib/prefs.js'
import {
  normalizeBrand, resolveAccent, brandTitle, loadBrandCache, getBrand, clearBrand, BRAND_LOGO_MAX,
} from '../../src/lib/brand.js'

const PNG = 'data:image/png;base64,iVBORw0KGgo='

test('a valid brand keeps its name, colour and logo', () => {
  const brand = normalizeBrand({ name: '  Ginásio Silva ', color: '#2461E6', logo: PNG })
  assert.deepEqual(brand, { name: 'Ginásio Silva', color: '#2461e6', logo: PNG })
})

test('anything that is not a clean #rrggbb colour is dropped', () => {
  for (const color of ['red', '#fff', 'red; background:url(x)', '#12345g', 'javascript:alert(1)']) {
    assert.equal(normalizeBrand({ name: 'A', color }).color, null, color)
  }
})

test('only small png, jpeg and webp data URIs are accepted as a logo', () => {
  assert.equal(normalizeBrand({ name: 'A', logo: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }).logo, null)
  assert.equal(normalizeBrand({ name: 'A', logo: 'https://evil.example/x.png' }).logo, null)
  assert.equal(normalizeBrand({ name: 'A', logo: 'data:image/png;base64,<script>' }).logo, null)
  assert.equal(normalizeBrand({ name: 'A', logo: `data:image/png;base64,${'A'.repeat(BRAND_LOGO_MAX)}` }).logo, null)
  assert.equal(normalizeBrand({ name: 'A', logo: 'data:image/webp;base64,UklGRg==' }).logo, 'data:image/webp;base64,UklGRg==')
})

test('the name is trimmed and cut to 40 characters', () => {
  assert.equal(normalizeBrand({ name: 'x'.repeat(60) }).name.length, 40)
})

test('an empty or invalid row is no brand at all', () => {
  assert.equal(normalizeBrand(null), null)
  assert.equal(normalizeBrand({ name: '   ', color: 'nope', logo: 'nope' }), null)
  assert.equal(normalizeBrand('text'), null)
})

test('the trainer colour is the default and a chosen colour wins', () => {
  const brand = { name: 'A', color: '#2461e6', logo: null }
  const own = { accentColor: 'pink', customAccentHex: '#109a14' }
  assert.deepEqual(resolveAccent({ brand, accentChosen: false, ...own }), { accentColor: 'custom', customAccentHex: '#2461e6' })
  assert.deepEqual(resolveAccent({ brand, accentChosen: true, ...own }), own)
  assert.deepEqual(resolveAccent({ brand: null, accentChosen: false, ...own }), own)
  assert.deepEqual(resolveAccent({ brand: { name: 'A', color: null, logo: null }, accentChosen: false, ...own }), own)
})

test('the title is the brand name, else BeefUp', () => {
  assert.equal(brandTitle({ name: 'Ginásio Silva' }), 'Ginásio Silva')
  assert.equal(brandTitle(null), 'BeefUp')
  assert.equal(brandTitle({ name: '', logo: PNG }), 'BeefUp')
})

test('the cache restores a brand, drops a corrupt one and can be cleared', async () => {
  await db.setSetting('brand:cache', { name: 'Ginásio Silva', color: '#2461e6', logo: null })
  await loadBrandCache()
  assert.equal(getBrand().name, 'Ginásio Silva')

  await db.setSetting('brand:cache', { name: 'X', color: 'red; x', logo: 'data:text/html;base64,AAAA' })
  await loadBrandCache()
  assert.deepEqual(getBrand(), { name: 'X', color: null, logo: null })

  await clearBrand()
  assert.equal(getBrand(), null)
  await loadBrandCache()
  assert.equal(getBrand(), null)
})

test('the cached brand never travels in a backup', () => {
  assert.equal(isLocalOnlySetting('brand:cache'), true)
  assert.equal(isLocalOnlySetting('brand:noticeDismissed'), true)
})
