begin;

create table private.customer_auth_handoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  session_ciphertext text not null,
  return_path text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint customer_auth_handoffs_return_path check (
    return_path ~ '^/[A-Za-z0-9/_?&=.%~-]*$' and return_path !~ '^//'
  )
);

create index customer_auth_handoffs_expires_at_idx
  on private.customer_auth_handoffs(expires_at);

comment on table private.customer_auth_handoffs is
  'Short-lived, one-time encrypted Supabase sessions for customer SSO into storefront-admin.';

commit;
