import pg from 'pg'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const [subjectUserId, protectedWorkspaceId, protectedStorefrontId] = process.argv.slice(2)

for (const [name, value] of Object.entries({ subjectUserId, protectedWorkspaceId, protectedStorefrontId })) {
  if (!UUID.test(String(value || ''))) throw new Error(`${name} must be a UUID.`)
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
})
const client = await pool.connect()

try {
  await client.query('begin read only')
  await client.query(
    `select set_config('request.jwt.claims', $1, true)`,
    [JSON.stringify({ sub: subjectUserId, role: 'authenticated' })]
  )
  await client.query('set local role authenticated')

  const checks = [
    ['workspaces', 'public.workspaces', 'id', protectedWorkspaceId],
    ['memberships', 'public.workspace_memberships', 'workspace_id', protectedWorkspaceId],
    ['stores', 'public.shopify_stores', 'workspace_id', protectedWorkspaceId],
    ['storefronts', 'public.storefronts', 'id', protectedStorefrontId],
    ['domains', 'public.store_domains', 'storefront_id', protectedStorefrontId],
    ['configs', 'public.storefront_config_versions', 'storefront_id', protectedStorefrontId],
    ['assets', 'public.design_assets', 'storefront_id', protectedStorefrontId],
    ['onboarding', 'public.onboarding_progress', 'storefront_id', protectedStorefrontId],
    ['subscriptions', 'public.store_subscriptions', 'storefront_id', protectedStorefrontId]
  ]
  const visibleRows = {}
  for (const [index, [name, table, column, value]] of checks.entries()) {
    const savepoint = `isolation_check_${index}`
    await client.query(`savepoint ${savepoint}`)
    try {
      const result = await client.query(
        `select count(*)::int as count from ${table} where ${column} = $1`,
        [value]
      )
      visibleRows[name] = Number(result.rows[0].count)
      await client.query(`release savepoint ${savepoint}`)
    } catch (error) {
      if (error.code !== '42501') throw error
      await client.query(`rollback to savepoint ${savepoint}`)
      await client.query(`release savepoint ${savepoint}`)
      visibleRows[name] = 'permission_denied'
    }
  }
  await client.query('savepoint storage_isolation_check')
  try {
    const storage = await client.query(
      `select count(*)::int as count from storage.objects
       where bucket_id = 'storefront-assets' and name like $1`,
      [`${protectedStorefrontId}/%`]
    )
    visibleRows.storage = Number(storage.rows[0].count)
    await client.query('release savepoint storage_isolation_check')
  } catch (error) {
    if (error.code !== '42501') throw error
    await client.query('rollback to savepoint storage_isolation_check')
    await client.query('release savepoint storage_isolation_check')
    visibleRows.storage = 'permission_denied'
  }

  const exposed = Object.entries(visibleRows).filter(([, count]) => typeof count === 'number' && count !== 0)
  if (exposed.length) {
    throw new Error(`Tenant isolation failed: ${JSON.stringify(Object.fromEntries(exposed))}`)
  }
  console.log(JSON.stringify({ isolated: true, visibleRows }, null, 2))
  await client.query('rollback')
} catch (error) {
  await client.query('rollback').catch(() => {})
  throw error
} finally {
  client.release()
  await pool.end()
}
