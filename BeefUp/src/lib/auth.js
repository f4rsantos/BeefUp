import { getSupabase, isConfigured } from './supabaseClient.js'
export { isConfigured }

export async function getSession() {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session ?? null
}

export async function signUp(email, password, displayName) {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw error
  return data.session
}

export async function signIn(email, password) {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  const supabase = await getSupabase()
  if (!supabase) return
  await supabase.auth.signOut()
}

export function onAuthChange(cb) {
  if (!isConfigured()) return () => {}

  let cancelled = false
  let unsubscribe = () => {}

  getSupabase().then((supabase) => {
    if (!supabase || cancelled) return
    const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
    unsubscribe = () => data.subscription.unsubscribe()
  })

  return () => {
    cancelled = true
    unsubscribe()
  }
}

// profiles.role is informational — RLS never reads it — but a trainer account should say so
export async function setProfileRole(role) {
  const supabase = await getSupabase()
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  const id = data?.session?.user?.id
  if (!id) return
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  if (error) throw error
}
