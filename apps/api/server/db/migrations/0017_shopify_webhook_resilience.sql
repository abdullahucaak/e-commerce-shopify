begin;

alter table private.webhook_events
  drop constraint if exists webhook_events_status_check;

alter table private.webhook_events
  add constraint webhook_events_status_check
  check (status in ('received', 'processing', 'processed', 'failed', 'dead_letter'));

alter table private.webhook_events
  add column if not exists attempt_count integer not null default 0
    check (attempt_count >= 0),
  add column if not exists processing_started_at timestamptz,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_attempt_at timestamptz;

alter table private.webhook_events
  drop constraint if exists webhook_events_shopify_store_id_fkey;

alter table private.webhook_events
  add constraint webhook_events_shopify_store_id_fkey
  foreign key (shopify_store_id) references public.shopify_stores(id) on delete set null;

alter table private.webhook_events
  drop constraint if exists webhook_events_shopify_store_id_shopify_webhook_id_key;

create unique index if not exists webhook_events_shopify_webhook_id_unique_idx
  on private.webhook_events(shopify_webhook_id);

create index if not exists webhook_events_retry_idx
  on private.webhook_events(status, next_attempt_at, received_at)
  where status in ('failed', 'dead_letter');

comment on table private.webhook_events is
  'Shopify webhook ledger. Failed deliveries can be reclaimed by the same webhook id; exhausted deliveries remain as dead letters for operations review.';

commit;
