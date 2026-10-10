// Cardio time is stored as "m:ss". Earlier entries hold plain minutes.
const SECONDS_IN_MINUTE = 60

function format(totalSeconds) {
  const minutes = Math.floor(totalSeconds / SECONDS_IN_MINUTE)
  const seconds = totalSeconds % SECONDS_IN_MINUTE
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function normalizeTime(value) {
  const text = String(value ?? '').trim()
  if (/^\d+:[0-5]\d$/.test(text)) return format(Number(text.split(':')[0]) * SECONDS_IN_MINUTE + Number(text.split(':')[1]))
  const legacyMinutes = Number(text)
  if (text !== '' && Number.isFinite(legacyMinutes) && legacyMinutes > 0) {
    return format(Math.round(legacyMinutes * SECONDS_IN_MINUTE))
  }
  return ''
}

// Stopwatch entry: digits fill from the right, so "125" reads 1:25.
export function timeFromDigits(input) {
  const digits = String(input ?? '').replace(/\D/g, '').replace(/^0+/, '').slice(0, 5)
  if (!digits) return ''
  const padded = digits.padStart(3, '0')
  const seconds = Math.min(59, Number(padded.slice(-2)))
  return `${Number(padded.slice(0, -2))}:${String(seconds).padStart(2, '0')}`
}
