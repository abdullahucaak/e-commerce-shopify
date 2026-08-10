begin;

create table private.shopify_oauth_states (
  id uuid primary key default gen_random_uuid(),
  nonce_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  shop_domain text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint shopify_oauth_states_shop_domain_format check (
    shop_domain = lower(shop_domain)
    and shop_domain ~ '^[a-z0-9][a-z0-9-]*[.]myshopify[.]com$'
  )
);

create index shopify_oauth_states_expiry_idx
  on private.shopify_oauth_states(expires_at)
  where consumed_at is null;

comment on table private.shopify_oauth_states is
  'Short-lived, one-time OAuth nonces bound to a platform user and workspace.';

commit;
