begin;

create type public.store_subscription_status as enum (
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'paused',
  'canceled'
);

create table public.niches (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint niches_key_format check (key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  constraint niches_name_length check (char_length(name) between 1 and 80)
);

create table public.banner_presets (
  id uuid primary key default gen_random_uuid(),
  niche_id uuid not null references public.niches(id) on delete restrict,
  name text not null,
  title text not null,
  subtitle text not null,
  image_url text not null,
  primary_color text,
  secondary_color text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint banner_presets_name_length check (char_length(name) between 1 and 100),
  constraint banner_presets_title_length check (char_length(title) between 1 and 32),
  constraint banner_presets_subtitle_length check (char_length(subtitle) between 1 and 80),
  constraint banner_presets_image_url_length check (char_length(image_url) between 1 and 2048),
  constraint banner_presets_primary_color_format check (
    primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint banner_presets_secondary_color_format check (
    secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

create index banner_presets_niche_order_idx
  on public.banner_presets(niche_id, display_order, id);

alter table public.storefronts
  add column template_key text not null default 'glowfield_v1',
  add column niche_id uuid references public.niches(id) on delete set null,
  add column selected_banner_preset_id uuid references public.banner_presets(id) on delete set null,
  add constraint storefronts_template_key_fixed check (template_key = 'glowfield_v1');

create table public.store_subscriptions (
  id uuid primary key default gen_random_uuid(),
  storefront_id uuid not null unique references public.storefronts(id) on delete cascade,
  plan_key text not null,
  status public.store_subscription_status not null default 'incomplete',
  unit_amount integer not null check (unit_amount >= 0),
  currency_code char(3) not null default 'USD',
  provider text not null default 'stripe',
  provider_customer_id text,
  provider_subscription_id text,
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_subscriptions_plan_key_format check (
    plan_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
  ),
  constraint store_subscriptions_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint store_subscriptions_provider_supported check (provider = 'stripe'),
  constraint store_subscriptions_trial_range check (
    trial_starts_at is null or trial_ends_at is null or trial_ends_at > trial_starts_at
  ),
  constraint store_subscriptions_period_range check (
    current_period_start is null
    or current_period_end is null
    or current_period_end > current_period_start
  )
);

create unique index store_subscriptions_provider_subscription_unique_idx
  on public.store_subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index store_subscriptions_status_idx
  on public.store_subscriptions(status, current_period_end);

create trigger niches_set_updated_at
before update on public.niches
for each row execute function private.set_updated_at();

create trigger banner_presets_set_updated_at
before update on public.banner_presets
for each row execute function private.set_updated_at();

create trigger store_subscriptions_set_updated_at
before update on public.store_subscriptions
for each row execute function private.set_updated_at();

alter table public.niches enable row level security;
alter table public.banner_presets enable row level security;
alter table public.store_subscriptions enable row level security;

create policy niches_authenticated_select
  on public.niches for select to authenticated
  using (is_active);

create policy banner_presets_authenticated_select
  on public.banner_presets for select to authenticated
  using (
    is_active
    and exists (
      select 1 from public.niches niche
      where niche.id = banner_presets.niche_id and niche.is_active
    )
  );

create policy store_subscriptions_member_select
  on public.store_subscriptions for select
  using (
    exists (
      select 1
      from public.storefronts storefront
      join public.shopify_stores store on store.id = storefront.shopify_store_id
      where storefront.id = store_subscriptions.storefront_id
        and public.is_workspace_member(store.workspace_id)
    )
  );

insert into public.niches (key, name, display_order) values
  ('home_garden', 'Home & Garden', 10),
  ('beauty', 'Beauty', 20),
  ('pets', 'Pets', 30),
  ('fashion', 'Fashion', 40),
  ('electronics', 'Electronics', 50),
  ('sports_fitness', 'Sports & Fitness', 60),
  ('general_store', 'General Store', 70),
  ('not_sure', 'I am not sure yet', 80);

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

update public.onboarding_progress progress
set status = 'completed', completed_at = coalesce(progress.completed_at, now())
where progress.step_key = 'shopify_connection';

comment on column public.storefronts.template_key is
  'Internal fixed layout identifier. Niche and banner presets never change the storefront template.';
comment on table public.store_subscriptions is
  'One billable YourProStore subscription per storefront/Shopify store.';
comment on column public.store_subscriptions.unit_amount is
  'Price per billing period in the smallest currency unit, for example 900 for USD 9.00.';

commit;
