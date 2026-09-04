import { apiUrl } from './apiUrl.js'

export async function openStorefrontAdmin({ session, storefrontId, page = 'dashboard' }) {
  if (!session?.access_token || !session?.refresh_token) throw new Error('customer_session_unavailable')
  const returnPath = `/${page}?storefrontId=${encodeURIComponent(storefrontId)}`
  const response = await fetch(apiUrl('/api/auth/handoff'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ refreshToken: session.refresh_token, returnPath })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.authorizationUrl) throw new Error(payload.error || 'auth_handoff_failed')
  window.location.assign(payload.authorizationUrl)
}
