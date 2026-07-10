-- Move inventory to a quantity-based model so stackable items can grow without
-- adding special-case uniqueness rules.

ALTER TABLE public.inventory
    ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

UPDATE public.inventory
SET quantity = COALESCE(quantity, 1)
WHERE quantity IS NULL OR quantity < 1;

ALTER TABLE public.shop_items
    ADD COLUMN IF NOT EXISTS stackable boolean NOT NULL DEFAULT false;

UPDATE public.shop_items
SET stackable = true
WHERE item_key = 'streak_freeze';

CREATE OR REPLACE FUNCTION public.consume_inventory_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF OLD.quantity > 1 THEN
        UPDATE public.inventory
        SET quantity = OLD.quantity - 1
        WHERE id = OLD.id;
        RETURN NULL;
    END IF;

    RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS inventory_consume_quantity ON public.inventory;
CREATE TRIGGER inventory_consume_quantity
    BEFORE DELETE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.consume_inventory_quantity();
