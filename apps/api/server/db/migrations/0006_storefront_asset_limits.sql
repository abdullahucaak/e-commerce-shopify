begin;

update storage.buckets
set
  file_size_limit = 8388608,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
where id = 'storefront-assets';

commit;
