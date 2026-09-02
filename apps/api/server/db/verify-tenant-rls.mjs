import { randomUUID } from 'node:crypto'
import pg from 'pg'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const args = process.argv.slice(2)
if (![3, 4].includes(args.length)) {
  throw new Error('Usage: verify-tenant-rls.mjs <user> <workspace> <storefront> or <user-a> <storefront-b> <user-b> <storefront-a>')
}

const directions = args.length === 3
  ? [{ subjectUserId: args[0], protectedWorkspaceId: args[1], protectedStorefrontId: args[2] }]
  : [
      { subjectUserId: args[0], protectedStorefrontId: args[1] },
      { subjectUserId: args[2], protectedStorefrontId: args[3] }
    ]
for (const direction of directions) {
  for (const [name, value] of Object.entries(direction)) {
    if (!UUID.test(String(value || ''))) throw new Error(`${name} must be a UUID.`)
  }
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
})
const client = await pool.connect()

async function attempt(name, sql, parameters = []) {
  const savepoint = `attempt_${name}`
  await client.query(`savepoint ${savepoint}`)
  try {
    const result = await client.query(sql, parameters)
    await client.query(`rollback to savepoint ${savepoint}`)
    await client.query(`release savepoint ${savepoint}`)
    return { outcome: 'row_count', rowCount: result.rowCount }
  } catch (error) {
    await client.query(`rollback to savepoint ${savepoint}`)
    await client.query(`release savepoint ${savepoint}`)
    if (error.code !== '42501') throw error
    return { outcome: 'permission_denied' }
  }
}

function assertBlocked(name, result) {
  const insert = name.endsWith('Insert')
  if (result.outcome === 'permission_denied') return
  if (!insert && result.outcome === 'row_count' && result.rowCount === 0) return
  throw new Error(`${name} was not blocked: ${JSON.stringify(result)}`)
}

async function resolveDirection(direction) {
  const result = await client.query(
    `select store.workspace_id as "protectedWorkspaceId",
            storefront.shopify_store_id as "protectedStoreId"
       from public.storefronts storefront
       join public.shopify_stores store on store.id = storefront.shopify_store_id
      where storefront.id = $1`,
    [direction.protectedStorefrontId]
  )
  if (result.rowCount !== 1) throw new Error('Protected storefront was not found.')
  const resolved = { ...direction, ...result.rows[0] }
  if (direction.protectedWorkspaceId && direction.protectedWorkspaceId !== resolved.protectedWorkspaceId) {
    throw new Error('Protected storefront does not belong to the supplied workspace.')
  }
  return resolved
}

async function snapshot(storefrontId) {
  const result = await client.query(
    `select jsonb_build_object(
       'storefront', (select to_jsonb(row) from public.storefronts row where row.id = $1),
       'configs', coalesce((select jsonb_agg(to_jsonb(row) order by row.version) from public.storefront_config_versions row where row.storefront_id = $1), '[]'::jsonb),
       'assets', coalesce((select jsonb_agg(to_jsonb(row) order by row.id) from public.design_assets row where row.storefront_id = $1), '[]'::jsonb),
       'storage', coalesce((select jsonb_agg(to_jsonb(row) order by row.id) from storage.objects row where row.bucket_id = 'storefront-assets' and row.name like $2), '[]'::jsonb)
     ) as value`,
    [storefrontId, `${storefrontId}/%`]
  )
  return result.rows[0].value
}

async function verify(input) {
  const direction = await resolveDirection(input)
  const before = await snapshot(direction.protectedStorefrontId)
  const storagePath = `${direction.protectedStorefrontId}/logos/rls-${randomUUID()}.png`
  await client.query('begin')
  try {
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: direction.subjectUserId, role: 'authenticated' })
    ])
    await client.query('set local role authenticated')

    const visibleRows = {}
    const reads = [
      ['workspaces', 'public.workspaces', 'id', direction.protectedWorkspaceId],
      ['memberships', 'public.workspace_memberships', 'workspace_id', direction.protectedWorkspaceId],
      ['stores', 'public.shopify_stores', 'workspace_id', direction.protectedWorkspaceId],
      ['storefronts', 'public.storefronts', 'id', direction.protectedStorefrontId],
      ['domains', 'public.store_domains', 'storefront_id', direction.protectedStorefrontId],
      ['configs', 'public.storefront_config_versions', 'storefront_id', direction.protectedStorefrontId],
      ['assets', 'public.design_assets', 'storefront_id', direction.protectedStorefrontId],
      ['onboarding', 'public.onboarding_progress', 'storefront_id', direction.protectedStorefrontId],
      ['subscriptions', 'public.store_subscriptions', 'storefront_id', direction.protectedStorefrontId]
    ]
    for (const [name, table, column, value] of reads) {
      const result = await attempt(`read_${name}`, `select 1 from ${table} where ${column} = $1`, [value])
      visibleRows[name] = result.outcome === 'permission_denied' ? result.outcome : result.rowCount
    }
    const storageRead = await attempt(
      'read_storage',
      `select 1 from storage.objects where bucket_id = 'storefront-assets' and name like $1`,
      [`${direction.protectedStorefrontId}/%`]
    )
    visibleRows.storage = storageRead.outcome === 'permission_denied' ? storageRead.outcome : storageRead.rowCount
    const exposed = Object.entries(visibleRows).filter(([, count]) => typeof count === 'number' && count !== 0)
    if (exposed.length) throw new Error(`Tenant read isolation failed: ${JSON.stringify(Object.fromEntries(exposed))}`)

    const writes = {
      storefrontInsert: await attempt('storefront_insert', 'insert into public.storefronts (id, shopify_store_id) values ($1, $2)', [randomUUID(), direction.protectedStoreId]),
      storefrontUpdate: await attempt('storefront_update', 'update public.storefronts set status = status where id = $1', [direction.protectedStorefrontId]),
      storefrontDelete: await attempt('storefront_delete', 'delete from public.storefronts where id = $1', [direction.protectedStorefrontId]),
      configInsert: await attempt('config_insert', `insert into public.storefront_config_versions (id, storefront_id, version, settings) values ($1, $2, 2147483647, '{}'::jsonb)`, [randomUUID(), direction.protectedStorefrontId]),
      configUpdate: await attempt('config_update', 'update public.storefront_config_versions set settings = settings where storefront_id = $1', [direction.protectedStorefrontId]),
      configDelete: await attempt('config_delete', 'delete from public.storefront_config_versions where storefront_id = $1', [direction.protectedStorefrontId]),
      assetInsert: await attempt('asset_insert', `insert into public.design_assets (id, storefront_id, purpose, storage_bucket, storage_path, mime_type, byte_size) values ($1, $2, 'logo', 'storefront-assets', $3, 'image/png', 1)`, [randomUUID(), direction.protectedStorefrontId, storagePath]),
      assetUpdate: await attempt('asset_update', 'update public.design_assets set purpose = purpose where storefront_id = $1', [direction.protectedStorefrontId]),
      assetDelete: await attempt('asset_delete', 'delete from public.design_assets where storefront_id = $1', [direction.protectedStorefrontId]),
      storageInsert: await attempt('storage_insert', `insert into storage.objects (id, bucket_id, name, owner, metadata) values ($1, 'storefront-assets', $2, $3, '{}'::jsonb)`, [randomUUID(), storagePath, direction.subjectUserId]),
      storageUpdate: await attempt('storage_update', `update storage.objects set metadata = metadata where bucket_id = 'storefront-assets' and name like $1`, [`${direction.protectedStorefrontId}/%`]),
      storageDelete: await attempt('storage_delete', `delete from storage.objects where bucket_id = 'storefront-assets' and name like $1`, [`${direction.protectedStorefrontId}/%`])
    }
    for (const [name, result] of Object.entries(writes)) assertBlocked(name, result)
    return { direction, before, visibleRows, writes }
  } finally {
    await client.query('rollback').catch(() => {})
  }
}

try {
  const results = []
  for (const input of directions) {
    const result = await verify(input)
    const after = await snapshot(result.direction.protectedStorefrontId)
    if (JSON.stringify(result.before) !== JSON.stringify(after)) {
      throw new Error(`Protected records changed for storefront ${result.direction.protectedStorefrontId}.`)
    }
    results.push({
      isolated: true,
      subjectUserId: result.direction.subjectUserId,
      protectedWorkspaceId: result.direction.protectedWorkspaceId,
      protectedStorefrontId: result.direction.protectedStorefrontId,
      visibleRows: result.visibleRows,
      writeAttempts: result.writes,
      protectedRecordsUnchanged: true,
      transactionRolledBack: true
    })
  }
  console.log(`Tenant RLS verification passed in ${results.length} direction(s); all writes were blocked and protected records were unchanged.`)
  console.log(JSON.stringify({ isolated: true, directions: results }, null, 2))
} finally {
  client.release()
  await pool.end()
}
