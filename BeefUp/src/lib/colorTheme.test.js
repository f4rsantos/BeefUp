import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveAccentTokens, hexToRgb, contrast } from './colorTheme.js'

const WHITE = hexToRgb('#ffffff')
const LIGHT_SURFACE2 = hexToRgb('#eef0f3')
const DARK_SURFACE2 = hexToRgb('#1a202a')
const stops = (grad) => grad.match(/#[0-9a-f]{6}/gi).slice(0, 2).map(hexToRgb)

// Includes the hard cases: pale yellow, cyan, near-white, near-black.
const PICKS = ['#109a14', '#ffeb3b', '#00e5ff', '#f5f5f5', '#101010', '#ff00ff', '#7c4dff', '#ff9800']

for (const hex of PICKS) {
  test(`custom accent ${hex} stays readable in both themes`, () => {
    const { light, dark } = deriveAccentTokens(hex)
    assert.ok(contrast(hexToRgb(light.accent), LIGHT_SURFACE2) >= 4.5, 'light text on surface2')
    assert.ok(contrast(hexToRgb(light.accent), hexToRgb(light.soft)) >= 4.5, 'light text on soft')
    for (const s of stops(light.gradAccent)) assert.ok(contrast(WHITE, s) >= 4.5, 'white on light button')
    assert.ok(contrast(hexToRgb(dark.accent), DARK_SURFACE2) >= 4.5, 'dark text on surface2')
    assert.ok(contrast(hexToRgb(dark.accent), hexToRgb(dark.soft)) >= 4.5, 'dark text on soft')
    for (const s of stops(dark.gradAccent)) assert.ok(contrast(WHITE, s) >= 4.5, 'white on dark button')
  })
}
