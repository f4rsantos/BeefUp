// Records that carry both `name` (English) and `namePt` (Portuguese).

export function localizedName(item, lang) {
  return lang === 'pt' ? item.namePt : item.name
}

export function localizedNameOrEnglish(item, lang) {
  return lang === 'pt' ? item.namePt || item.name : item.name
}
