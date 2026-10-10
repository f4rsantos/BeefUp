// Pure color math shared by the accent-color swatches and the custom RGB
// wheel: converts an arbitrary hex into the same set of derived tokens
// (--accent, --accent-soft, --grad-accent, --grad-hero, --shadow-glow) that
// the 8 curated presets already use as static CSS blocks in index.css.

const WHITE = { r: 255, g: 255, b: 255 }
const BLACK = { r: 0, g: 0, b: 0 }
const BG_DARK = { r: 6, g: 8, b: 11 }

export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  }
}

export function rgbToHex({ r, g, b }) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function mix(a, b, t) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t }
}

export function hsvToRgb(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const [r, g, b] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] :
    [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

export function rgbToHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

const SURFACE2_LIGHT = { r: 238, g: 240, b: 243 }
const SURFACE2_DARK = { r: 26, g: 32, b: 42 }
// WCAG AA 4.5, plus rounding headroom.
const MIN_CONTRAST = 4.6

function luminance({ r, g, b }) {
  const lin = (c) => {
    const v = Math.max(0, Math.min(255, Math.round(c))) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Nudges rgb toward `toward` until readable on `against`.
function shiftUntilReadable(rgb, toward, against) {
  let out = rgb
  for (let t = 0.02; contrast(out, against) < MIN_CONTRAST && t <= 1; t += 0.02) {
    out = mix(rgb, toward, t)
  }
  return out
}

// Dark mode: text needs a lighter shade, buttons darker.
function deriveTokens(rgb, mode) {
  const darkSoft = mix(rgb, BG_DARK, 0.75)
  // Text must read on the lightest surface it sits on.
  const darkGround = luminance(darkSoft) > luminance(SURFACE2_DARK) ? darkSoft : SURFACE2_DARK
  const text = mode === 'light'
    ? shiftUntilReadable(rgb, BLACK, SURFACE2_LIGHT)
    : shiftUntilReadable(rgb, WHITE, darkGround)
  const button = mode === 'light' ? text : shiftUntilReadable(rgb, BLACK, WHITE)
  const soft = mode === 'light' ? mix(text, WHITE, 0.92) : darkSoft
  const gradTo = mix(button, BLACK, 0.12)
  const heroFrom = mix(button, BLACK, 0.45)
  const heroTo = mix(button, BLACK, 0.30)
  const alpha = mode === 'light' ? 0.45 : 0.5
  const blur = mode === 'light' ? 28 : 30
  return {
    accent: rgbToHex(text),
    soft: rgbToHex(soft),
    gradAccent: `linear-gradient(135deg, ${rgbToHex(button)} 0%, ${rgbToHex(gradTo)} 100%)`,
    gradHero: `linear-gradient(140deg, ${rgbToHex(heroFrom)} 0%, ${rgbToHex(button)} 45%, ${rgbToHex(heroTo)} 100%)`,
    glow: `0 8px ${blur}px -6px rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`,
  }
}

// index.css presets are this function's output.
export function deriveAccentTokens(hex) {
  const rgb = hexToRgb(hex)
  return {
    light: deriveTokens(rgb, 'light'),
    dark: deriveTokens(mix(rgb, WHITE, 0.15), 'dark'),
  }
}

function cssVarsBlock(tokens) {
  return `--accent:${tokens.accent};--accent-soft:${tokens.soft};--success:${tokens.accent};` +
    `--grad-accent:${tokens.gradAccent};--grad-hero:${tokens.gradHero};--shadow-glow:${tokens.glow};`
}

const CUSTOM_STYLE_ID = 'custom-accent-style'

// Injects/updates a <style> tag with the same attribute-selector shape as the
// static presets in index.css, scoped to data-accent="custom", and flips the
// document to that attribute. Called both from the picker (live, per drag)
// and once on app boot to reapply a previously saved custom color.
export function applyCustomAccent(hex) {
  const { light, dark } = deriveAccentTokens(hex)
  const css =
    `[data-accent="custom"]{${cssVarsBlock(light)}}\n` +
    `[data-theme="dark"][data-accent="custom"]{${cssVarsBlock(dark)}}\n` +
    `@media (prefers-color-scheme: dark){[data-theme="system"][data-accent="custom"]{${cssVarsBlock(dark)}}}\n` +
    `@media (prefers-color-scheme: light){[data-theme="system"][data-accent="custom"]{${cssVarsBlock(light)}}}`

  let tag = document.getElementById(CUSTOM_STYLE_ID)
  if (!tag) {
    tag = document.createElement('style')
    tag.id = CUSTOM_STYLE_ID
    document.head.appendChild(tag)
  }
  tag.textContent = css
  document.documentElement.setAttribute('data-accent', 'custom')
}

// The 8 curated shortcuts shown beside the wheel — same hexes as the static
// index.css blocks (source of truth for those stays the CSS file; this list
// is just what the UI needs to render and select them).
export const PRESET_ACCENTS = [
  { id: 'green', hex: '#0d7b10', label: 'colorGreen' },
  { id: 'blue', hex: '#2461e6', label: 'colorBlue' },
  { id: 'purple', hex: '#9333ea', label: 'colorPurple' },
  { id: 'pink', hex: '#c9246d', label: 'colorPink' },
  { id: 'red', hex: '#cf2424', label: 'colorRed' },
  { id: 'orange', hex: '#be400c', label: 'colorOrange' },
]

// Which hex the accent picker is currently showing: a preset's own colour, or
// the user's custom wheel pick.
export function accentHexOf(accentColor, customAccentHex) {
  if (accentColor === 'custom') return customAccentHex
  return PRESET_ACCENTS.find((p) => p.id === accentColor)?.hex ?? PRESET_ACCENTS[0].hex
}
