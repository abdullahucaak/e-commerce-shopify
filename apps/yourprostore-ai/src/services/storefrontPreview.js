export async function createStorefrontPreview({ accessToken, storefrontId }) {
  const response = await fetch(`/api/storefronts/${encodeURIComponent(storefrontId)}/preview`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'storefront_preview_unavailable')
  return payload
}

export function buildStorefrontPreviewUrl({ baseUrl, token }) {
  const url = new URL(baseUrl)
  url.hash = new URLSearchParams({ previewToken: token }).toString()
  return url.toString()
}
