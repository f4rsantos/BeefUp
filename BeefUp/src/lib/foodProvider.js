// searchFoods(query)  -> Promise<Food[]>
// getByBarcode(code)  -> Promise<Food | null>
//
// Food shape: { id, name, namePt, kcal, protein, carbs, fat, serving, servingLabel } plus optionally fiber/sugar/saturatedFat/sodium

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
    return null
  },
}

// Stubbed FatSecret provider. Inactive unless VITE_FOOD_PROXY_URL is configured.
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

export const MICRONUTRIENT_KEYS = ['fiber', 'sugar', 'saturatedFat', 'sodium']

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
