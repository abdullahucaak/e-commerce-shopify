const MIN_PASSWORD_LENGTH = 8

export function adminPasswordRecoveryRedirectUrl(origin = window.location.origin) {
  const parsed = new URL(origin)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid_password_recovery_origin')
  return new URL('/update-password', parsed.origin).toString()
}

export function validateAdminPassword(password, confirmation) {
  if (String(password || '').length < MIN_PASSWORD_LENGTH) return 'password_too_short'
  if (password !== confirmation) return 'password_confirmation_mismatch'
  return null
}

export async function requestAdminPasswordRecovery(client, email, origin) {
  const { error } = await client.auth.resetPasswordForEmail(String(email || '').trim(), {
    redirectTo: adminPasswordRecoveryRedirectUrl(origin)
  })
  if (error) throw error
}
