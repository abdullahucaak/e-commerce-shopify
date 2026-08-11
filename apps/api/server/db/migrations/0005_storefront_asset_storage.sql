begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'storefront-assets',
  'storefront-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storefront_assets_public_read
  on storage.objects for select
  using (bucket_id = 'storefront-assets');

create policy storefront_assets_member_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'storefront-assets'
    and exists (
      select 1
      from public.storefronts storefront
      join public.shopify_stores store on store.id = storefront.shopify_store_id
      where storefront.id::text = (storage.foldername(name))[1]
        and public.is_workspace_member(store.workspace_id)
    )
  );

create policy storefront_assets_member_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'storefront-assets'
    and exists (
      select 1
      from public.storefronts storefront
      join public.shopify_stores store on store.id = storefront.shopify_store_id
      where storefront.id::text = (storage.foldername(name))[1]
        and public.is_workspace_member(store.workspace_id)
    )
  )
  with check (
    bucket_id = 'storefront-assets'
    and exists (
      select 1
      from public.storefronts storefront
      join public.shopify_stores store on store.id = storefront.shopify_store_id
      where storefront.id::text = (storage.foldername(name))[1]
        and public.is_workspace_member(store.workspace_id)
    )
  );

create policy storefront_assets_member_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'storefront-assets'
    and exists (
      select 1
      from public.storefronts storefront
      join public.shopify_stores store on store.id = storefront.shopify_store_id
      where storefront.id::text = (storage.foldername(name))[1]
        and public.is_workspace_member(store.workspace_id)
    )
  );

commit;
