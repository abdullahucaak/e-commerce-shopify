const BUCKET = 'storefront-assets'

function encodedPath(path) {
  return String(path).split('/').map(segment => encodeURIComponent(segment)).join('/')
}

async function storageError(response) {
  const text = await response.text().catch(() => '')
  const error = new Error('storefront_asset_storage_failed')
  error.storageStatus = response.status
  error.storageResponse = text.slice(0, 500)
  return error
}

export function createSupabaseStorageGateway({ supabaseUrl, publishableKey, fetchImpl = fetch }) {
  const baseUrl = String(supabaseUrl || '').replace(/\/$/, '')

  function authorizationHeaders(accessToken) {
    return {
      apikey: publishableKey,
      authorization: `Bearer ${accessToken}`
    }
  }

  return {
    publicUrl(path) {
      return `${baseUrl}/storage/v1/object/public/${BUCKET}/${encodedPath(path)}`
    },

    async upload({ accessToken, path, buffer, mimeType }) {
      const response = await fetchImpl(
        `${baseUrl}/storage/v1/object/${BUCKET}/${encodedPath(path)}`,
        {
          method: 'POST',
          headers: {
            ...authorizationHeaders(accessToken),
            'cache-control': 'max-age=31536000',
            'content-type': mimeType,
            'x-upsert': 'false'
          },
          body: buffer
        }
      )
      if (!response.ok) throw await storageError(response)
    },

    async remove({ accessToken, path }) {
      const response = await fetchImpl(`${baseUrl}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE',
        headers: {
          ...authorizationHeaders(accessToken),
          'content-type': 'application/json'
        },
        body: JSON.stringify({ prefixes: [path] })
      })
      if (!response.ok) throw await storageError(response)
    }
  }
}

