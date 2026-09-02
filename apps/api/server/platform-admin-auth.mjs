const ADMIN_ROLES = new Set(['owner', 'admin', 'support', 'read_only'])

export async function authorizePlatformAdmin({ database, user }) {
  if (!user?.id) throw new Error('platform_admin_authentication_required')

  const result = await database.query(
    `select role, status, mfa_required
     from private.platform_admins
     where user_id = $1`,
    [user.id]
  )
  const admin = result.rows[0]
  if (!admin || admin.status !== 'active' || !ADMIN_ROLES.has(admin.role)) {
    throw new Error('platform_admin_access_denied')
  }
  if (admin.mfa_required !== true || user.authContext?.aal !== 'aal2') {
    throw new Error('platform_admin_mfa_required')
  }

  return { userId: user.id, email: user.email || null, role: admin.role }
}
