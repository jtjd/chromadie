BEGIN;

-- Temporary QA access for the named account. A public username alone must
-- never grant reward inventory; the account must currently be staff.
DO $$
DECLARE
  target_user uuid;
BEGIN
  SELECT p.id INTO target_user
  FROM public.profiles AS p
  WHERE lower(COALESCE(p.username_key, p.username)) = 'tjz'
    AND p.is_staff IS TRUE
  LIMIT 1;

  -- Local seed data has no QA staff account, so this safely becomes a no-op.
  IF target_user IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.inventory (user_id, item_key, quantity)
  SELECT target_user, item.item_key, 1
  FROM public.shop_items AS item
  WHERE item.catalog_status = 'active'
    AND item.slot <> 'consumable'
  ON CONFLICT (user_id, item_key) DO UPDATE
    SET quantity = GREATEST(public.inventory.quantity, EXCLUDED.quantity);
END $$;

COMMIT;
