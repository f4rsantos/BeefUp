import { BRAND_LOGO_MAX } from './brand.js'

const SIZE = 192
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']

// Shrinks to a 192px square data URI. Throws 'type' or 'size'.
export async function fileToLogoDataUrl(file) {
  if (!file || !ACCEPTED.includes(file.type)) throw new Error('type')
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('type')
  }

  const scale = Math.min(SIZE / bitmap.width, SIZE / bitmap.height, 1)
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  for (const [type, quality] of [['image/png'], ['image/webp', 0.85], ['image/webp', 0.6]]) {
    const url = canvas.toDataURL(type, quality)
    if (url.startsWith(`data:${type}`) && url.length <= BRAND_LOGO_MAX) return url
  }
  throw new Error('size')
}
