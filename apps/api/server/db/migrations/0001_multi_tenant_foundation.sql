begin;

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

create type public.workspace_role as enum ('owner', 'admin', 'editor', 'viewer');
create type public.shopify_store_status as enum ('active', 'uninstalled', 'error');
create type public.storefront_status as enum ('onboarding', 'active', 'suspended');
create type public.storefront_domain_status as enum ('pending', 'verified', 'active', 'error', 'disabled');
create type public.storefront_domain_kind as enum ('custom', 'preview');
create type public.release_status as enum ('draft', 'active', 'retired');
create type public.release_channel as enum ('stable', 'beta');
create type public.design_config_status as enum ('draft', 'published', 'archived');
create type public.asset_source as enum ('upload', 'ai');
create type public.onboarding_step_status as enum ('not_started', 'in_progress', 'completed');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_memberships_user_id_idx
  on public.workspace_memberships(user_id);

create table public.shopify_stores (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  shopify_gid text not null,
  installed_myshopify_domain text not null,
  current_myshopify_domain text not null,
  shopify_primary_domain text,
  shop_name text not null,
  status public.shopify_store_status not null default 'active',
  granted_scopes text[] not null default '{}',
  currency_code char(3),
  primary_locale text,
  default_country_code char(2) not null default 'US',
  installed_at timestamptz not null default now(),
  uninstalled_at timestamptz,
  last_shop_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopify_stores_gid_format check (
    shopify_gid ~ '^gid://shopify/Shop/[0-9]+$'
  ),
  constraint shopify_stores_installed_domain_format check (
    installed_myshopify_domain = lower(installed_myshopify_domain)
    and installed_myshopify_domain ~ '^[a-z0-9][a-z0-9-]*[.]myshopify[.]com$'
  ),
  constraint shopify_stores_current_domain_format check (
    current_myshopify_domain = lower(current_myshopify_domain)
    and current_myshopify_domain ~ '^[a-z0-9][a-z0-9-]*[.]myshopify[.]com$'
  ),
  constraint shopify_stores_primary_domain_format check (
    shopify_primary_domain is null
    or (
      shopify_primary_domain = lower(shopify_primary_domain)
      and shopify_primary_domain !~ '[/ :[:space:]]'
      and char_length(shopify_primary_domain) between 1 and 253
    )
  ),
  constraint shopify_stores_currency_format check (
    currency_code is null or currency_code ~ '^[A-Z]{3}$'
  ),
  constraint shopify_stores_country_format check (
    default_country_code ~ '^[A-Z]{2}$'
  )
);

create unique index shopify_stores_shopify_gid_unique_idx
  on public.shopify_stores(shopify_gid);
create unique index shopify_stores_installed_domain_unique_idx
  on public.shopify_stores(lower(installed_myshopify_domain));
create unique index shopify_stores_current_domain_unique_idx
  on public.shopify_stores(lower(current_myshopify_domain));
create index shopify_stores_workspace_id_idx
  on public.shopify_stores(workspace_id);

create table public.shopify_domain_aliases (
  id uuid primary key default gen_random_uuid(),
  shopify_store_id uuid not null references public.shopify_stores(id) on delete cascade,
  myshopify_domain text not null,
  is_current boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint shopify_domain_aliases_domain_format check (
    myshopify_domain = lower(myshopify_domain)
    and myshopify_domain ~ '^[a-z0-9][a-z0-9-]*[.]myshopify[.]com$'
  )
);

create unique index shopify_domain_aliases_domain_unique_idx
  on public.shopify_domain_aliases(lower(myshopify_domain));
create unique index shopify_domain_aliases_one_current_idx
  on public.shopify_domain_aliases(shopify_store_id) where is_current;
create index shopify_domain_aliases_store_id_idx
  on public.shopify_domain_aliases(shopify_store_id);

create table private.shopify_credentials (
  shopify_store_id uuid primary key references public.shopify_stores(id) on delete cascade,
  admin_access_token_ciphertext text not null,
  admin_refresh_token_ciphertext text,
  admin_access_token_expires_at timestamptz,
  admin_refresh_token_expires_at timestamptz,
  storefront_public_access_token text,
  encryption_key_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  channel public.release_channel not null default 'stable',
  status public.release_status not null default 'draft',
  config_schema_version integer not null default 1 check (config_schema_version > 0),
  notes text,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  retired_at timestamptz,
  constraint platform_releases_version_format check (
    version ~ '^[0-9]+[.][0-9]+[.][0-9]+([+-][A-Za-z0-9.-]+)?$'
  ),
  constraint platform_releases_active_timestamp check (
    (status = 'active' and activated_at is not null)
    or status <> 'active'
  )
);

create unique index platform_releases_one_active_per_channel_idx
  on public.platform_releases(channel) where status = 'active';

create table public.storefronts (
  id uuid primary key default gen_random_uuid(),
  shopify_store_id uuid not null unique references public.shopify_stores(id) on delete cascade,
  status public.storefront_status not null default 'onboarding',
  release_channel public.release_channel not null default 'stable',
  pinned_release_id uuid references public.platform_releases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_domains (
  id uuid primary key default gen_random_uuid(),
  storefront_id uuid not null references public.storefronts(id) on delete cascade,
  hostname text not null,
  kind public.storefront_domain_kind not null default 'custom',
  status public.storefront_domain_status not null default 'pending',
  is_primary boolean not null default false,
  verification_token_hash text,
  provider_reference text,
  verified_at timestamptz,
  activated_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_domains_hostname_format check (
    hostname = lower(hostname)
    and hostname !~ '[/ :[:space:]]'
    and char_length(hostname) between 1 and 253
  ),
  constraint store_domains_verified_timestamp check (
    status not in ('verified', 'active') or verified_at is not null
  ),
  constraint store_domains_active_timestamp check (
    status <> 'active' or activated_at is not null
  )
);

create unique index store_domains_hostname_unique_idx
  on public.store_domains(lower(hostname));
create unique index store_domains_one_primary_idx
  on public.store_domains(storefront_id) where is_primary;
create index store_domains_storefront_id_idx
  on public.store_domains(storefront_id);

create table public.storefront_config_versions (
  id uuid primary key default gen_random_uuid(),
  storefront_id uuid not null references public.storefronts(id) on delete cascade,
  version integer not null check (version > 0),
  schema_version integer not null default 1 check (schema_version > 0),
  status public.design_config_status not null default 'draft',
  settings jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (storefront_id, version),
  constraint storefront_config_versions_settings_object check (
    jsonb_typeof(settings) = 'object'
  ),
  constraint storefront_config_versions_published_at check (
    (status = 'published' and published_at is not null)
    or status <> 'published'
  )
);

create unique index storefront_config_versions_one_draft_idx
  on public.storefront_config_versions(storefront_id) where status = 'draft';
create unique index storefront_config_versions_one_published_idx
  on public.storefront_config_versions(storefront_id) where status = 'published';
create index storefront_config_versions_storefront_id_idx
  on public.storefront_config_versions(storefront_id);

create table public.design_assets (
  id uuid primary key default gen_random_uuid(),
  storefront_id uuid not null references public.storefronts(id) on delete cascade,
  purpose text not null,
  source public.asset_source not null default 'upload',
  storage_bucket text not null,
  storage_path text not null,
  public_url text,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  width integer check (width > 0),
  height integer check (height > 0),
  ai_metadata jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint design_assets_ai_metadata_object check (
    ai_metadata is null or jsonb_typeof(ai_metadata) = 'object'
  ),
  unique (storage_bucket, storage_path)
);

create index design_assets_storefront_id_idx
  on public.design_assets(storefront_id);

create table public.platform_feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

create table public.store_feature_overrides (
  storefront_id uuid not null references public.storefronts(id) on delete cascade,
  feature_key text not null references public.platform_feature_flags(key) on delete cascade,
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (storefront_id, feature_key)
);

create table public.onboarding_progress (
  storefront_id uuid not null references public.storefronts(id) on delete cascade,
  step_key text not null,
  status public.onboarding_step_status not null default 'not_started',
  data jsonb not null default '{}',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (storefront_id, step_key),
  constraint onboarding_progress_data_object check (jsonb_typeof(data) = 'object')
);

create table private.webhook_events (
  id uuid primary key default gen_random_uuid(),
  shopify_store_id uuid references public.shopify_stores(id) on delete cascade,
  shopify_webhook_id text not null,
  topic text not null,
  api_version text,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'failed')),
  payload jsonb,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (shopify_store_id, shopify_webhook_id)
);

create index webhook_events_status_received_at_idx
  on private.webhook_events(status, received_at);

create table private.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_logs_workspace_created_at_idx
  on private.audit_logs(workspace_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_workspace_member(requested_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = requested_workspace_id
      and membership.user_id = auth.uid()
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function private.set_updated_at();

create trigger shopify_stores_set_updated_at
before update on public.shopify_stores
for each row execute function private.set_updated_at();

create trigger shopify_credentials_set_updated_at
before update on private.shopify_credentials
for each row execute function private.set_updated_at();

create trigger storefronts_set_updated_at
before update on public.storefronts
for each row execute function private.set_updated_at();

create trigger store_domains_set_updated_at
before update on public.store_domains
for each row execute function private.set_updated_at();

create trigger storefront_config_versions_set_updated_at
before update on public.storefront_config_versions
for each row execute function private.set_updated_at();

create trigger platform_feature_flags_set_updated_at
before update on public.platform_feature_flags
for each row execute function private.set_updated_at();

create trigger store_feature_overrides_set_updated_at
before update on public.store_feature_overrides
for each row execute function private.set_updated_at();

create trigger onboarding_progress_set_updated_at
before update on public.onboarding_progress
for each row execute function private.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.shopify_stores enable row level security;
alter table public.shopify_domain_aliases enable row level security;
alter table public.platform_releases enable row level security;
alter table public.storefronts enable row level security;
alter table public.store_domains enable row level security;
alter table public.storefront_config_versions enable row level security;
alter table public.design_assets enable row level security;
alter table public.platform_feature_flags enable row level security;
alter table public.store_feature_overrides enable row level security;
alter table public.onboarding_progress enable row level security;

create policy workspaces_member_select
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy workspace_memberships_member_select
  on public.workspace_memberships for select
  using (
    user_id = auth.uid()
    or public.is_workspace_member(workspace_id)
  );

create policy shopify_stores_member_select
  on public.shopify_stores for select
  using (public.is_workspace_member(workspace_id));

create policy shopify_domain_aliases_member_select
  on public.shopify_domain_aliases for select
  using (
    exists (
      select 1
      from public.shopify_stores store
      where store.id = shopify_store_id
        and public.is_workspace_member(store.workspace_id)
    )
  );

create policy platform_releases_authenticated_select
  on public.platform_releases for select to authenticated
  using (true);

create policy storefronts_member_select
  on public.storefronts for select
  using (
    exists (
      select 1
      from public.shopify_stores store
      where store.id = shopify_store_id
        and public.is_workspace_member(store.workspace_id)
    )
  );

create policy store_domains_member_select
  on public.store_domains for select
  using (
    exists (
      select 1
      from public.storefronts storefront
      join public.shopify_stores store on store.id = storefront.shopify_store_id
      where storefront.id = storefront_id
        and public.is_workspace_member(store.workspace_id)
    )
  );

create policy storefront_configs_member_select
  on public.storefront_config_versions for select
  using (
    exists (
      select 1
      from public.storefronts storefront
      join public.shopify_stores store on store.id = storefront.shopify_store_id
      where storefront.id = storefront_id
        and public.is_workspace_member(store.workspace_id)
    )
  );

create policy design_assets_member_select
  on public.design_assets for select
  using (
    exists (
      select 1
      from public.storefronts storefront
      join public.shopify_stores store on store.id = storefront.shopify_store_id
      where storefront.id = storefront_id
        and public.is_workspace_member(store.workspace_id)
    )
  );

create policy feature_flags_authenticated_select
  on public.platform_feature_flags for select to authenticated
  using (true);

create policy feature_overrides_member_select
  on public.store_feature_overrides for select
  using (
    exists (
      select 1
      from public.storefronts storefront
      join public.shopify_stores store on store.id = storefront.shopify_store_id
      where storefront.id = storefront_id
        and public.is_workspace_member(store.workspace_id)
    )
  );

create policy onboarding_member_select
  on public.onboarding_progress for select
  using (
    exists (
      select 1
      from public.storefronts storefront
      join public.shopify_stores store on store.id = storefront.shopify_store_id
      where storefront.id = storefront_id
        and public.is_workspace_member(store.workspace_id)
    )
  );

comment on schema private is
  'Only the backend database role may access secrets, webhook payloads, and audit logs.';
comment on column public.shopify_stores.shopify_gid is
  'Stable Shopify Shop GraphQL ID used as the merchant store identity.';
comment on column public.shopify_stores.shopify_primary_domain is
  'Display-only cache of the domain reported by Shopify; never a tenant key.';
comment on table public.store_domains is
  'Maps a buyer-facing headless storefront hostname to one storefront.';
comment on column private.shopify_credentials.admin_access_token_ciphertext is
  'Application-level encrypted Admin API token; never returned to a browser.';
comment on column private.shopify_credentials.storefront_public_access_token is
  'Public Storefront API token intended for buyer-facing Storefront API requests.';
comment on table public.storefront_config_versions is
  'Per-store CMS draft, published configuration, and history. Product data is never stored here.';

commit;
