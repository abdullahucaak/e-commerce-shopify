import { apiUrl } from './apiUrl.js'

export async function optimizeLogo(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1200 / bitmap.width, 600 / bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('image_optimization_failed')), 'image/webp', 0.88)
  })
  if (blob.size >= file.size && scale === 1) return file
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' })
}

export async function uploadLogo({ accessToken, storefrontId, file }) {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(apiUrl(`/api/storefronts/${storefrontId}/assets/logo`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || 'storefront_asset_request_failed')
    error.details = payload.details || null
    throw error
  }
  return `${payload.asset.publicUrl}?v=${Date.now()}`
}

export function getStorefrontAssetPath(publicUrl) {
  if (!publicUrl) return null
  try {
    const url = new URL(publicUrl)
    const marker = '/storage/v1/object/public/storefront-assets/'
    const index = url.pathname.indexOf(marker)
    return index === -1 ? null : decodeURIComponent(url.pathname.slice(index + marker.length))
  } catch {
    return null
  }
}

export async function removeLogo({ accessToken, storefrontId, publicUrl }) {
  const path = getStorefrontAssetPath(publicUrl)
  if (!path) return
  const response = await fetch(apiUrl(`/api/storefronts/${storefrontId}/assets`), {
    method: 'DELETE',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ path })
  })
  if (!response.ok) throw new Error('storefront_asset_remove_failed')
}

export function logoUploadErrorMessage(error) {
  if (error?.message === 'asset_too_large') return 'Logo en fazla 2 MB olabilir.'
  if (error?.message === 'invalid_asset_type') return 'Only valid JPEG, PNG, or WEBP files can be uploaded.'
  if (error?.message === 'invalid_asset_dimensions') {
    return 'Logo dimensions must be between 64×32 and 2400×1200 pixels.'
  }
  if (error?.message === 'storefront_asset_quota_exceeded') return 'This store has reached its 25 MB image quota.'
  return 'The logo could not be uploaded. Please try again.'
}
