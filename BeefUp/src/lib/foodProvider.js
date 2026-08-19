import { searchProducts, fetchProduct } from './openFoodFacts'

export const MICRONUTRIENTS = [
  { key: 'fiber', unit: 'g', rda: 30, off: 'fiber_100g', factor: 1 },
  { key: 'sugar', unit: 'g', rda: 50, off: 'sugars_100g', factor: 1 },
  { key: 'saturatedFat', unit: 'g', rda: 20, off: 'saturated-fat_100g', factor: 1 },
  { key: 'transFat', unit: 'g', rda: 2, off: 'trans-fat_100g', factor: 1 },
  { key: 'sodium', unit: 'mg', rda: 2300, off: 'sodium_100g', factor: 1000 },
  { key: 'potassium', unit: 'mg', rda: 3500, off: 'potassium_100g', factor: 1000 },
  { key: 'calcium', unit: 'mg', rda: 1000, off: 'calcium_100g', factor: 1000 },
  { key: 'iron', unit: 'mg', rda: 14, off: 'iron_100g', factor: 1000 },
]

export const MICRONUTRIENT_KEYS = MICRONUTRIENTS.map((m) => m.key)

const KCAL_PER_KJ = 1 / 4.184

function num(value) {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(n) ? n : null
}

function readKcal(nutriments) {
  const kcal = num(nutriments['energy-kcal_100g'])
  if (kcal != null) return Math.round(kcal)
  const kj = num(nutriments.energy_100g)
  return kj != null ? Math.round(kj * KCAL_PER_KJ) : null
}

function readMicros(nutriments) {
  const out = {}
  for (const { key, off, factor } of MICRONUTRIENTS) {
    const raw = num(nutriments[off])
    if (raw != null) out[key] = +(raw * factor).toFixed(2)
  }
  if (out.sodium == null) {
    const salt = num(nutriments.salt_100g)
    if (salt != null) out.sodium = +((salt / 2.5) * 1000).toFixed(2)
  }
  return out
}

function composeName(base, brands) {
  const name = (base || '').trim()
  if (!name) return ''
  const brand = (brands || '').split(',')[0]?.trim()
  return brand && !name.toLowerCase().includes(brand.toLowerCase())
    ? `${name} (${brand})`
    : name
}

export function normalizeProduct(product) {
  if (!product?.code) return null
  const nutriments = product.nutriments ?? {}

  const kcal = readKcal(nutriments)
  if (kcal == null) return null

  const en = composeName(product.product_name, product.brands)
  const pt = composeName(product.product_name_pt || product.product_name, product.brands)
  if (!en && !pt) return null

  const unitGrams = num(product.serving_quantity)

  return {
    id: String(product.code),
    name: en || pt,
    namePt: pt || en,
    kcal,
    protein: num(nutriments.proteins_100g) ?? 0,
    carbs: num(nutriments.carbohydrates_100g) ?? 0,
    fat: num(nutriments.fat_100g) ?? 0,
    serving: 100,
    servingLabel: '100 g',
    ...(unitGrams ? { unitGrams } : {}),
    ...readMicros(nutriments),
    source: 'off',
  }
}

export const foodProvider = {
  id: 'openfoodfacts',
  async searchFoods(query, lang = 'pt', signal) {
    const products = await searchProducts(query, lang, signal)
    const seen = new Set()
    const foods = []
    for (const p of products) {
      const food = normalizeProduct(p)
      if (!food || seen.has(food.id)) continue
      seen.add(food.id)
      foods.push(food)
    }
    return foods
  },
  async getByBarcode(code, lang = 'pt', signal) {
    const product = await fetchProduct(code, lang, signal)
    return product ? normalizeProduct(product) : null
  },
}

export function scaleFood(food, grams) {
  const factor = grams / (food.serving || 100)
  const scaled = {
    kcal: Math.round(food.kcal * factor),
    protein: +(food.protein * factor).toFixed(1),
    carbs: +(food.carbs * factor).toFixed(1),
    fat: +(food.fat * factor).toFixed(1),
  }
  for (const key of MICRONUTRIENT_KEYS) {
    if (food[key] != null) scaled[key] = +(food[key] * factor).toFixed(1)
  }
  return scaled
}
