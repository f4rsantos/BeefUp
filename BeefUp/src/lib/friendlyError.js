// Backend errors, rewritten as what the person should do next.
const RULES = [
  [/failed to fetch|networkerror|load failed|network request failed/, 'errNetwork'],
  [/invalid login credentials/, 'errBadCredentials'],
  [/already registered|already been registered|user already exists/, 'errAlreadyRegistered'],
  [/password should be|weak password|password is too/, 'errWeakPassword'],
  [/email not confirmed/, 'errEmailNotConfirmed'],
  [/rate limit|too many requests/, 'errRateLimit'],
  [/invite code has expired/, 'errInviteExpired'],
  [/invite code has been revoked/, 'errInviteRevoked'],
  [/invalid invite code|invite code not accepted|invite not found/, 'errInviteInvalid'],
  [/already has a trainer/, 'trainerSetupTrainerTaken'],
  [/row-level security|permission denied/, 'errPermission'],
  [/not signed in|must be signed in|sign in before|jwt/, 'errSession'],
]

export function friendlyError(e, t) {
  console.warn(e)
  const msg = String(e?.message || e || '').toLowerCase()
  if (e?.code === '42501') return t.errPermission
  if (e?.status === 401) return t.errSession
  if (e?.status === 429) return t.errRateLimit
  const hit = RULES.find(([re]) => re.test(msg))
  return (hit && t[hit[1]]) || t.errGeneric
}
