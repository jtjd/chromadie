-- Phase 2 hardening:
-- Make purchase balance checks resilient to malformed profile rows and
-- prevent NULL ep_spent from propagating through wallet math.

CREATE OR REPLACE FUNCTION public.purchase_item_impl(p_item_key text) RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_item_slot text;
    item_cost bigint;
    user_ep_spent bigint;
    user_lifetime_ep bigint;
    user_balance bigint;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT cost, slot INTO item_cost, v_item_slot
    FROM shop_items
    WHERE item_key = p_item_key;

    IF item_cost IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid item');
    END IF;

    -- Block purchasing 0-cost milestone items.
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
        IF p_item_key = 'streak_freeze' THEN
            INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, p_item_key);
        ELSIF p_item_key = 'reroll_shard' THEN
            UPDATE profiles
            SET reroll_shards = COALESCE(reroll_shards, 0) + 1
            WHERE id = v_user_id;
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

        INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, p_item_key);
    END IF;

    UPDATE profiles
    SET ep_spent = COALESCE(ep_spent, 0) + item_cost
    WHERE id = v_user_id;

    RETURN json_build_object('success', true);
END;
$function$;

-- Defense in depth: ensure the wallet bookkeeping column cannot remain NULL.
UPDATE profiles
SET ep_spent = 0
WHERE ep_spent IS NULL;

ALTER TABLE profiles
    ALTER COLUMN ep_spent SET DEFAULT 0,
    ALTER COLUMN ep_spent SET NOT NULL;
