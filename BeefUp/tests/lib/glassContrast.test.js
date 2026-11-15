import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deriveAccentTokens, hexToRgb, contrast, PRESET_ACCENTS } from '../../src/lib/colorTheme.js'

const css= readFileSync(new URL('../../src/styles/theme.css', import.meta.url), 'utf8')
const mutedRules= [...css.matchAll(/--muted:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/g)]
const parse= (m) => ({ rgb: { r: +m[1], g: +m[2], b: +m[3] }, alpha: +m[4] })
const LIGHT_MUTED= parse(mutedRules[0])
const DARK_MUTED= parse(mutedRules[1])

const mix= (top, alpha, bottom) => ({
  r: top.r * alpha + bottom.r * (1 - alpha),
  g: top.g * alpha + bottom.g * (1 - alpha),
  b: top.b * alpha + bottom.b * (1 - alpha),
})

const LIGHT= { base: hexToRgb('#eef0f5'), glass: 0.46, white: { r: 255, g: 255, b: 255 }, layers: (a) => [[a, 0.26], [{ r: 88, g: 132, b: 255 }, 0.2], [a, 0.18], [{ r: 255, g: 170, b: 90 }, 0.14]] }
const DARK= { base: hexToRgb('#07080c'), glass: 0.05, white: { r: 255, g: 255, b: 255 }, layers: (a) => [[a, 0.34], [{ r: 70, g: 100, b: 255 }, 0.24], [a, 0.22], [{ r: 255, g: 120, b: 60 }, 0.12]] }

function cards(theme, accent) {
  return theme.layers(accent).map(([rgb, alpha]) => mix(theme.white, theme.glass, mix(rgb, alpha, theme.base)))
}

const PICKS= ['#109a14', '#101010', '#ff00ff', '#7c4dff']
const HEXES= [...PRESET_ACCENTS.map((p) => p.hex), ...PICKS]

for (const hex of HEXES) {
  test(`muted text stays at 4.5:1 on glass over the ${hex} canvas`, () => {
    const { light, dark }= deriveAccentTokens(hex)
    for (const card of cards(LIGHT, hexToRgb(light.accent))) {
      const text= mix(LIGHT_MUTED.rgb, LIGHT_MUTED.alpha, card)
      assert.ok(contrast(text, card) >= 4.5, `light ${hex}`)
    }
    for (const card of cards(DARK, hexToRgb(dark.accent))) {
      const text= mix(DARK_MUTED.rgb, DARK_MUTED.alpha, card)
      assert.ok(contrast(text, card) >= 4.5, `dark ${hex}`)
    }
  })
}

for (const { id, hex } of PRESET_ACCENTS) {
  test(`active tab icon stays at 3:1 on glass for ${id}`, () => {
    const { light, dark }= deriveAccentTokens(hex)
    for (const card of cards(LIGHT, hexToRgb(light.accent))) assert.ok(contrast(hexToRgb(light.accent), card) >= 3, `light ${id}`)
    for (const card of cards(DARK, hexToRgb(dark.accent))) assert.ok(contrast(hexToRgb(dark.accent), card) >= 3, `dark ${id}`)
  })
}

test('tab labels are at least 12px', () => {
  const size= css.match(/\.tab-bar-item\s*\{[^}]*font-size:\s*([\d.]+)px/)
  assert.ok(size && +size[1] >= 12)
})
