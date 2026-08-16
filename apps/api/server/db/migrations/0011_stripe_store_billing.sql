begin;

alter table public.store_subscriptions
  add column provider_checkout_session_id text,
  add column provider_checkout_url text,
  add column checkout_expires_at timestamptz,
  add column checkout_attempt integer not null default 0 check (checkout_attempt >= 0),
  add column provider_event_created_at timestamptz;

create unique index store_subscriptions_provider_checkout_unique_idx
  on public.store_subscriptions(provider, provider_checkout_session_id)
  where provider_checkout_session_id is not null;

create table private.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  livemode boolean not null,
  stripe_created_at timestamptz not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

comment on table private.stripe_webhook_events is
  'Stripe event ledger used to make store subscription webhook processing idempotent.';
comment on column public.store_subscriptions.provider_event_created_at is
  'Creation time of the newest Stripe event applied to this store subscription.';

commit;
