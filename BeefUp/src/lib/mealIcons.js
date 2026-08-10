import { Coffee, Sun, Moon, Cookie, Apple, UtensilsCrossed, Pizza, Salad } from 'lucide-react'

export const MEAL_ICONS = {
  coffee: Coffee,
  sun: Sun,
  moon: Moon,
  cookie: Cookie,
  apple: Apple,
  utensils: UtensilsCrossed,
  pizza: Pizza,
  salad: Salad,
}

export const MEAL_ICON_KEYS = Object.keys(MEAL_ICONS)

export function getMealIcon(key) {
  return MEAL_ICONS[key] ?? Cookie
}
