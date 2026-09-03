const BUCKET = 'storefront-assets'

async function assetApiResponse(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || 'storefront_asset_request_failed')
    error.details = payload.details || null
    throw error
  }
  return payload
}

export function getStorefrontAssetPath(publicUrl) {
  if (!publicUrl) return null
  try {
    const url = new URL(publicUrl)
    const marker = `/storage/v1/object/public/${BUCKET}/`
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex === -1) return null
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length)) || null
  } catch {
    return null
  }
}

export async function removeStorefrontAsset({ accessToken, storefrontId, publicUrl }) {
  const path = getStorefrontAssetPath(publicUrl)
  if (!path) return
  await assetApiResponse(await fetch(`/api/storefronts/${storefrontId}/assets`, {
    method: 'DELETE',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ path })
  }))
}

export async function optimizeRasterImage(file, { maxWidth, maxHeight, quality = 0.84 }) {
  if (file.type === 'image/svg+xml') return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('image_optimization_failed')), 'image/webp', quality)
  })

  if (blob.size >= file.size && scale === 1) return file
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' })
}

export async function uploadStorefrontAsset({ accessToken, storefrontId, purpose, file }) {
  const form = new FormData()
  form.append('file', file)
  const payload = await assetApiResponse(await fetch(
    `/api/storefronts/${storefrontId}/assets/${purpose}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    }
  ))
  return `${payload.asset.publicUrl}?v=${Date.now()}`
}

export function storefrontAssetErrorMessage(error, label = 'Image') {
  if (error?.message === 'asset_too_large') return `${label} file exceeds the allowed size.`
  if (error?.message === 'invalid_asset_type') return 'Only valid JPEG, PNG, or WEBP files can be uploaded.'
  if (error?.message === 'invalid_asset_dimensions') {
    const limits = error.details || {}
    return `${label} dimensions must be between ${limits.minWidth}×${limits.minHeight} and ${limits.maxWidth}×${limits.maxHeight} pixels.`
  }
  if (error?.message === 'storefront_asset_quota_exceeded') {
    return 'This store has reached its 25 MB image quota.'
  }
  if (error?.message === 'storefront_write_denied') return 'You do not have permission to change this file.'
  return `${label} could not be uploaded. Please try again.`
}
