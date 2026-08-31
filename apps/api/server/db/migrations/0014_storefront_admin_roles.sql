begin;

create or replace function public.can_write_storefront_asset(
  requested_storefront_id text,
  requested_folder text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.storefronts storefront
    join public.shopify_stores store
      on store.id = storefront.shopify_store_id
    join public.workspace_memberships membership
      on membership.workspace_id = store.workspace_id
    where storefront.id::text = requested_storefront_id
      and membership.user_id = auth.uid()
      and (
        (
          membership.role::text in ('owner', 'admin')
          and requested_folder in ('logos', 'hero', 'about')
        )
        or (
          membership.role::text = 'editor'
          and requested_folder in ('hero', 'about')
        )
      )
  );
$$;

revoke all on function public.can_write_storefront_asset(text, text) from public;
grant execute on function public.can_write_storefront_asset(text, text) to authenticated;

drop policy if exists storefront_assets_member_insert on storage.objects;
drop policy if exists storefront_assets_member_update on storage.objects;
drop policy if exists storefront_assets_member_delete on storage.objects;
drop policy if exists storefront_assets_role_insert on storage.objects;
drop policy if exists storefront_assets_role_update on storage.objects;
drop policy if exists storefront_assets_role_delete on storage.objects;

create policy storefront_assets_role_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'storefront-assets'
    and (storage.foldername(name))[1] ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_write_storefront_asset(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
  );

create policy storefront_assets_role_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'storefront-assets'
    and (storage.foldername(name))[1] ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_write_storefront_asset(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
  )
  with check (
    bucket_id = 'storefront-assets'
    and (storage.foldername(name))[1] ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_write_storefront_asset(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
  );

create policy storefront_assets_role_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'storefront-assets'
    and (storage.foldername(name))[1] ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_write_storefront_asset(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
  );

commit;
