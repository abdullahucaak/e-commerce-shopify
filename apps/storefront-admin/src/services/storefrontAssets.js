const BUCKET = 'storefront-assets'

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

export async function removeStorefrontAsset(client, publicUrl) {
  const path = getStorefrontAssetPath(publicUrl)
  if (!path) return
  const { error } = await client.storage.from(BUCKET).remove([path])
  if (error) throw error
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

export async function uploadStorefrontAsset(client, { storefrontId, folder, file }) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'image'
  const path = `${storefrontId}/${folder}/${crypto.randomUUID()}.${extension}`
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000' })
  if (error) throw error
  const { data } = client.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}
