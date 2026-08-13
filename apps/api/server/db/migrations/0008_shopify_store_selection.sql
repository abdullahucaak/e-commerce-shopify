begin;

alter table private.shopify_oauth_states
  alter column shop_domain drop not null;

alter table private.shopify_oauth_states
  drop constraint shopify_oauth_states_shop_domain_format;

alter table private.shopify_oauth_states
  add constraint shopify_oauth_states_shop_domain_format check (
    shop_domain is null
    or (
      shop_domain = lower(shop_domain)
      and shop_domain ~ '^[a-z0-9][a-z0-9-]*[.]myshopify[.]com$'
    )
  );

comment on column private.shopify_oauth_states.shop_domain is
  'Null while Shopify is handling login/store selection; populated before OAuth authorization.';

commit;
