begin;

create table if not exists private.storefront_asset_write_permits (
  storage_path text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (operation in ('upload', 'delete')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (storage_path, operation)
);

create index if not exists storefront_asset_write_permits_expiry_idx
  on private.storefront_asset_write_permits(expires_at);

revoke all on table private.storefront_asset_write_permits from public, anon, authenticated;

create or replace function public.has_storefront_asset_write_permit(
  requested_path text,
  requested_operation text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.storefront_asset_write_permits permit
    where permit.storage_path = requested_path
      and permit.operation = requested_operation
      and permit.user_id = auth.uid()
      and permit.expires_at > now()
  );
$$;

revoke all on function public.has_storefront_asset_write_permit(text, text) from public;
grant execute on function public.has_storefront_asset_write_permit(text, text) to authenticated;

drop policy if exists storefront_assets_member_insert on storage.objects;
drop policy if exists storefront_assets_member_update on storage.objects;
drop policy if exists storefront_assets_member_delete on storage.objects;
drop policy if exists storefront_assets_role_insert on storage.objects;
drop policy if exists storefront_assets_role_update on storage.objects;
drop policy if exists storefront_assets_role_delete on storage.objects;
drop policy if exists storefront_assets_permitted_insert on storage.objects;
drop policy if exists storefront_assets_permitted_delete on storage.objects;

create policy storefront_assets_permitted_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'storefront-assets'
    and public.has_storefront_asset_write_permit(name, 'upload')
  );

create policy storefront_assets_permitted_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'storefront-assets'
    and public.has_storefront_asset_write_permit(name, 'delete')
  );

commit;
