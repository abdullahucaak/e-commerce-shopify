const BUCKET = 'storefront-assets'

export async function optimizeLogo(file) {
  if (file.type === 'image/svg+xml') return file
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

export async function uploadLogo(client, storefrontId, file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'image'
  const path = `${storefrontId}/logos/${crypto.randomUUID()}.${extension}`
  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    contentType: file.type, cacheControl: '31536000'
  })
  if (error) throw error
  const { data } = client.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}
