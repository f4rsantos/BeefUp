const LOCK_DISTANCE= 8

export function lockAxis(current, dx, dy) {
  if (current) return current
  if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return null
  return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
}
