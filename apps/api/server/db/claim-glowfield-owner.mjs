import pg from 'pg'

const { Pool } = pg
const GLOWFIELD_SHOP_GID = 'gid://shopify/Shop/72689713326'

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

const pool = new Pool({
  connectionString: requiredEnv('DATABASE_URL'),
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false }
})
const client = await pool.connect()

try {
  await client.query('begin')

  const users = await client.query(
    'select id from auth.users order by created_at'
  )
  if (users.rowCount !== 1) {
    throw new Error('GlowField owner bootstrap requires exactly one Auth user.')
  }
  const userId = users.rows[0].id

  const storeResult = await client.query(
    `select id, workspace_id
     from public.shopify_stores
     where shopify_gid = $1
     for update`,
    [GLOWFIELD_SHOP_GID]
  )
  if (storeResult.rowCount !== 1) {
    throw new Error('GlowField Shopify store was not found.')
  }
  const targetWorkspaceId = storeResult.rows[0].workspace_id

  const targetMemberships = await client.query(
    `select user_id
     from public.workspace_memberships
     where workspace_id = $1`,
    [targetWorkspaceId]
  )
  const claimedByAnotherUser = targetMemberships.rows.some(
    row => row.user_id !== userId
  )
  if (claimedByAnotherUser) {
    throw new Error('GlowField workspace already belongs to another user.')
  }

  const emptyWorkspaceResult = await client.query(
    `select membership.workspace_id
     from public.workspace_memberships membership
     left join public.shopify_stores store
       on store.workspace_id = membership.workspace_id
     where membership.user_id = $1
       and membership.workspace_id <> $2
     group by membership.workspace_id
     having count(store.id) = 0`,
    [userId, targetWorkspaceId]
  )
  const emptyWorkspaceIds = emptyWorkspaceResult.rows.map(row => row.workspace_id)

  await client.query(
    `insert into public.workspace_memberships (workspace_id, user_id, role)
     values ($1, $2, 'owner')
     on conflict (workspace_id, user_id) do update set role = 'owner'`,
    [targetWorkspaceId, userId]
  )

  if (emptyWorkspaceIds.length) {
    await client.query(
      `delete from public.workspace_memberships
       where user_id = $1
         and workspace_id = any($2::uuid[])`,
      [userId, emptyWorkspaceIds]
    )
    await client.query(
      `delete from public.workspaces workspace
       where workspace.id = any($1::uuid[])
         and not exists (
           select 1 from public.workspace_memberships membership
           where membership.workspace_id = workspace.id
         )
         and not exists (
           select 1 from public.shopify_stores store
           where store.workspace_id = workspace.id
         )`,
      [emptyWorkspaceIds]
    )
  }

  await client.query('commit')
  console.log(JSON.stringify({
    status: 'claimed',
    workspaceId: targetWorkspaceId,
    removedEmptyWorkspaceCount: emptyWorkspaceIds.length
  }))
} catch (error) {
  await client.query('rollback')
  throw error
} finally {
  client.release()
  await pool.end()
}
