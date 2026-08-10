begin;

alter table private.shopify_credentials
  alter column admin_access_token_ciphertext drop not null;

comment on column private.shopify_credentials.admin_access_token_ciphertext is
  'Encrypted Admin API token. Null until the merchant completes Shopify OAuth.';

commit;
