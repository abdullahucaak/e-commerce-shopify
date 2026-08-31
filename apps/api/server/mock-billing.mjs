const MOCK_ACTION_STATUSES = Object.freeze({
  activate: 'active',
  reactivate: 'active',
  payment_failed: 'past_due',
  cancel: 'canceled',
  pause: 'paused'
})

const ACTIVE_STATUSES = new Set(['active', 'trialing'])

export function mockBillingStatusForAction(action) {
  return MOCK_ACTION_STATUSES[action] || null
}

export function createMockBillingService({ database }) {
  if (!database?.connect) throw new Error('database.connect is required.')

  async function simulate({ userId, storefrontId, action }) {
    const status = mockBillingStatusForAction(action)
    if (!status) throw new Error('invalid_mock_billing_action')

    const client = await database.connect()
    try {
      await client.query('begin')
      const access = await client.query(
        `select storefront.id, store.workspace_id, membership.role::text as workspace_role
         from public.storefronts storefront
         join public.shopify_stores store on store.id = storefront.shopify_store_id
         join public.workspace_memberships membership
           on membership.workspace_id = store.workspace_id and membership.user_id = $2
         where storefront.id = $1
         for update`,
        [storefrontId, userId]
      )
      const storefront = access.rows[0]
      if (!storefront) throw new Error('storefront_access_denied')
      if (!['owner', 'admin'].includes(storefront.workspace_role)) {
        throw new Error('storefront_billing_denied')
      }

      const subscription = await client.query(
        `select plan_key, status::text
         from public.store_subscriptions
         where storefront_id = $1
         for update`,
        [storefrontId]
      )
      if (!subscription.rows[0]?.plan_key) throw new Error('store_plan_not_selected')

      await client.query(
        `update public.store_subscriptions
         set status = $2::public.store_subscription_status,
             current_period_start = case
               when $2::text = any($3::text[]) then coalesce(current_period_start, now())
               else current_period_start
             end,
             current_period_end = case
               when $2::text = any($3::text[]) then now() + interval '1 month'
               else current_period_end
             end,
             cancel_at_period_end = false,
             canceled_at = case when $2 = 'canceled' then now() else null end,
             updated_at = now()
         where storefront_id = $1`,
        [storefrontId, status, [...ACTIVE_STATUSES]]
      )

      await client.query(
        `update public.storefronts storefront
         set status = case
             when $2::text = any($3::text[])
             and exists (
               select 1 from public.onboarding_progress progress
               where progress.storefront_id = storefront.id
                 and progress.step_key = 'publish'
                 and progress.status = 'completed'
             )
             and exists (
               select 1 from public.shopify_stores store
               where store.id = storefront.shopify_store_id and store.status = 'active'
             )
             then 'active'::public.storefront_status
           when not ($2::text = any($3::text[])) and storefront.status = 'active'
             then 'suspended'::public.storefront_status
           else storefront.status
         end,
         updated_at = now()
         where storefront.id = $1`,
        [storefrontId, status, [...ACTIVE_STATUSES]]
      )

      await client.query(
        `insert into private.audit_logs (
           workspace_id, actor_user_id, action, target_type, target_id, metadata
         ) values ($1, $2, $3, 'storefront', $4, $5)`,
        [
          storefront.workspace_id,
          userId,
          `billing.mock.${action}`,
          storefrontId,
          { previousStatus: subscription.rows[0].status, status }
        ]
      )
      await client.query('commit')
      return { provider: 'mock', action, status, storefrontId }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  return { provider: 'mock', simulate }
}
