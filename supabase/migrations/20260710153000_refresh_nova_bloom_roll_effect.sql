UPDATE public.shop_items
SET
  name = 'Nova Bloom',
  description = 'A radiant stellar burst that blooms around your roll orb.'
WHERE slot = 'roll_effect'
  AND css_value = 'roll-pixelate-anim';
