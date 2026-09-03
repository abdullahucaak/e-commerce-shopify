begin;

alter table public.store_subscriptions
  drop constraint store_subscriptions_provider_supported;

alter table public.store_subscriptions
  add constraint store_subscriptions_provider_supported check (
    provider in ('stripe', 'shopify_app_pricing')
  );

comment on column public.store_subscriptions.provider is
  'Billing source. New public subscriptions use Shopify App Pricing; stripe remains only for historical rows.';

commit;
