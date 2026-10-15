import { SCHEMA_REVISION } from './schemaRevision.js'

export { SCHEMA_REVISION }

let cached = null

// Dynamic so the ~30 KiB of SQL only loads for a trainer who needs it.
export async function loadSetupSql() {
  if (!cached) cached = (await import('../../supabase/setup.sql?raw')).default
  return cached
}

// null means "can't tell" (offline, signed out): never nag on that.
export function needsSetupUpdate(projectRevision) {
  return typeof projectRevision === 'number' && projectRevision < SCHEMA_REVISION
}
