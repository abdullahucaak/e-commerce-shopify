begin;

insert into public.banner_presets (
  niche_id, name, title, subtitle, image_url,
  primary_color, secondary_color, display_order
)
select niche.id, preset.name, preset.title, preset.subtitle, preset.image_url,
       preset.primary_color, preset.secondary_color, 10
from public.niches niche
join (
  values
    ('beauty', 'Essential', 'Glow with confidence', 'Beauty essentials selected for everyday routines.', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80', '#3F3038', '#D9A6B8'),
    ('pets', 'Companion', 'Better days for every pet', 'Thoughtful products for happy, healthy companions.', 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=80', '#34473C', '#C7A77A'),
    ('fashion', 'Modern', 'Style made for you', 'Everyday pieces chosen to make personal style effortless.', 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80', '#292929', '#C9A978'),
    ('electronics', 'Smart', 'Smarter tech, simpler life', 'Useful technology selected for work, home and everyday life.', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80', '#243244', '#5AA7D9'),
    ('sports_fitness', 'Active', 'Move stronger every day', 'Gear and essentials that support every step of your routine.', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', '#263A32', '#E08B45'),
    ('general_store', 'Versatile', 'Everything you need, together', 'A flexible storefront for useful finds across every category.', 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80', '#303841', '#B9925E'),
    ('not_sure', 'Starter', 'A store ready for your idea', 'Start with a flexible look and shape the details as you grow.', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80', '#303841', '#7A9E9F')
) as preset(
  niche_key, name, title, subtitle, image_url, primary_color, secondary_color
) on preset.niche_key = niche.key
where not exists (
  select 1 from public.banner_presets existing
  where existing.niche_id = niche.id and existing.name = preset.name
);

commit;
