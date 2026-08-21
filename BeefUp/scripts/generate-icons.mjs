// Generates the PWA icon set from public/logo.png.
// The logo is pixel art, so it is only ever scaled by whole integer factors with
// nearest-neighbour and then padded onto the target canvas — never resampled to fit.
//
//   npm run icons
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const SRC = 'public/logo.png'
const OUT = 'public/icons'
const OPAQUE = '#ffffff'
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

const { width, height } = await sharp(SRC).metadata()

mkdirSync(OUT, { recursive: true })

// Largest whole-number scale whose result still fits inside `size * fill`.
function integerScale(size, fill) {
  const box = size * fill
  return Math.max(1, Math.floor(Math.min(box / width, box / height)))
}

async function icon(size, fill, background, out) {
  const factor = integerScale(size, fill)
  const glyph = await sharp(SRC)
    .resize(width * factor, height * factor, { kernel: 'nearest' })
    .png()
    .toBuffer()

  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toFile(`${OUT}/${out}`)

  console.log(`${out}: ${width * factor}x${height * factor} glyph (${factor}x) on ${size}x${size}`)
}

// "any" icons: transparent, logo as large as an integer scale allows.
await icon(192, 1, TRANSPARENT, 'icon-192.png')
await icon(512, 1, TRANSPARENT, 'icon-512.png')

// "maskable" icons: opaque background, glyph kept inside the ~60% safe zone that
// launchers may crop to a circle or squircle.
await icon(192, 0.6, OPAQUE, 'maskable-192.png')
await icon(512, 0.6, OPAQUE, 'maskable-512.png')

// iOS ignores manifest icons and composites the apple-touch-icon on black, so it
// needs its own opaque 180x180.
await icon(180, 0.72, OPAQUE, 'apple-touch-icon.png')
