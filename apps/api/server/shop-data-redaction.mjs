const BUCKET = 'storefront-assets'

async function removeStorageObjects({ supabaseUrl, serviceRoleKey, paths, fetchImpl }) {
  if (!paths.length) return
  if (!supabaseUrl || !serviceRoleKey) throw new Error('shop_data_redaction_storage_unavailable')

  for (let index = 0; index < paths.length; index += 100) {
    const response = await fetchImpl(
      `${String(supabaseUrl).replace(/\/$/, '')}/storage/v1/object/${BUCKET}`,
      {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ prefixes: paths.slice(index, index + 100) })
      }
    )
    if (!response.ok) throw new Error('shop_data_redaction_storage_failed')
  }
}

export function createShopDataRedactor({
  database,
  supabaseUrl,
  serviceRoleKey = null,
  fetchImpl = fetch
}) {
  if (!database?.query || !database?.connect) throw new Error('database pool is required.')

  return {
    async redact({ shopifyStoreId }) {
      const assets = await database.query(
        `select asset.storage_path
         from public.design_assets asset
         join public.storefronts storefront on storefront.id = asset.storefront_id
         where storefront.shopify_store_id = $1
           and asset.storage_bucket = 'storefront-assets'`,
        [shopifyStoreId]
      )
      const paths = [...new Set(assets.rows.map(row => row.storage_path).filter(Boolean))]
      await removeStorageObjects({ supabaseUrl, serviceRoleKey, paths, fetchImpl })

      const client = await database.connect()
      try {
        await client.query('begin')
        await client.query('delete from public.shopify_stores where id = $1', [shopifyStoreId])
        await client.query('commit')
      } catch (error) {
        await client.query('rollback').catch(() => {})
        throw error
      } finally {
        client.release()
      }

      return { redacted: true, removedAssetCount: paths.length }
    }
  }
}
