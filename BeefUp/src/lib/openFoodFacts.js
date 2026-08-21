const BASE = 'https://world.openfoodfacts.org'
const SEARCH_URL = `${BASE}/cgi/search.pl`
const PRODUCT_URL = `${BASE}/api/v2/product`

const FIELDS = [
  'code',
  'product_name',
  'product_name_pt',
  'brands',
  'nutriments',
  'serving_size',
  'serving_quantity',
].join(',')

const PAGE_SIZE = 20
const APP_PARAMS = { app_name: 'BeefUp', app_version: '1.0' }
const SEARCH_LIMIT = 10
const PRODUCT_LIMIT = 100
const WINDOW_MS = 60_000

function createBucket(limit) {
  let hits = []
  return {
    check() {
      const now = Date.now()
      hits = hits.filter((t) => now - t < WINDOW_MS)
      if (hits.length < limit) return { ok: true, retryAfterMs: 0 }
      return { ok: false, retryAfterMs: WINDOW_MS - (now - hits[0]) }
    },
    take() {
      hits.push(Date.now())
    },
  }
}

const searchBucket = createBucket(SEARCH_LIMIT)
const productBucket = createBucket(PRODUCT_LIMIT)

export class RateLimitError extends Error {
  constructor(retryAfterMs) {
    super('openfoodfacts rate limit')
    this.name = 'RateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

const searchCache = new Map()

function cacheKey(query, lang) {
  return `${lang}:${query.trim().toLowerCase()}`
}

function buildUrl(base, params) {
  const url = new URL(base)
  for (const [k, v] of Object.entries({ ...APP_PARAMS, ...params })) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

const ATTEMPTS = 5
const BACKOFF_MS = [400, 800, 1500, 3000]

async function fetchJson(url, signal) {
  let lastError
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { signal })
      if (!res.ok) throw new Error(`openfoodfacts ${res.status}`)
      const text = await res.text()
      try {
        return JSON.parse(text)
      } catch {
        throw new Error('openfoodfacts returned non-JSON')
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err
      lastError = err
      if (attempt < ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]))
      }
    }
  }
  throw lastError ?? new Error('openfoodfacts unavailable')
}

function spend(bucket) {
  const budget = bucket.check()
  if (!budget.ok) throw new RateLimitError(budget.retryAfterMs)
  bucket.take()
}

export async function searchProducts(query, lang, signal) {
  const key = cacheKey(query, lang)
  if (searchCache.has(key)) return searchCache.get(key)

  const url = buildUrl(SEARCH_URL, {
    search_terms: query,
    search_simple: 1,
    action: 'process',
    json: 1,
    lc: lang,
    page_size: PAGE_SIZE,
    fields: FIELDS,
  })

  spend(searchBucket)
  const data = await fetchJson(url, signal)
  const products = Array.isArray(data?.products) ? data.products : []
  searchCache.set(key, products)
  return products
}

export async function fetchProduct(barcode, lang, signal) {
  const url = buildUrl(`${PRODUCT_URL}/${encodeURIComponent(barcode)}.json`, {
    lc: lang,
    fields: FIELDS,
  })
  spend(productBucket)
  const data = await fetchJson(url, signal)
  return data?.product ?? null
}
