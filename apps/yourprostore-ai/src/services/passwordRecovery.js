export const MIN_PASSWORD_LENGTH = 8

export function passwordRecoveryRedirectUrl(origin = window.location.origin) {
  const parsedOrigin = new URL(origin)
  if (!['http:', 'https:'].includes(parsedOrigin.protocol)) {
    throw new Error('invalid_password_recovery_origin')
  }
  return new URL('/update-password', parsedOrigin.origin).toString()
}

export function validateNewPassword(password, confirmation) {
  if (String(password || '').length < MIN_PASSWORD_LENGTH) {
    return 'password_too_short'
  }
  if (password !== confirmation) return 'password_confirmation_mismatch'
  return null
}

export async function requestPasswordRecovery(client, email, origin = window.location.origin) {
  const { error } = await client.auth.resetPasswordForEmail(String(email || '').trim(), {
    redirectTo: passwordRecoveryRedirectUrl(origin)
  })
  if (error) throw error
}
