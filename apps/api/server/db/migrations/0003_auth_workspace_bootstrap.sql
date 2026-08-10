begin;

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
  requested_workspace_name := nullif(
    trim(new.raw_user_meta_data ->> 'business_name'),
    ''
  );

  insert into public.workspaces (name)
  values (
    left(
      coalesce(
        requested_workspace_name,
        nullif(split_part(new.email, '@', 1), ''),
        'New workspace'
      ),
      120
    )
  )
  returning id into new_workspace_id;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

grant usage on schema public to authenticated;
grant select on table
  public.workspaces,
  public.workspace_memberships,
  public.shopify_stores,
  public.shopify_domain_aliases,
  public.platform_releases,
  public.storefronts,
  public.store_domains,
  public.storefront_config_versions,
  public.design_assets,
  public.platform_feature_flags,
  public.store_feature_overrides,
  public.onboarding_progress
to authenticated;

commit;
