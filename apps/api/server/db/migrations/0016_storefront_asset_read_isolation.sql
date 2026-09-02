begin;

drop policy if exists storefront_assets_public_read on storage.objects;
drop policy if exists storefront_assets_member_read on storage.objects;

create policy storefront_assets_member_read
  on storage.objects for select to authenticated
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

comment on policy storefront_assets_member_read on storage.objects is
  'Authenticated CMS users may list only asset metadata belonging to their own workspaces. Public object delivery remains controlled by the public bucket.';

commit;
