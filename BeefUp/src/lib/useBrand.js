import { useSyncExternalStore } from 'react'
import { getBrand, subscribeBrand } from './brand.js'

export function useBrand() {
  return useSyncExternalStore(subscribeBrand, getBrand)
}
