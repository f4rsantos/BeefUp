// Food lookup abstraction. Swappable backends behind one interface:
//   searchFoods(query)  -> Promise<Food[]>
//   getByBarcode(code)  -> Promise<Food | null>
//
// Food shape: { id, name, namePt, kcal, protein, carbs, fat, serving, servingLabel }
// All macro values are per `serving` grams/ml (the default serving for that food).
//
// v1 ships the bundled local provider (fully offline, no secret).
// A FatSecret-backed provider drops in behind the same interface once a
// server-side proxy is available — FatSecret OAuth2 needs a secret that must
// NOT live in the browser, so it is reached via VITE_FOOD_PROXY_URL.

import foodsData from '../data/foods.json'

const ACCENTS = /[̀-ͯ]/g
function normalize(str) {
  // strip accents so "maca" matches "maçã"
  return (str || '').toLowerCase().normalize('NFD').replace(ACCENTS, '')
}

export const localFoodProvider = {
  id: 'local',
  async searchFoods(query) {
    const q = normalize(query).trim()
    if (!q) return foodsData.slice(0, 30)
    return foodsData.filter(
      (f) => normalize(f.name).includes(q) || normalize(f.namePt).includes(q),
    )
  },
  async getByBarcode() {
    // Local dataset has no barcodes; FatSecret provider will handle this.
    return null
  },
}

// Stubbed FatSecret provider. Inactive unless VITE_FOOD_PROXY_URL is configured.
// The proxy is expected to expose GET /search?q= and GET /barcode?code= and to
// return the Food shape above. No client secret is ever handled here.
export function createFatSecretProvider(proxyUrl) {
  return {
    id: 'fatsecret',
    async searchFoods(query) {
      const res = await fetch(`${proxyUrl}/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error(`food proxy ${res.status}`)
      return res.json()
    },
    async getByBarcode(code) {
      const res = await fetch(`${proxyUrl}/barcode?code=${encodeURIComponent(code)}`)
      if (!res.ok) return null
      return res.json()
    },
  }
}

const proxyUrl = import.meta.env.VITE_FOOD_PROXY_URL
export const foodProvider = proxyUrl
  ? createFatSecretProvider(proxyUrl)
  : localFoodProvider

// Scale a food's macros to an arbitrary gram/ml amount.
export function scaleFood(food, grams) {
  const factor = grams / (food.serving || 100)
  return {
    kcal: Math.round(food.kcal * factor),
    protein: +(food.protein * factor).toFixed(1),
    carbs: +(food.carbs * factor).toFixed(1),
    fat: +(food.fat * factor).toFixed(1),
  }
}
