begin;

create table private.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'support', 'read_only')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  mfa_required boolean not null default true check (mfa_required = true),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index platform_admins_status_role_idx
  on private.platform_admins(status, role);

create trigger platform_admins_set_updated_at
before update on private.platform_admins
for each row execute function private.set_updated_at();

revoke all on table private.platform_admins from public, anon, authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  requested_workspace_name text;
begin
  -- raw_app_meta_data is writable only through trusted Auth administration. A
  -- platform admin account must never receive an automatic customer workspace.
  if coalesce(new.raw_app_meta_data ->> 'account_type', '') = 'platform_admin' then
    return new;
  end if;

  requested_workspace_name := nullif(trim(new.raw_user_meta_data ->> 'business_name'), '');
  insert into public.workspaces (name)
  values (left(coalesce(requested_workspace_name, nullif(split_part(new.email, '@', 1), ''), 'New workspace'), 120))
  returning id into new_workspace_id;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public;

comment on table private.platform_admins is
  'Backend-only platform operator authorization. Customer workspace roles never grant platform access.';
comment on column private.platform_admins.mfa_required is
  'Platform access always requires an independently verified Supabase aal2 session.';

commit;
