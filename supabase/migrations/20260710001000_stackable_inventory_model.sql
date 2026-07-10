-- Update purchase logic for quantity-based inventory rows.
-- Stackable shop items increment the inventory quantity instead of trying to
-- create duplicate rows.

CREATE OR REPLACE FUNCTION public.purchase_item_impl(p_item_key text) RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_item_slot text;
    v_stackable boolean;
    item_cost bigint;
    user_ep_spent bigint;
    user_lifetime_ep bigint;
    user_balance bigint;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT cost, slot, COALESCE(stackable, false)
    INTO item_cost, v_item_slot, v_stackable
    FROM shop_items
    WHERE item_key = p_item_key;

    IF item_cost IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid item');
    END IF;

    IF item_cost <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'This item cannot be purchased.');
    END IF;

    SELECT COALESCE(ep_spent, 0) INTO user_ep_spent
    FROM profiles
    WHERE id = v_user_id;

    SELECT COALESCE(lifetime_ep, 0) INTO user_lifetime_ep
    FROM profiles
    WHERE id = v_user_id;

    user_balance := user_lifetime_ep - COALESCE(user_ep_spent, 0);
    IF user_balance < item_cost THEN
        RETURN json_build_object('success', false, 'error', 'Not enough EP');
    END IF;

    IF v_item_slot = 'consumable' THEN
        IF p_item_key = 'reroll_shard' THEN
            UPDATE profiles
            SET reroll_shards = COALESCE(reroll_shards, 0) + 1
            WHERE id = v_user_id;
        ELSIF v_stackable THEN
            INSERT INTO inventory (user_id, item_key, quantity)
            VALUES (v_user_id, p_item_key, 1)
            ON CONFLICT (user_id, item_key)
            DO UPDATE SET quantity = inventory.quantity + 1;
        END IF;
    ELSE
        IF EXISTS (
            SELECT 1
            FROM inventory
            WHERE user_id = v_user_id
              AND item_key = p_item_key
        ) THEN
            RETURN json_build_object('success', false, 'error', 'Already owned');
        END IF;

        INSERT INTO inventory (user_id, item_key, quantity)
        VALUES (v_user_id, p_item_key, 1);
    END IF;

    UPDATE profiles
    SET ep_spent = COALESCE(ep_spent, 0) + item_cost
    WHERE id = v_user_id;

    RETURN json_build_object('success', true);
END;
$function$;
