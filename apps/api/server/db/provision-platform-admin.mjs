import pg from 'pg'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const [userId, role = 'owner', createdBy = 'bootstrap', cleanupMode = ''] = process.argv.slice(2)
if (!UUID.test(String(userId || ''))) throw new Error('userId must be a UUID.')
if (!['owner', 'admin', 'support', 'read_only'].includes(role)) throw new Error('invalid platform admin role.')
if (createdBy !== 'bootstrap' && !UUID.test(String(createdBy || ''))) {
  throw new Error('createdBy must be a UUID or bootstrap.')
}
if (cleanupMode && cleanupMode !== '--remove-empty-bootstrap-workspace') {
  throw new Error('invalid cleanup mode.')
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
})
const client = await pool.connect()

try {
  await client.query('begin')
  const target = await client.query(
    `select user_record.id, user_record.email,
            user_record.raw_app_meta_data ->> 'account_type' as account_type,
            exists (select 1 from public.workspace_memberships where user_id = user_record.id) as customer_member
     from auth.users user_record where user_record.id = $1 for update`,
    [userId]
  )
  const user = target.rows[0]
  if (!user) throw new Error('auth user was not found.')
  if (user.account_type !== 'platform_admin') throw new Error('auth user is not marked as platform_admin.')
  let removedBootstrapWorkspace = false
  if (user.customer_member) {
    if (cleanupMode !== '--remove-empty-bootstrap-workspace' || createdBy !== 'bootstrap') {
      throw new Error('platform admin cannot also hold a customer workspace membership.')
    }
    const memberships = await client.query(
      `select membership.workspace_id, membership.role,
              (select count(*)::int from public.workspace_memberships other
               where other.workspace_id = membership.workspace_id) as member_count,
              (select count(*)::int from public.shopify_stores store
               where store.workspace_id = membership.workspace_id) as store_count
       from public.workspace_memberships membership
       where membership.user_id = $1
       for update of membership`,
      [userId]
    )
    const membership = memberships.rows[0]
    if (memberships.rowCount !== 1 || membership.role !== 'owner' ||
        membership.member_count !== 1 || membership.store_count !== 0) {
      throw new Error('customer workspace is not an empty single-owner bootstrap workspace.')
    }
    const deleted = await client.query(
      `delete from public.workspaces workspace
       where workspace.id = $1
         and not exists (select 1 from public.shopify_stores store where store.workspace_id = workspace.id)
         and (select count(*) from public.workspace_memberships member where member.workspace_id = workspace.id) = 1
       returning workspace.id`,
      [membership.workspace_id]
    )
    if (deleted.rowCount !== 1) throw new Error('bootstrap workspace changed during cleanup.')
    removedBootstrapWorkspace = true
  }

  const count = await client.query('select count(*)::int as count from private.platform_admins')
  const bootstrap = createdBy === 'bootstrap'
  if (bootstrap && (count.rows[0].count !== 0 || role !== 'owner')) {
    throw new Error('bootstrap is allowed only for the first platform owner.')
  }
  if (!bootstrap) {
    const actor = await client.query(
      `select 1 from private.platform_admins
       where user_id = $1 and status = 'active' and role in ('owner', 'admin')`,
      [createdBy]
    )
    if (!actor.rows[0]) throw new Error('createdBy is not an active owner/admin.')
  }

  await client.query(
    `insert into private.platform_admins (user_id, role, status, mfa_required, created_by)
     values ($1, $2, 'active', true, $3)
     on conflict (user_id) do update set role = excluded.role, status = 'active',
       mfa_required = true, updated_at = now()`,
    [userId, role, bootstrap ? null : createdBy]
  )
  await client.query(
    `insert into private.audit_logs (actor_user_id, action, target_type, target_id, metadata)
     values ($1, 'platform_admin.provisioned', 'platform_admin', $2, $3)`,
    [bootstrap ? userId : createdBy, userId, { role, bootstrap, removedBootstrapWorkspace }]
  )
  await client.query('commit')
  console.log(JSON.stringify({
    provisioned: true, userId, role, mfaRequired: true, removedBootstrapWorkspace
  }))
} catch (error) {
  await client.query('rollback').catch(() => {})
  throw error
} finally {
  client.release()
  await pool.end()
}
