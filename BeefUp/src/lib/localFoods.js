let catalog = null
let foldedNamesByLang = {}
let pending = null

const DEFAULT_LIMIT = 25

export function foldText(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function isCatalogLoaded() {
  return catalog !== null
}

export function loadLocalFoods() {
  if (catalog) return Promise.resolve(catalog)
  if (!pending) {
    pending = import('../data/foodsBase.json').then((mod) => {
      catalog = mod.default
      foldedNamesByLang.pt = catalog.map((f) => foldText(f.namePt || f.name))
      foldedNamesByLang.en = catalog.map((f) => foldText(f.nameEn || f.namePt || f.name))
      return catalog
    })
  }
  return pending
}

// Todas as palavras, em qualquer ordem e posição.
export function searchLocalFoods(query, limit = DEFAULT_LIMIT, lang = 'pt') {
  if (!catalog) return []
  const foldedNames = foldedNamesByLang[lang] || foldedNamesByLang.pt
  const terms = foldText(query).split(/[^a-z0-9]+/).filter(Boolean)
  if (!terms.length) return []

  const hits = []
  for (let i = 0; i < catalog.length; i++) {
    const name = foldedNames[i]
    let score = 0
    for (const term of terms) {
      const at = name.indexOf(term)
      if (at < 0) { score = -1; break }
      score += at
    }
    if (score >= 0) hits.push({ food: catalog[i], score, length: name.length })
  }

  hits.sort((a, b) => a.score - b.score || a.length - b.length)
  return hits.slice(0, limit).map((h) => h.food)
}
