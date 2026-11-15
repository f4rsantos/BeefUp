import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css= readFileSync(new URL('../../src/styles/theme.css', import.meta.url), 'utf8')
const escape= (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ruleBody= (selector) => css.match(new RegExp(`^${escape(selector)} \\{([^}]*)\\}`, 'm'))?.[1] ?? ''

const SCALE= {
  '.large-title h1': 'page',
  '.nav-header .large-title h1': 'subpage',
  '.section-header-title': 'section',
  '.card-title': 'card',
  '.feature-card-title': 'headline',
  '.app-shell .workout-card-title': 'headline',
}

test('the title scale is defined once as theme variables', () => {
  for (const name of new Set(Object.values(SCALE))) {
    assert.match(css, new RegExp(`--font-title-${name}:\\s*\\d{3} \\d+px/`), name)
  }
})

for (const [selector, name] of Object.entries(SCALE)) {
  test(`${selector} takes its font from the ${name} title variable`, () => {
    const body= ruleBody(selector)
    assert.match(body, new RegExp(`font:\\s*var\\(--font-title-${name}\\)`))
    assert.doesNotMatch(body, /font-size|font-weight/)
  })
}

test('cards that headline a workout, a plan or a feature share one variable', () => {
  const headline= (selector) => ruleBody(selector).match(/var\((--font-title-[a-z]+)\)/)?.[1]
  assert.equal(headline('.app-shell .workout-card-title'), headline('.feature-card-title'))
})
