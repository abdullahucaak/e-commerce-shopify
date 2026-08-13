begin;

insert into public.store_subscriptions (
  storefront_id, plan_key, status, unit_amount, currency_code
)
select storefront.id, 'starter_monthly', 'incomplete', 900, 'USD'
from public.storefronts storefront
on conflict (storefront_id) do nothing;

insert into public.onboarding_progress (storefront_id, step_key, status)
select storefront.id, step.step_key, 'not_started'::public.onboarding_step_status
from public.storefronts storefront
cross join (
  values
    ('shopify_connection'),
    ('plan_selection'),
    ('niche_selection'),
    ('banner_selection'),
    ('brand_setup'),
    ('product_readiness'),
    ('store_preview'),
    ('domain_setup'),
    ('publish')
) as step(step_key)
on conflict (storefront_id, step_key) do nothing;

update public.onboarding_progress
set status = 'completed', completed_at = coalesce(completed_at, now())
where step_key = 'shopify_connection';

commit;
