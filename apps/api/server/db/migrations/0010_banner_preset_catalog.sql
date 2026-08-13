begin;

insert into public.banner_presets (
  niche_id, name, title, subtitle, image_url, primary_color, secondary_color, display_order
)
select niche.id, preset.name, preset.title, preset.subtitle, preset.image_url,
       preset.primary_color, preset.secondary_color, preset.display_order
from public.niches niche
cross join lateral (
  values
    ('Clean', 'Designed for everyday living', 'Useful products for a calmer, smarter home.', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80', '#303841', '#D9D0C1', 10),
    ('Warm', 'Make your space feel like home', 'Thoughtful finds selected for comfortable living.', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80', '#3E4638', '#D7B89C', 20)
) as preset(name, title, subtitle, image_url, primary_color, secondary_color, display_order)
where niche.key = 'home_garden'
  and not exists (
    select 1 from public.banner_presets existing
    where existing.niche_id = niche.id and existing.name = preset.name
  );

commit;
