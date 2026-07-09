


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."admin_bump_shop_version"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_user_id UUID := auth.uid(); v_is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_user_id;
    IF NOT COALESCE(v_is_admin, false) THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
    
    UPDATE meta SET value = NOW()::text WHERE key = 'shop_version';
    RETURN json_build_object('success', true);
END;
 $$;


ALTER FUNCTION "public"."admin_bump_shop_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_randomize_cotw"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_user_id UUID := auth.uid(); v_is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_user_id;
    IF NOT COALESCE(v_is_admin, false) THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
    
    PERFORM public.update_cotw();
    RETURN json_build_object('success', true);
END;
 $$;


ALTER FUNCTION "public"."admin_randomize_cotw"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_trigger_cotw_test"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_user_id UUID := auth.uid(); v_is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_user_id;
    IF NOT COALESCE(v_is_admin, false) THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
    
    UPDATE profiles SET force_cotw_next_roll = TRUE WHERE id = v_user_id;
    RETURN json_build_object('success', true, 'message', 'COTW test armed. Your next roll will hit.');
END;
 $$;


ALTER FUNCTION "public"."admin_trigger_cotw_test"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_scores"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$ BEGIN
    -- Old scores are already accounted for in lifetime_ep via the trigger.
    -- We just need to delete them to save space.
    DELETE FROM scores WHERE roll_date < CURRENT_DATE - INTERVAL '30 days';
END;
 $$;


ALTER FUNCTION "public"."cleanup_old_scores"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."equip_badges"("p_badge_ids" "jsonb") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
    v_user_id UUID := auth.uid();
    v_badge TEXT;
    v_invalid_badge BOOLEAN := FALSE;
BEGIN
    IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
    
    -- FIX: Enforce 3-badge limit server-side
    IF jsonb_array_length(p_badge_ids) > 3 THEN
        RETURN json_build_object('success', false, 'error', 'You can only pin 3 achievements.');
    END IF;

    FOR v_badge IN SELECT * FROM jsonb_array_elements_text(p_badge_ids)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = v_user_id AND achievement_id = v_badge) THEN
            v_invalid_badge := TRUE;
        END IF;
    END LOOP;

    IF v_invalid_badge THEN
        RETURN json_build_object('success', false, 'error', 'You do not own all selected badges.');
    END IF;

    UPDATE profiles SET equipped_badges = p_badge_ids WHERE id = v_user_id;
    RETURN json_build_object('success', true, 'badges', p_badge_ids);
END;
 $$;


ALTER FUNCTION "public"."equip_badges"("p_badge_ids" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."equip_item"("p_item_key" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_user_id uuid := auth.uid();
    v_owned boolean;
    v_slot text;
    v_current_cosmetics jsonb;
begin
    if v_user_id is null then return json_build_object('success', false, 'error', 'Not authenticated'); end if;

    select exists(select 1 from inventory where user_id = v_user_id and item_key = p_item_key) into v_owned;
    if not v_owned then return json_build_object('success', false, 'error', 'Item not owned'); end if;

    select slot into v_slot from shop_items where item_key = p_item_key;
    if v_slot is null then return json_build_object('success', false, 'error', 'Invalid item'); end if;

    select equipped_cosmetics into v_current_cosmetics from profiles where id = v_user_id;
    if v_current_cosmetics is null then v_current_cosmetics := '{}'::jsonb; end if;

    v_current_cosmetics := v_current_cosmetics || jsonb_build_object(v_slot, p_item_key);
    update profiles set equipped_cosmetics = v_current_cosmetics where id = v_user_id;

    return json_build_object('success', true, 'cosmetics', v_current_cosmetics);
end;
$$;


ALTER FUNCTION "public"."equip_item"("p_item_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_percentile"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
    v_user_id UUID := auth.uid();
    v_score BIGINT;
    v_total INT; v_higher INT; v_perc NUMERIC;
BEGIN
    SELECT score INTO v_score FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
    IF v_score IS NULL THEN RETURN json_build_object('success', false); END IF;
    
    SELECT count(*) INTO v_total FROM scores WHERE roll_date = CURRENT_DATE;
    SELECT count(*) INTO v_higher FROM scores WHERE roll_date = CURRENT_DATE AND score > v_score;
    
    v_perc := CASE WHEN v_total > 0 THEN round(((1.0 - (v_higher::FLOAT / v_total)) * 100)::numeric, 2) ELSE 100.0 END;
    RETURN json_build_object('success', true, 'percentile', v_perc, 'total_rollers', v_total);
END;
 $$;


ALTER FUNCTION "public"."get_my_percentile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_rivals_scores"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RETURN '[]'::json; END IF;
    
    RETURN json_agg(
        json_build_object(
            'user_id', s.user_id,
            'hex_code', s.hex_code,
            'score', s.score,
            'rarity', s.rarity,
            'username', p.username,
            'current_streak', p.current_streak,
            'equipped_cosmetics', p.equipped_cosmetics
        )
    )
    FROM scores s
    JOIN profiles p ON s.user_id = p.id
    WHERE s.roll_date = CURRENT_DATE
      AND s.user_id IN (SELECT followee_id FROM user_follows WHERE follower_id = v_user_id)
    ORDER BY s.score DESC;
END;
 $$;


ALTER FUNCTION "public"."get_rivals_scores"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_score_percentile"("p_score" bigint) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE
    v_total BIGINT;
    v_better BIGINT;
    v_percentile NUMERIC;
BEGIN
    -- 1. Get total rollers today
    SELECT COUNT(*) INTO v_total
    FROM scores
    WHERE roll_date = CURRENT_DATE;

    -- Edge case: No one has rolled today yet
    IF v_total = 0 THEN
        RETURN json_build_object('total_rollers', 0, 'percentile', 100);
    END IF;

    -- 2. Get count of people who scored BETTER than the player
    SELECT COUNT(*) INTO v_better
    FROM scores
    WHERE roll_date = CURRENT_DATE AND score > p_score;

    -- 3. Calculate percentile (% of people beaten)
    -- Example: 100 total, 2 better. (100 - 2) / 100 = 0.98 -> 98th percentile (Top 2%)
    v_percentile := ((v_total - v_better)::NUMERIC / v_total) * 100;

    RETURN json_build_object(
        'total_rollers', v_total,
        'percentile', v_percentile
    );
END;
 $$;


ALTER FUNCTION "public"."get_score_percentile"("p_score" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_wallet_balance"() RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE
    p_user_id UUID := auth.uid();
    v_lifetime_ep BIGINT; -- Renamed variable to avoid ambiguity
    v_spent_ep BIGINT;
BEGIN
    -- If not logged in, return 0
    IF p_user_id IS NULL THEN
        RETURN 0;
    END IF;

    -- Use table alias 'p' to explicitly select the column
    SELECT COALESCE(p.lifetime_ep, 0) INTO v_lifetime_ep
    FROM profiles p WHERE p.id = p_user_id;

    SELECT COALESCE(p.ep_spent, 0) INTO v_spent_ep
    FROM profiles p WHERE p.id = p_user_id;

    RETURN v_lifetime_ep - v_spent_ep;
END;
 $$;


ALTER FUNCTION "public"."get_wallet_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
 $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_prime"("n" integer) RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$ DECLARE
    i INT;
BEGIN
    IF n <= 1 THEN RETURN FALSE; END IF;
    IF n <= 3 THEN RETURN TRUE; END IF;
    IF n % 2 = 0 OR n % 3 = 0 THEN RETURN FALSE; END IF;
    i := 5;
    WHILE i * i <= n LOOP
        IF n % i = 0 OR n % (i + 2) = 0 THEN RETURN FALSE; END IF;
        i := i + 6;
    END LOOP;
    RETURN TRUE;
END;
 $$;


ALTER FUNCTION "public"."is_prime"("n" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_item"("p_item_key" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
    v_user_id uuid := auth.uid(); v_item_slot text; item_cost bigint; user_ep_spent bigint; user_lifetime_ep bigint; user_balance bigint;
BEGIN
    if v_user_id is null then return json_build_object('success', false, 'error', 'Not authenticated'); end if;
    select cost, slot into item_cost, v_item_slot from shop_items where item_key = p_item_key;
    if item_cost is null then return json_build_object('success', false, 'error', 'Invalid item'); end if;
    
    -- FIX: Block purchasing 0-cost milestone items
    if item_cost <= 0 then return json_build_object('success', false, 'error', 'This item cannot be purchased.'); end if;

    select ep_spent into user_ep_spent from profiles where id = v_user_id;
    select coalesce(lifetime_ep, 0) into user_lifetime_ep from profiles where id = v_user_id;
    user_balance := user_lifetime_ep - user_ep_spent;
    if user_balance < item_cost then return json_build_object('success', false, 'error', 'Not enough EP'); end if;

    IF v_item_slot = 'consumable' THEN
        IF p_item_key = 'streak_freeze' THEN
            INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, p_item_key);
        ELSEIF p_item_key = 'reroll_shard' THEN
            UPDATE profiles SET reroll_shards = COALESCE(reroll_shards, 0) + 1 WHERE id = v_user_id;
        END IF;
    ELSE
        IF EXISTS (SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = p_item_key) THEN
            return json_build_object('success', false, 'error', 'Already owned');
        END IF;
        INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, p_item_key);
    END IF;

    update profiles set ep_spent = ep_spent + item_cost where id = v_user_id;
    return json_build_object('success', true);
END;
 $$;


ALTER FUNCTION "public"."purchase_item"("p_item_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."roll_die"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ 
DECLARE
    v_r INT; v_g INT; v_b INT; v_hex TEXT; v_hex_upper TEXT; v_hex_no_hash TEXT;
    v_total_score BIGINT := 0; v_badges JSONB := '[]'::jsonb; v_rarity TEXT;
    v_user_id UUID := auth.uid(); v_existing_roll RECORD;
    v_sum INT; v_max INT; v_min INT; v_range INT;
    v_total_count INT; v_higher_count INT; v_percentile NUMERIC;
    v_last_roll DATE; v_current_streak INT := 1; v_streak_bonus BIGINT := 0;
    v_new_achievements JSONB := '[]'::jsonb;
    v_total_rolls INT;
    v_ach_record RECORD;
    v_achievement_ep BIGINT := 0; -- NEW: Tracks currency gained from achievements separately
BEGIN
    v_r := floor(random() * 256); v_g := floor(random() * 256); v_b := floor(random() * 256);
    v_hex := '#' || lpad(to_hex(v_r), 2, '0') || lpad(to_hex(v_g), 2, '0') || lpad(to_hex(v_b), 2, '0');
    v_hex_upper := upper(v_hex); v_hex_no_hash := substr(v_hex_upper, 2);
    v_sum := v_r + v_g + v_b; v_max := greatest(v_r,v_g,v_b); v_min := least(v_r,v_g,v_b); v_range := v_max - v_min;

    -- ALL 100 ORIGINAL BADGE CHECKS (Adds to v_total_score)
    IF true THEN v_total_score := v_total_score + 1337; v_badges := v_badges || jsonb_build_object('name', 'Base Spectrum', 'points', 1337, 'symbol', '🎨', 'desc', 'Part of the spectrum', 'rarity', 'Common'); END IF;
    IF v_sum % 2 = 0 THEN v_total_score := v_total_score + 2024; v_badges := v_badges || jsonb_build_object('name', 'Sum is Even', 'points', 2024, 'symbol', '⚖️', 'desc', 'R+G+B is even', 'rarity', 'Common'); END IF;
    IF v_sum % 2 != 0 THEN v_total_score := v_total_score + 2023; v_badges := v_badges || jsonb_build_object('name', 'Sum is Odd', 'points', 2023, 'symbol', '🎲', 'desc', 'R+G+B is odd', 'rarity', 'Common'); END IF;
    IF v_sum % 3 = 0 THEN v_total_score := v_total_score + 15000; v_badges := v_badges || jsonb_build_object('name', 'Divisible by 3', 'points', 15000, 'symbol', '3️⃣', 'desc', 'Sum is multiple of 3', 'rarity', 'Uncommon'); END IF;
    IF v_sum = 42 THEN v_total_score := v_total_score + 42000; v_badges := v_badges || jsonb_build_object('name', 'Meaning of Life', 'points', 42000, 'symbol', '🧬', 'desc', 'Sum is exactly 42', 'rarity', 'Rare'); END IF;
    IF v_sum > 300 AND v_sum < 500 THEN v_total_score := v_total_score + 5500; v_badges := v_badges || jsonb_build_object('name', 'Balanced Sum', 'points', 5500, 'symbol', '🧘', 'desc', 'Sum is 300-499', 'rarity', 'Common'); END IF;
    IF v_r%2=0 AND v_g%2=0 AND v_b%2=0 THEN v_total_score := v_total_score + 2222; v_badges := v_badges || jsonb_build_object('name', 'All Even', 'points', 2222, 'symbol', '2️⃣', 'desc', 'RGB all even', 'rarity', 'Common'); END IF;
    IF v_r%2!=0 AND v_g%2!=0 AND v_b%2!=0 THEN v_total_score := v_total_score + 3333; v_badges := v_badges || jsonb_build_object('name', 'All Odd', 'points', 3333, 'symbol', '1️⃣', 'desc', 'RGB all odd', 'rarity', 'Common'); END IF;
    IF v_r%3=0 AND v_g%3=0 AND v_b%3=0 THEN v_total_score := v_total_score + 4444; v_badges := v_badges || jsonb_build_object('name', 'Multiples of 3', 'points', 4444, 'symbol', '🔢', 'desc', 'RGB divisible by 3', 'rarity', 'Common'); END IF;
    IF v_range > 200 THEN v_total_score := v_total_score + 8080; v_badges := v_badges || jsonb_build_object('name', 'High Contrast', 'points', 8080, 'symbol', '🌓', 'desc', 'Extreme color range', 'rarity', 'Uncommon'); END IF;
    IF v_range < 50 THEN v_total_score := v_total_score + 1111; v_badges := v_badges || jsonb_build_object('name', 'Low Contrast', 'points', 1111, 'symbol', '🌫️', 'desc', 'Muddy/muted tone', 'rarity', 'Common'); END IF;
    IF v_range > 50 AND v_range < 150 THEN v_total_score := v_total_score + 3300; v_badges := v_badges || jsonb_build_object('name', 'Moderate Contrast', 'points', 3300, 'symbol', '🛤️', 'desc', 'Range is 50-150', 'rarity', 'Common'); END IF;
    IF v_max > 200 AND v_min > 100 AND v_range < 80 THEN v_total_score := v_total_score + 250000; v_badges := v_badges || jsonb_build_object('name', 'Pastel Soft', 'points', 250000, 'symbol', '🌸', 'desc', 'Soft pastel hue', 'rarity', 'Epic'); END IF;
    IF v_max > 200 AND v_min < 50 THEN v_total_score := v_total_score + 250000; v_badges := v_badges || jsonb_build_object('name', 'Neon Bright', 'points', 250000, 'symbol', '💡', 'desc', 'Vivid neon glow', 'rarity', 'Epic'); END IF;
    IF v_r > 128 THEN v_total_score := v_total_score + 4400; v_badges := v_badges || jsonb_build_object('name', 'Bright Red', 'points', 4400, 'symbol', '🔴', 'desc', 'Red > 128', 'rarity', 'Common'); END IF;
    IF v_r < 128 THEN v_total_score := v_total_score + 2200; v_badges := v_badges || jsonb_build_object('name', 'Dark Red', 'points', 2200, 'symbol', '🔴', 'desc', 'Red < 128', 'rarity', 'Common'); END IF;
    IF v_g > 128 THEN v_total_score := v_total_score + 4400; v_badges := v_badges || jsonb_build_object('name', 'Bright Green', 'points', 4400, 'symbol', '🟢', 'desc', 'Green > 128', 'rarity', 'Common'); END IF;
    IF v_g < 128 THEN v_total_score := v_total_score + 2200; v_badges := v_badges || jsonb_build_object('name', 'Dark Green', 'points', 2200, 'symbol', '🟢', 'desc', 'Green < 128', 'rarity', 'Common'); END IF;
    IF v_b > 128 THEN v_total_score := v_total_score + 4400; v_badges := v_badges || jsonb_build_object('name', 'Bright Blue', 'points', 4400, 'symbol', '🔵', 'desc', 'Blue > 128', 'rarity', 'Common'); END IF;
    IF v_b < 128 THEN v_total_score := v_total_score + 2200; v_badges := v_badges || jsonb_build_object('name', 'Dark Blue', 'points', 2200, 'symbol', '🔵', 'desc', 'Blue < 128', 'rarity', 'Common'); END IF;
    IF v_r IN (0,51,102,153,204,255) AND v_g IN (0,51,102,153,204,255) AND v_b IN (0,51,102,153,204,255) THEN v_total_score := v_total_score + 15151; v_badges := v_badges || jsonb_build_object('name', 'Web Safe', 'points', 15151, 'symbol', '🕸️', 'desc', '1990s web safe', 'rarity', 'Uncommon'); END IF;
    IF substr(v_hex_no_hash, 1, 2) = substr(v_hex_no_hash, 3, 2) AND substr(v_hex_no_hash, 3, 2) = substr(v_hex_no_hash, 5, 2) THEN v_total_score := v_total_score + 150000; v_badges := v_badges || jsonb_build_object('name', 'Perfect Triplets', 'points', 150000, 'symbol', '🟰', 'desc', 'Hex is XXYYZZ', 'rarity', 'Rare'); END IF;
    IF v_r = v_g AND v_g = v_b THEN v_total_score := v_total_score + 25525; v_badges := v_badges || jsonb_build_object('name', 'Greyscale', 'points', 25525, 'symbol', '⚫', 'desc', 'Pure greyscale', 'rarity', 'Uncommon'); END IF;
    IF v_hex_no_hash = reverse(v_hex_no_hash) THEN v_total_score := v_total_score + 50005; v_badges := v_badges || jsonb_build_object('name', 'Palindrome', 'points', 50005, 'symbol', '🪞', 'desc', 'Reads same backwards', 'rarity', 'Rare'); END IF;
    IF is_prime(v_sum) THEN v_total_score := v_total_score + 100000; v_badges := v_badges || jsonb_build_object('name', 'Prime Sum', 'points', 100000, 'symbol', '🔢', 'desc', 'R+G+B is prime', 'rarity', 'Rare'); END IF;
    IF v_hex_upper LIKE '%A%' THEN v_total_score := v_total_score + 4111; v_badges := v_badges || jsonb_build_object('name', 'Contains A', 'points', 4111, 'symbol', '🅰️', 'desc', 'Hex has A', 'rarity', 'Common'); END IF;
    IF v_hex_upper LIKE '%B%' THEN v_total_score := v_total_score + 4222; v_badges := v_badges || jsonb_build_object('name', 'Contains B', 'points', 4222, 'symbol', '🅱️', 'desc', 'Hex has B', 'rarity', 'Common'); END IF;
    IF v_hex_upper LIKE '%C%' THEN v_total_score := v_total_score + 4333; v_badges := v_badges || jsonb_build_object('name', 'Contains C', 'points', 4333, 'symbol', '©️', 'desc', 'Hex has C', 'rarity', 'Common'); END IF;
    IF v_hex_upper LIKE '%D%' THEN v_total_score := v_total_score + 4444; v_badges := v_badges || jsonb_build_object('name', 'Contains D', 'points', 4444, 'symbol', '🇩', 'desc', 'Hex has D', 'rarity', 'Common'); END IF;
    IF v_hex_upper LIKE '%E%' THEN v_total_score := v_total_score + 4555; v_badges := v_badges || jsonb_build_object('name', 'Contains E', 'points', 4555, 'symbol', '📧', 'desc', 'Hex has E', 'rarity', 'Common'); END IF;
    IF v_hex_upper LIKE '%F%' THEN v_total_score := v_total_score + 4666; v_badges := v_badges || jsonb_build_object('name', 'Contains F', 'points', 4666, 'symbol', '🇫', 'desc', 'Hex has F', 'rarity', 'Common'); END IF;
    IF v_hex_upper LIKE '%0%' THEN v_total_score := v_total_score + 4000; v_badges := v_badges || jsonb_build_object('name', 'Contains 0', 'points', 4000, 'symbol', '⭕', 'desc', 'Hex has 0', 'rarity', 'Common'); END IF;
    IF abs(v_r - v_g) < 30 THEN v_total_score := v_total_score + 6600; v_badges := v_badges || jsonb_build_object('name', 'Similar RG', 'points', 6600, 'symbol', '🤝', 'desc', 'Red & Green close', 'rarity', 'Common'); END IF;
    IF abs(v_g - v_b) < 30 THEN v_total_score := v_total_score + 6600; v_badges := v_badges || jsonb_build_object('name', 'Similar GB', 'points', 6600, 'symbol', '🤝', 'desc', 'Green & Blue close', 'rarity', 'Common'); END IF;
    IF abs(v_r - v_b) < 30 THEN v_total_score := v_total_score + 6600; v_badges := v_badges || jsonb_build_object('name', 'Similar RB', 'points', 6600, 'symbol', '🤝', 'desc', 'Red & Blue close', 'rarity', 'Common'); END IF;
    IF v_r=255 AND v_g=0 AND v_b=0 THEN v_total_score := v_total_score + 666666; v_badges := v_badges || jsonb_build_object('name', 'Pure Red', 'points', 666666, 'symbol', '🟥', 'desc', 'Maximum Red', 'rarity', 'Epic'); END IF;
    IF v_r=0 AND v_g=255 AND v_b=0 THEN v_total_score := v_total_score + 999999; v_badges := v_badges || jsonb_build_object('name', 'Pure Green', 'points', 999999, 'symbol', '🟩', 'desc', 'Maximum Green', 'rarity', 'Epic'); END IF;
    IF v_r=0 AND v_g=0 AND v_b=255 THEN v_total_score := v_total_score + 420420; v_badges := v_badges || jsonb_build_object('name', 'Pure Blue', 'points', 420420, 'symbol', '🟦', 'desc', 'Maximum Blue', 'rarity', 'Epic'); END IF;
    IF v_r=255 AND v_g=215 AND v_b=0 THEN v_total_score := v_total_score + 5005005; v_badges := v_badges || jsonb_build_object('name', 'Gold', 'points', 5005005, 'symbol', '🥇', 'desc', 'Pure Gold', 'rarity', 'Mythic'); END IF;
    IF v_r=145 AND v_g=70 AND v_b=255 THEN v_total_score := v_total_score + 2940294; v_badges := v_badges || jsonb_build_object('name', 'Twitch Purple', 'points', 2940294, 'symbol', '🟣', 'desc', 'Brand Match', 'rarity', 'Mythic'); END IF;
    IF v_r=30 AND v_g=215 AND v_b=96 THEN v_total_score := v_total_score + 1991991; v_badges := v_badges || jsonb_build_object('name', 'Spotify Green', 'points', 1991991, 'symbol', '🟢', 'desc', 'Brand Match', 'rarity', 'Mythic'); END IF;
    IF v_r=244 AND v_g=0 AND v_b=9 THEN v_total_score := v_total_score + 1865186; v_badges := v_badges || jsonb_build_object('name', 'Coca-Cola Red', 'points', 1865186, 'symbol', '🥤', 'desc', 'Brand Match', 'rarity', 'Mythic'); END IF;
    IF v_hex_upper LIKE '%DEAD%' THEN v_total_score := v_total_score + 73217; v_badges := v_badges || jsonb_build_object('name', 'DEAD', 'points', 73217, 'symbol', '💀', 'desc', 'Hex contains DEAD', 'rarity', 'Rare'); END IF;
    IF v_hex_upper LIKE '%BEEF%' THEN v_total_score := v_total_score + 83388; v_badges := v_badges || jsonb_build_object('name', 'BEEF', 'points', 83388, 'symbol', '🥩', 'desc', 'Hex contains BEEF', 'rarity', 'Rare'); END IF;
    IF v_hex_upper LIKE '%CAFE%' THEN v_total_score := v_total_score + 74237; v_badges := v_badges || jsonb_build_object('name', 'CAFE', 'points', 74237, 'symbol', '☕', 'desc', 'Hex contains CAFE', 'rarity', 'Rare'); END IF;
    IF v_hex_upper LIKE '%FACE%' THEN v_total_score := v_total_score + 42069; v_badges := v_badges || jsonb_build_object('name', 'FACE', 'points', 42069, 'symbol', '😎', 'desc', 'Hex contains FACE', 'rarity', 'Rare'); END IF;
    IF v_r=255 AND v_g=255 AND v_b=255 THEN v_total_score := v_total_score + 5252525; v_badges := v_badges || jsonb_build_object('name', 'The Light', 'points', 5252525, 'symbol', '☀️', 'desc', 'Pure White', 'rarity', 'Mythic'); END IF;
    IF v_r=0 AND v_g=0 AND v_b=0 THEN v_total_score := v_total_score + 16777216; v_badges := v_badges || jsonb_build_object('name', 'The Void', 'points', 16777216, 'symbol', '🌑', 'desc', 'Pure Black', 'rarity', 'Mythic'); END IF;

    -- Calculate Rarity based on Leaderboard Score (v_total_score)
    IF v_total_score >= 5000000 THEN v_rarity := 'Mythic';
    ELSIF v_total_score >= 1000000 THEN v_rarity := 'Anomaly';
    ELSIF v_total_score >= 250000 THEN v_rarity := 'Epic';
    ELSIF v_total_score >= 50000 THEN v_rarity := 'Rare';
    ELSIF v_total_score >= 10000 THEN v_rarity := 'Uncommon';
    ELSIF v_total_score >= 1500 THEN v_rarity := 'Common';
    ELSE v_rarity := 'Trash';
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true, 'already_rolled', false, 'is_anon', true,
            'hex', v_hex_upper, 'r', v_r, 'g', v_g, 'b', v_b,
            'score', v_total_score, 'rarity', v_rarity, 'badges', v_badges
        );
    END IF;

    SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
    IF FOUND THEN
        SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = CURRENT_DATE;
        SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = CURRENT_DATE AND score > v_existing_roll.score;
        v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::FLOAT / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;
        RETURN jsonb_build_object('success', true, 'already_rolled', true, 'is_anon', false, 'hex', v_existing_roll.hex_code, 'score', v_existing_roll.score, 'rarity', v_existing_roll.rarity, 'badges', v_existing_roll.badges, 'percentile', v_percentile, 'total_rollers', v_total_count, 'new_achievements', '[]'::jsonb);
    END IF;

    SELECT last_roll_date, current_streak INTO v_last_roll, v_current_streak FROM profiles WHERE id = v_user_id;
    IF v_last_roll = CURRENT_DATE - 1 THEN
        v_current_streak := COALESCE(v_current_streak, 0) + 1;
    ELSE
        v_current_streak := 1;
    END IF;

    IF v_current_streak % 7 = 0 THEN
        v_streak_bonus := 50000;
        v_total_score := v_total_score + v_streak_bonus; -- Streak adds to Leaderboard Score
        v_badges := v_badges || jsonb_build_object('name', '7-Day Streak Bonus', 'points', v_streak_bonus, 'symbol', '🔥', 'desc', '7 days in a row!', 'rarity', 'Epic');
    END IF;

    SELECT count(*) + 1 INTO v_total_rolls FROM scores WHERE user_id = v_user_id;

    CREATE TEMP TABLE IF NOT EXISTS temp_ach_checks (id TEXT, condition_met BOOLEAN) ON COMMIT DROP;
    TRUNCATE temp_ach_checks;
    
    INSERT INTO temp_ach_checks VALUES 
        ('first_roll', TRUE), ('streak_7', v_current_streak >= 7), ('streak_14', v_current_streak >= 14),
        ('streak_30', v_current_streak >= 30), ('streak_100', v_current_streak >= 100),
        ('roll_10', v_total_rolls >= 10), ('roll_50', v_total_rolls >= 50), ('roll_100', v_total_rolls >= 100),
        ('roll_365', v_total_rolls >= 365), ('mythic_roll', v_rarity = 'Mythic'),
        ('rarity_anomaly', v_rarity = 'Anomaly'), ('rarity_epic', v_rarity = 'Epic'),
        ('rarity_rare', v_rarity = 'Rare'), ('score_10k', v_total_score >= 10000),
        ('score_50k', v_total_score >= 50000), ('score_100k', v_total_score >= 100000),
        ('score_1m', v_total_score >= 1000000), ('score_5m', v_total_score >= 5000000),
        ('roll_black', v_hex_upper = '#000000'), ('roll_white', v_hex_upper = '#FFFFFF'),
        ('roll_gold', v_r=255 AND v_g=215 AND v_b=0), ('roll_palindrome', v_hex_no_hash = reverse(v_hex_no_hash)),
        ('roll_prime', is_prime(v_sum)), ('roll_beef', v_hex_upper LIKE '%BEEF%'),
        ('roll_cafe', v_hex_upper LIKE '%CAFE%'), ('roll_dead', v_hex_upper LIKE '%DEAD%'),
        ('roll_face', v_hex_upper LIKE '%FACE%'), ('roll_even_sum', v_sum % 2 = 0),
        ('roll_odd_sum', v_sum % 2 != 0), ('roll_div3_sum', v_sum % 3 = 0),
        ('roll_42_sum', v_sum = 42), ('roll_balanced_sum', v_sum > 300 AND v_sum < 500),
        ('all_even_rgb', v_r%2=0 AND v_g%2=0 AND v_b%2=0), ('all_odd_rgb', v_r%2!=0 AND v_g%2!=0 AND v_b%2!=0),
        ('mult_3_rgb', v_r%3=0 AND v_g%3=0 AND v_b%3=0), ('high_contrast', v_range > 200),
        ('low_contrast', v_range < 50), ('mod_contrast', v_range > 50 AND v_range < 150),
        ('pastel_soft', v_max > 200 AND v_min > 100 AND v_range < 80), ('neon_bright', v_max > 200 AND v_min < 50),
        ('web_safe', v_r IN (0,51,102,153,204,255) AND v_g IN (0,51,102,153,204,255) AND v_b IN (0,51,102,153,204,255)),
        ('perfect_triplets', substr(v_hex_no_hash, 1, 2) = substr(v_hex_no_hash, 3, 2) AND substr(v_hex_no_hash, 3, 2) = substr(v_hex_no_hash, 5, 2)),
        ('greyscale', v_r = v_g AND v_g = v_b), ('roll_purple', v_r=145 AND v_g=70 AND v_b=255),
        ('roll_green', v_r=30 AND v_g=215 AND v_b=96), ('roll_red', v_r=244 AND v_g=0 AND v_b=9),
        ('pure_red', v_r=255 AND v_g=0 AND v_b=0), ('pure_green', v_r=0 AND v_g=255 AND v_b=0),
        ('pure_blue', v_r=0 AND v_g=0 AND v_b=255),
        ('hex_letters', v_hex_upper LIKE '%A%' AND v_hex_upper LIKE '%B%' AND v_hex_upper LIKE '%C%' AND v_hex_upper LIKE '%D%' AND v_hex_upper LIKE '%E%' AND v_hex_upper LIKE '%F%');

    FOR v_ach_record IN 
        SELECT a.id, a.name, a.icon, a.ep_reward, a.description 
        FROM achievements a
        JOIN temp_ach_checks t ON a.id = t.id AND t.condition_met = TRUE
        WHERE NOT EXISTS (SELECT 1 FROM user_achievements ua WHERE ua.user_id = v_user_id AND ua.achievement_id = a.id)
    LOOP
        INSERT INTO user_achievements (user_id, achievement_id) VALUES (v_user_id, v_ach_record.id) ON CONFLICT DO NOTHING;
        
        v_achievement_ep := v_achievement_ep + v_ach_record.ep_reward; -- Add to currency pool
        v_new_achievements := v_new_achievements || jsonb_build_object('id', v_ach_record.id, 'name', v_ach_record.name, 'icon', v_ach_record.icon, 'ep_reward', v_ach_record.ep_reward);
        
        v_badges := v_badges || jsonb_build_object(
            'name', 'Achievement: ' || v_ach_record.name, 
            'points', v_ach_record.ep_reward, 
            'symbol', v_ach_record.icon, 
            'desc', v_ach_record.description, 
            'rarity', 'Mythic',
            'is_achievement', true
        );
    END LOOP;

    -- INSERT LEADERBOARD SCORE (v_total_score only)
    BEGIN
        INSERT INTO scores (user_id, hex_code, score, rarity, roll_date, badges)
        VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, CURRENT_DATE, v_badges);
    EXCEPTION WHEN unique_violation THEN
        SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
        RETURN jsonb_build_object('success', true, 'already_rolled', true, 'is_anon', false, 'hex', v_existing_roll.hex_code, 'score', v_existing_roll.score, 'rarity', v_existing_roll.rarity, 'badges', v_existing_roll.badges, 'new_achievements', '[]'::jsonb);
    END;

    -- UPDATE PROFILE: Streaks + Currency (v_achievement_ep)
    UPDATE profiles 
    SET current_streak = v_current_streak, 
        longest_streak = GREATEST(COALESCE(longest_streak, 0), v_current_streak),
        last_roll_date = CURRENT_DATE,
        lifetime_ep = COALESCE(lifetime_ep, 0) + v_achievement_ep -- Add achievement EP to wallet
    WHERE id = v_user_id;

    SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = CURRENT_DATE;
    SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = CURRENT_DATE AND score > v_total_score;
    v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::FLOAT / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;

    RETURN jsonb_build_object(
        'success', true, 'already_rolled', false, 'is_anon', false, 
        'hex', v_hex_upper, 'r', v_r, 'g', v_g, 'b', v_b, 
        'score', v_total_score, 'rarity', v_rarity, 'badges', v_badges, 
        'percentile', v_percentile, 'total_rollers', v_total_count,
        'new_achievements', v_new_achievements
    );
END;
 $$;


ALTER FUNCTION "public"."roll_die"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."roll_die"("p_is_reroll" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ 
DECLARE
    v_r INT; v_g INT; v_b INT; v_hex TEXT; v_hex_upper TEXT; v_hex_no_hash TEXT;
    v_total_score BIGINT := 0; v_badges JSONB := '[]'::jsonb; v_rarity TEXT;
    v_user_id UUID := auth.uid(); v_existing_roll RECORD;
    v_sum INT; v_max INT; v_min INT; v_range INT;
    v_total_count INT; v_higher_count INT; v_percentile NUMERIC;
    v_last_roll DATE; v_current_streak INT := 1; v_streak_bonus BIGINT := 0;
    v_new_achievements JSONB := '[]'::jsonb;
    v_total_rolls INT;
    v_ach_record RECORD;
    v_achievement_ep BIGINT := 0;
    v_owns_freeze BOOLEAN;
    v_shard_count INT;
    v_milestone_granted TEXT := '';
    v_best_roll_score BIGINT;
    
    v_cotw_str TEXT; v_cotw_r INT; v_cotw_g INT; v_cotw_b INT; v_dist FLOAT; v_force_cotw BOOLEAN;
BEGIN
    IF NOT p_is_reroll THEN
        SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
        IF FOUND THEN
            SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = CURRENT_DATE;
            SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = CURRENT_DATE AND score > v_existing_roll.score;
            v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::FLOAT / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;
            RETURN jsonb_build_object('success', true, 'already_rolled', true, 'is_anon', false, 'hex', v_existing_roll.hex_code, 'score', v_existing_roll.score, 'rarity', v_existing_roll.rarity, 'badges', v_existing_roll.badges, 'percentile', v_percentile, 'total_rollers', v_total_count, 'new_achievements', '[]'::jsonb, 'milestone_granted', '');
        END IF;
    END IF;

    IF p_is_reroll THEN
        SELECT reroll_shards INTO v_shard_count FROM profiles WHERE id = v_user_id;
        IF v_shard_count IS NULL OR v_shard_count <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'No reroll shards available.');
        END IF;
        UPDATE profiles SET reroll_shards = reroll_shards - 1 WHERE id = v_user_id;
        SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
    END IF;

    SELECT best_roll_score, force_cotw_next_roll INTO v_best_roll_score, v_force_cotw FROM profiles WHERE id = v_user_id;

    IF COALESCE(v_force_cotw, false) THEN
        SELECT value INTO v_cotw_str FROM meta WHERE key = 'cotw_target';
        IF v_cotw_str IS NOT NULL THEN
            v_r := split_part(v_cotw_str, ',', 1)::int;
            v_g := split_part(v_cotw_str, ',', 2)::int;
            v_b := split_part(v_cotw_str, ',', 3)::int;
            UPDATE profiles SET force_cotw_next_roll = FALSE WHERE id = v_user_id;
        ELSE
            v_r := floor(random() * 256); v_g := floor(random() * 256); v_b := floor(random() * 256);
        END IF;
    ELSE
        v_r := floor(random() * 256); v_g := floor(random() * 256); v_b := floor(random() * 256);
    END IF;

    v_hex := '#' || lpad(to_hex(v_r), 2, '0') || lpad(to_hex(v_g), 2, '0') || lpad(to_hex(v_b), 2, '0');
    v_hex_upper := upper(v_hex); v_hex_no_hash := substr(v_hex_upper, 2);
    v_sum := v_r + v_g + v_b; v_max := greatest(v_r,v_g,v_b); v_min := least(v_r,v_g,v_b); v_range := v_max - v_min;

    -- ==========================================
    -- CONDITION CHECKS (~160 Total)
    -- ==========================================

    -- == BASE ==
    IF true THEN v_total_score := v_total_score + 1337; v_badges := v_badges || to_jsonb('base_spectrum'::text); END IF;

    -- == MATHEMATICAL ==
    IF v_sum % 2 = 0 THEN v_total_score := v_total_score + 2002; v_badges := v_badges || to_jsonb('sum_even'::text); END IF;
    IF v_sum % 2 != 0 THEN v_total_score := v_total_score + 1999; v_badges := v_badges || to_jsonb('sum_odd'::text); END IF;
    IF v_sum % 3 = 0 THEN v_total_score := v_total_score + 15003; v_badges := v_badges || to_jsonb('sum_div3'::text); END IF;
    IF v_sum % 9 = 0 THEN v_total_score := v_total_score + 18009; v_badges := v_badges || to_jsonb('sum_div9'::text); END IF;
    IF v_sum % 10 = 0 THEN v_total_score := v_total_score + 10010; v_badges := v_badges || to_jsonb('sum_div10'::text); END IF;
    IF v_sum = 42 THEN v_total_score := v_total_score + 42069; v_badges := v_badges || to_jsonb('sum_42'::text); END IF;
    IF v_sum = 100 THEN v_total_score := v_total_score + 50011; v_badges := v_badges || to_jsonb('sum_100'::text); END IF;
    IF v_sum = 255 THEN v_total_score := v_total_score + 75031; v_badges := v_badges || to_jsonb('sum_255'::text); END IF;
    IF v_sum = 666 THEN v_total_score := v_total_score + 250001; v_badges := v_badges || to_jsonb('sum_666'::text); END IF;
    IF v_sum = 777 THEN v_total_score := v_total_score + 499999; v_badges := v_badges || to_jsonb('sum_777'::text); END IF;
    IF v_sum IN (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610) THEN v_total_score := v_total_score + 100043; v_badges := v_badges || to_jsonb('sum_fibonacci'::text); END IF;
    IF v_sum IN (0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256, 289, 324, 361, 400, 441, 484, 529, 576, 625, 676, 729) THEN v_total_score := v_total_score + 25047; v_badges := v_badges || to_jsonb('sum_square'::text); END IF;
    IF is_prime(v_sum) THEN v_total_score := v_total_score + 100069; v_badges := v_badges || to_jsonb('sum_prime'::text); END IF;
    IF v_r%2=0 AND v_g%2=0 AND v_b%2=0 THEN v_total_score := v_total_score + 2222; v_badges := v_badges || to_jsonb('all_even'::text); END IF;
    IF v_r%2!=0 AND v_g%2!=0 AND v_b%2!=0 THEN v_total_score := v_total_score + 3333; v_badges := v_badges || to_jsonb('all_odd'::text); END IF;
    IF v_r%3=0 AND v_g%3=0 AND v_b%3=0 THEN v_total_score := v_total_score + 4444; v_badges := v_badges || to_jsonb('mult_3'::text); END IF;
    IF v_r IN (0,51,102,153,204,255) AND v_g IN (0,51,102,153,204,255) AND v_b IN (0,51,102,153,204,255) THEN v_total_score := v_total_score + 15151; v_badges := v_badges || to_jsonb('web_safe'::text); END IF;
    IF v_r % 50 = 0 AND v_g % 50 = 0 AND v_b % 50 = 0 THEN v_total_score := v_total_score + 12500; v_badges := v_badges || to_jsonb('mult_50'::text); END IF;
    IF v_r = 1 OR v_g = 1 OR v_b = 1 THEN v_total_score := v_total_score + 55001; v_badges := v_badges || to_jsonb('one_is_loneliest'::text); END IF;
    IF v_r = v_g OR v_g = v_b OR v_r = v_b THEN v_total_score := v_total_score + 6601; v_badges := v_badges || to_jsonb('twin_channels'::text); END IF;

    -- == COLOR THEORY & BRIGHTNESS ==
    IF v_range > 200 THEN v_total_score := v_total_score + 8080; v_badges := v_badges || to_jsonb('high_contrast'::text); END IF;
    IF v_range < 50 THEN v_total_score := v_total_score + 1111; v_badges := v_badges || to_jsonb('low_contrast'::text); END IF;
    IF v_range > 50 AND v_range < 150 THEN v_total_score := v_total_score + 3300; v_badges := v_badges || to_jsonb('mod_contrast'::text); END IF;
    IF v_max > 200 AND v_min > 100 AND v_range < 80 THEN v_total_score := v_total_score + 250001; v_badges := v_badges || to_jsonb('pastel_soft'::text); END IF;
    IF v_max > 200 AND v_min < 50 THEN v_total_score := v_total_score + 250003; v_badges := v_badges || to_jsonb('neon_bright'::text); END IF;
    IF v_max > 250 AND v_min < 20 THEN v_total_score := v_total_score + 499997; v_badges := v_badges || to_jsonb('neon_glow'::text); END IF;
    IF v_max > 180 AND v_min > 180 THEN v_total_score := v_total_score + 100043; v_badges := v_badges || to_jsonb('pastel_dream'::text); END IF;
    IF v_max < 50 AND v_min < 50 THEN v_total_score := v_total_score + 50021; v_badges := v_badges || to_jsonb('deep_shadow'::text); END IF;
    IF v_max > 200 AND v_min > 200 THEN v_total_score := v_total_score + 250069; v_badges := v_badges || to_jsonb('high_roller'::text); END IF;
    IF v_r > 128 THEN v_total_score := v_total_score + 4400; v_badges := v_badges || to_jsonb('bright_red'::text); END IF;
    IF v_r < 128 THEN v_total_score := v_total_score + 2200; v_badges := v_badges || to_jsonb('dark_red'::text); END IF;
    IF v_g > 128 THEN v_total_score := v_total_score + 4400; v_badges := v_badges || to_jsonb('bright_green'::text); END IF;
    IF v_g < 128 THEN v_total_score := v_total_score + 2200; v_badges := v_badges || to_jsonb('dark_green'::text); END IF;
    IF v_b > 128 THEN v_total_score := v_total_score + 4400; v_badges := v_badges || to_jsonb('bright_blue'::text); END IF;
    IF v_b < 128 THEN v_total_score := v_total_score + 2200; v_badges := v_badges || to_jsonb('dark_blue'::text); END IF;
    IF v_r = v_g AND v_g = v_b THEN v_total_score := v_total_score + 25525; v_badges := v_badges || to_jsonb('greyscale'::text); END IF;
    IF v_max - v_min <= 15 THEN v_total_score := v_total_score + 15001; v_badges := v_badges || to_jsonb('monochromatic'::text); END IF;
    IF v_r > v_g AND v_r > v_b THEN v_total_score := v_total_score + 1100; v_badges := v_badges || to_jsonb('warm_tone'::text); END IF;
    IF v_b > v_r AND v_b > v_g THEN v_total_score := v_total_score + 1100; v_badges := v_badges || to_jsonb('cool_tone'::text); END IF;
    IF v_r < v_g AND v_g < v_b THEN v_total_score := v_total_score + 3301; v_badges := v_badges || to_jsonb('ascending'::text); END IF;
    IF v_r > v_g AND v_g > v_b THEN v_total_score := v_total_score + 3301; v_badges := v_badges || to_jsonb('descending'::text); END IF;
    IF v_r = v_b THEN v_total_score := v_total_score + 7700; v_badges := v_badges || to_jsonb('symmetrical'::text); END IF;

    -- == HEX PATTERNS ==
    IF v_hex_no_hash = reverse(v_hex_no_hash) THEN v_total_score := v_total_score + 50005; v_badges := v_badges || to_jsonb('palindrome'::text); END IF;
    IF substr(v_hex_no_hash, 1, 2) = substr(v_hex_no_hash, 3, 2) AND substr(v_hex_no_hash, 3, 2) = substr(v_hex_no_hash, 5, 2) THEN v_total_score := v_total_score + 150000; v_badges := v_badges || to_jsonb('perfect_triplets'::text); END IF;
    IF v_r=255 AND v_g=255 AND v_b=255 THEN v_total_score := v_total_score + 2500000; v_badges := v_badges || to_jsonb('the_light'::text); END IF;
    IF v_r=0 AND v_g=0 AND v_b=0 THEN v_total_score := v_total_score + 2500000; v_badges := v_badges || to_jsonb('the_void'::text); END IF;
    IF v_hex_upper LIKE '%A%' THEN v_total_score := v_total_score + 4111; v_badges := v_badges || to_jsonb('contains_a'::text); END IF;
    IF v_hex_upper LIKE '%B%' THEN v_total_score := v_total_score + 4222; v_badges := v_badges || to_jsonb('contains_b'::text); END IF;
    IF v_hex_upper LIKE '%C%' THEN v_total_score := v_total_score + 4333; v_badges := v_badges || to_jsonb('contains_c'::text); END IF;
    IF v_hex_upper LIKE '%D%' THEN v_total_score := v_total_score + 4444; v_badges := v_badges || to_jsonb('contains_d'::text); END IF;
    IF v_hex_upper LIKE '%E%' THEN v_total_score := v_total_score + 4555; v_badges := v_badges || to_jsonb('contains_e'::text); END IF;
    IF v_hex_upper LIKE '%F%' THEN v_total_score := v_total_score + 4666; v_badges := v_badges || to_jsonb('contains_f'::text); END IF;
    IF v_hex_upper LIKE '%0%' THEN v_total_score := v_total_score + 4000; v_badges := v_badges || to_jsonb('contains_0'::text); END IF;
    IF v_hex_upper LIKE '%1%' THEN v_total_score := v_total_score + 4111; v_badges := v_badges || to_jsonb('contains_1'::text); END IF;
    IF v_hex_upper LIKE '%2%' THEN v_total_score := v_total_score + 4222; v_badges := v_badges || to_jsonb('contains_2'::text); END IF;
    IF v_hex_upper LIKE '%3%' THEN v_total_score := v_total_score + 4333; v_badges := v_badges || to_jsonb('contains_3'::text); END IF;
    IF v_hex_upper LIKE '%4%' THEN v_total_score := v_total_score + 4444; v_badges := v_badges || to_jsonb('contains_4'::text); END IF;
    IF v_hex_upper LIKE '%5%' THEN v_total_score := v_total_score + 4555; v_badges := v_badges || to_jsonb('contains_5'::text); END IF;
    IF v_hex_upper LIKE '%6%' THEN v_total_score := v_total_score + 4666; v_badges := v_badges || to_jsonb('contains_6'::text); END IF;
    IF v_hex_upper LIKE '%7%' THEN v_total_score := v_total_score + 4777; v_badges := v_badges || to_jsonb('contains_7'::text); END IF;
    IF v_hex_upper LIKE '%8%' THEN v_total_score := v_total_score + 4888; v_badges := v_badges || to_jsonb('contains_8'::text); END IF;
    IF v_hex_upper LIKE '%9%' THEN v_total_score := v_total_score + 4999; v_badges := v_badges || to_jsonb('contains_9'::text); END IF;
    IF v_hex_no_hash LIKE '%00%' THEN v_total_score := v_total_score + 8008; v_badges := v_badges || to_jsonb('contains_00'::text); END IF;
    IF v_hex_no_hash LIKE '%11%' THEN v_total_score := v_total_score + 1111; v_badges := v_badges || to_jsonb('contains_11'::text); END IF;
    IF v_hex_no_hash LIKE '%22%' THEN v_total_score := v_total_score + 2222; v_badges := v_badges || to_jsonb('contains_22'::text); END IF;
    IF v_hex_no_hash LIKE '%33%' THEN v_total_score := v_total_score + 3333; v_badges := v_badges || to_jsonb('contains_33'::text); END IF;
    IF v_hex_no_hash LIKE '%44%' THEN v_total_score := v_total_score + 4444; v_badges := v_badges || to_jsonb('contains_44'::text); END IF;
    IF v_hex_no_hash LIKE '%55%' THEN v_total_score := v_total_score + 5555; v_badges := v_badges || to_jsonb('contains_55'::text); END IF;
    IF v_hex_no_hash LIKE '%66%' THEN v_total_score := v_total_score + 6666; v_badges := v_badges || to_jsonb('contains_66'::text); END IF;
    IF v_hex_no_hash LIKE '%77%' THEN v_total_score := v_total_score + 7777; v_badges := v_badges || to_jsonb('contains_77'::text); END IF;
    IF v_hex_no_hash LIKE '%88%' THEN v_total_score := v_total_score + 8888; v_badges := v_badges || to_jsonb('contains_88'::text); END IF;
    IF v_hex_no_hash LIKE '%99%' THEN v_total_score := v_total_score + 9999; v_badges := v_badges || to_jsonb('contains_99'::text); END IF;
    IF v_hex_no_hash LIKE '%AA%' THEN v_total_score := v_total_score + 10001; v_badges := v_badges || to_jsonb('contains_aa'::text); END IF;
    IF v_hex_no_hash LIKE '%BB%' THEN v_total_score := v_total_score + 11011; v_badges := v_badges || to_jsonb('contains_bb'::text); END IF;
    IF v_hex_no_hash LIKE '%CC%' THEN v_total_score := v_total_score + 12021; v_badges := v_badges || to_jsonb('contains_cc'::text); END IF;
    IF v_hex_no_hash LIKE '%DD%' THEN v_total_score := v_total_score + 13031; v_badges := v_badges || to_jsonb('contains_dd'::text); END IF;
    IF v_hex_no_hash LIKE '%EE%' THEN v_total_score := v_total_score + 14041; v_badges := v_badges || to_jsonb('contains_ee'::text); END IF;
    IF v_hex_no_hash LIKE '%FF%' THEN v_total_score := v_total_score + 15051; v_badges := v_badges || to_jsonb('contains_ff'::text); END IF;
    IF v_hex_no_hash LIKE '%000%' THEN v_total_score := v_total_score + 50000; v_badges := v_badges || to_jsonb('contains_000'::text); END IF;
    IF v_hex_no_hash LIKE '%111%' THEN v_total_score := v_total_score + 11111; v_badges := v_badges || to_jsonb('contains_111'::text); END IF;
    IF v_hex_no_hash LIKE '%222%' THEN v_total_score := v_total_score + 22222; v_badges := v_badges || to_jsonb('contains_222'::text); END IF;
    IF v_hex_no_hash LIKE '%333%' THEN v_total_score := v_total_score + 33333; v_badges := v_badges || to_jsonb('contains_333'::text); END IF;
    IF v_hex_no_hash LIKE '%444%' THEN v_total_score := v_total_score + 44444; v_badges := v_badges || to_jsonb('contains_444'::text); END IF;
    IF v_hex_no_hash LIKE '%555%' THEN v_total_score := v_total_score + 55555; v_badges := v_badges || to_jsonb('contains_555'::text); END IF;
    IF v_hex_no_hash LIKE '%666%' THEN v_total_score := v_total_score + 66666; v_badges := v_badges || to_jsonb('contains_666'::text); END IF;
    IF v_hex_no_hash LIKE '%777%' THEN v_total_score := v_total_score + 77777; v_badges := v_badges || to_jsonb('contains_777'::text); END IF;
    IF v_hex_no_hash LIKE '%888%' THEN v_total_score := v_total_score + 88888; v_badges := v_badges || to_jsonb('contains_888'::text); END IF;
    IF v_hex_no_hash LIKE '%999%' THEN v_total_score := v_total_score + 99999; v_badges := v_badges || to_jsonb('contains_999'::text); END IF;
    IF v_hex_no_hash LIKE '%AAA%' THEN v_total_score := v_total_score + 100001; v_badges := v_badges || to_jsonb('contains_aaa'::text); END IF;
    IF v_hex_no_hash LIKE '%BBB%' THEN v_total_score := v_total_score + 110011; v_badges := v_badges || to_jsonb('contains_bbb'::text); END IF;
    IF v_hex_no_hash LIKE '%CCC%' THEN v_total_score := v_total_score + 120021; v_badges := v_badges || to_jsonb('contains_ccc'::text); END IF;
    IF v_hex_no_hash LIKE '%DDD%' THEN v_total_score := v_total_score + 130031; v_badges := v_badges || to_jsonb('contains_ddd'::text); END IF;
    IF v_hex_no_hash LIKE '%EEE%' THEN v_total_score := v_total_score + 140041; v_badges := v_badges || to_jsonb('contains_eee'::text); END IF;
    IF v_hex_no_hash LIKE '%FFF%' THEN v_total_score := v_total_score + 150051; v_badges := v_badges || to_jsonb('contains_fff'::text); END IF;

    -- == MEME & POP CULTURE ==
    IF v_hex_upper LIKE '%DEAD%' THEN v_total_score := v_total_score + 73217; v_badges := v_badges || to_jsonb('dead'::text); END IF;
    IF v_hex_upper LIKE '%BEEF%' THEN v_total_score := v_total_score + 83388; v_badges := v_badges || to_jsonb('beef'::text); END IF;
    IF v_hex_upper LIKE '%CAFE%' THEN v_total_score := v_total_score + 74237; v_badges := v_badges || to_jsonb('cafe'::text); END IF;
    IF v_hex_upper LIKE '%FACE%' THEN v_total_score := v_total_score + 42069; v_badges := v_badges || to_jsonb('face'::text); END IF;
    IF v_hex_upper LIKE '%BABE%' THEN v_total_score := v_total_score + 80085; v_badges := v_badges || to_jsonb('babe'::text); END IF;
    IF v_hex_upper LIKE '%FADE%' THEN v_total_score := v_total_score + 69696; v_badges := v_badges || to_jsonb('fade'::text); END IF;
    IF v_hex_upper LIKE '%FEED%' THEN v_total_score := v_total_score + 133735; v_badges := v_badges || to_jsonb('feed'::text); END IF;
    IF v_hex_upper LIKE '%B00B%' THEN v_total_score := v_total_score + 80085; v_badges := v_badges || to_jsonb('boob'::text); END IF;
    IF v_hex_upper LIKE '%D00D%' THEN v_total_score := v_total_score + 42042; v_badges := v_badges || to_jsonb('dood'::text); END IF;
    IF v_hex_upper LIKE '%F00D%' THEN v_total_score := v_total_score + 42042; v_badges := v_badges || to_jsonb('food'::text); END IF;
    IF v_hex_upper LIKE '%1337%' THEN v_total_score := v_total_score + 133713; v_badges := v_badges || to_jsonb('leet'::text); END IF;
    IF v_hex_upper LIKE '%8008%' THEN v_total_score := v_total_score + 80085; v_badges := v_badges || to_jsonb('boob_2'::text); END IF;
    IF v_hex_upper LIKE '%ABCD%' THEN v_total_score := v_total_score + 12345; v_badges := v_badges || to_jsonb('abcd'::text); END IF;
    IF v_hex_upper LIKE '%007%' THEN v_total_score := v_total_score + 70007; v_badges := v_badges || to_jsonb('james_bond'::text); END IF;
    IF v_hex_upper LIKE '%420%' THEN v_total_score := v_total_score + 42069; v_badges := v_badges || to_jsonb('blaze_it'::text); END IF;
    IF v_hex_upper LIKE '%69%' THEN v_total_score := v_total_score + 6969; v_badges := v_badges || to_jsonb('nice'::text); END IF;
    IF v_hex_upper LIKE '%666%' THEN v_total_score := v_total_score + 66666; v_badges := v_badges || to_jsonb('demon'::text); END IF;
    IF v_hex_upper LIKE '%777%' THEN v_total_score := v_total_score + 77777; v_badges := v_badges || to_jsonb('jackpot'::text); END IF;
    IF v_hex_upper LIKE '%911%' THEN v_total_score := v_total_score + 91101; v_badges := v_badges || to_jsonb('emergency'::text); END IF;
    IF v_hex_upper LIKE '%404%' THEN v_total_score := v_total_score + 40404; v_badges := v_badges || to_jsonb('not_found'::text); END IF;
    IF v_hex_upper LIKE '%500%' THEN v_total_score := v_total_score + 50000; v_badges := v_badges || to_jsonb('server_error'::text); END IF;
    IF v_hex_upper LIKE '%100%' THEN v_total_score := v_total_score + 100000; v_badges := v_badges || to_jsonb('perfect_score'::text); END IF;
    IF v_hex_upper LIKE '%F1%' THEN v_total_score := v_total_score + 1000001; v_badges := v_badges || to_jsonb('f1'::text); END IF;

    -- == PURE COLORS & BRANDS ==
    IF v_r=255 AND v_g=0 AND v_b=0 THEN v_total_score := v_total_score + 666666; v_badges := v_badges || to_jsonb('pure_red'::text); END IF;
    IF v_r=0 AND v_g=255 AND v_b=0 THEN v_total_score := v_total_score + 999999; v_badges := v_badges || to_jsonb('pure_green'::text); END IF;
    IF v_r=0 AND v_g=0 AND v_b=255 THEN v_total_score := v_total_score + 420420; v_badges := v_badges || to_jsonb('pure_blue'::text); END IF;
    IF v_r=255 AND v_g=215 AND v_b=0 THEN v_total_score := v_total_score + 1500000; v_badges := v_badges || to_jsonb('gold'::text); END IF;
    IF v_r=145 AND v_g=70 AND v_b=255 THEN v_total_score := v_total_score + 1000000; v_badges := v_badges || to_jsonb('streamer_purple'::text); END IF;
    IF v_r=30 AND v_g=215 AND v_b=96 THEN v_total_score := v_total_score + 1000000; v_badges := v_badges || to_jsonb('audio_stream_green'::text); END IF;
    IF v_r=244 AND v_g=0 AND v_b=9 THEN v_total_score := v_total_score + 1000000; v_badges := v_badges || to_jsonb('classic_cola_red'::text); END IF;

    -- == SPECIAL EDGE CASES ==
    IF v_r = 0 AND v_g = 0 AND v_b = 1 THEN v_total_score := v_total_score + 1000000; v_badges := v_badges || to_jsonb('almost_black'::text); END IF;
    IF v_r = 255 AND v_g = 255 AND v_b = 254 THEN v_total_score := v_total_score + 1000000; v_badges := v_badges || to_jsonb('almost_white'::text); END IF;
    IF v_r = 127 AND v_g = 127 AND v_b = 127 THEN v_total_score := v_total_score + 127000; v_badges := v_badges || to_jsonb('perfect_grey'::text); END IF;

    -- Calculate Rarity
    IF v_total_score >= 5000000 THEN v_rarity := 'Mythic';
    ELSIF v_total_score >= 1000000 THEN v_rarity := 'Anomaly';
    ELSIF v_total_score >= 250000 THEN v_rarity := 'Epic';
    ELSIF v_total_score >= 50000 THEN v_rarity := 'Rare';
    ELSIF v_total_score >= 10000 THEN v_rarity := 'Uncommon';
    ELSIF v_total_score >= 1500 THEN v_rarity := 'Common';
    ELSE v_rarity := 'Trash';
    END IF;

    -- Beat Your Best Challenge
    IF v_user_id IS NOT NULL AND v_total_score > COALESCE(v_best_roll_score, 0) THEN
        v_achievement_ep := v_achievement_ep + 50000;
        v_badges := v_badges || to_jsonb('beat_your_best'::text);
    END IF;

    -- Color of the Week Challenge
    IF v_user_id IS NOT NULL AND NOT COALESCE(v_force_cotw, false) THEN
        SELECT value INTO v_cotw_str FROM meta WHERE key = 'cotw_target';
        IF v_cotw_str IS NOT NULL THEN
            v_cotw_r := split_part(v_cotw_str, ',', 1)::int;
            v_cotw_g := split_part(v_cotw_str, ',', 2)::int;
            v_cotw_b := split_part(v_cotw_str, ',', 3)::int;
            v_dist := sqrt(power(v_r - v_cotw_r, 2) + power(v_g - v_cotw_g, 2) + power(v_b - v_cotw_b, 2));
            IF v_dist <= 50 THEN
                v_achievement_ep := v_achievement_ep + 50000;
                v_badges := v_badges || to_jsonb('cotw_hit'::text);
            END IF;
        END IF;
    ELSIF v_user_id IS NOT NULL AND COALESCE(v_force_cotw, false) THEN
        v_achievement_ep := v_achievement_ep + 50000;
        v_badges := v_badges || to_jsonb('cotw_hit'::text);
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'already_rolled', false, 'is_anon', true, 'hex', v_hex_upper, 'r', v_r, 'g', v_g, 'b', v_b, 'score', v_total_score, 'rarity', v_rarity, 'badges', v_badges);
    END IF;

    SELECT last_roll_date, current_streak INTO v_last_roll, v_current_streak FROM profiles WHERE id = v_user_id;
    IF p_is_reroll THEN
        v_current_streak := COALESCE(v_current_streak, 1);
    ELSIF v_last_roll = CURRENT_DATE THEN
        v_current_streak := COALESCE(v_current_streak, 1);
    ELSIF v_last_roll = CURRENT_DATE - 1 THEN
        v_current_streak := COALESCE(v_current_streak, 0) + 1;
    ELSIF v_last_roll = CURRENT_DATE - 2 THEN
        SELECT EXISTS(SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'streak_freeze' LIMIT 1) INTO v_owns_freeze;
        IF v_owns_freeze THEN
            DELETE FROM inventory WHERE id IN (SELECT id FROM inventory WHERE user_id = v_user_id AND item_key = 'streak_freeze' LIMIT 1);
            v_current_streak := COALESCE(v_current_streak, 0) + 1;
        ELSE
            v_current_streak := 1;
        END IF;
    ELSE
        v_current_streak := 1;
    END IF;

    IF v_current_streak % 7 = 0 AND NOT p_is_reroll AND v_last_roll != CURRENT_DATE THEN
        v_streak_bonus := 50000;
        v_total_score := v_total_score + v_streak_bonus;
        v_badges := v_badges || to_jsonb('streak_bonus_7'::text);
        UPDATE profiles SET reroll_shards = COALESCE(reroll_shards, 0) + 1 WHERE id = v_user_id;
        v_badges := v_badges || to_jsonb('reroll_shard_earned'::text);
    END IF;

    IF v_current_streak = 30 AND NOT EXISTS (SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'frame_30_day') THEN
        INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, 'frame_30_day');
        v_milestone_granted := 'Monthly Grinder Frame';
        v_badges := v_badges || to_jsonb('milestone_30'::text);
    ELSIF v_current_streak = 100 AND NOT EXISTS (SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'frame_100_day') THEN
        INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, 'frame_100_day');
        v_milestone_granted := 'Iron Will Frame';
        v_badges := v_badges || to_jsonb('milestone_100'::text);
    ELSIF v_current_streak = 365 AND NOT EXISTS (SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'frame_365_day') THEN
        INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, 'frame_365_day');
        v_milestone_granted := 'Annual Frame';
        v_badges := v_badges || to_jsonb('milestone_365'::text);
    END IF;

    SELECT count(*) + 1 INTO v_total_rolls FROM scores WHERE user_id = v_user_id;
    CREATE TEMP TABLE IF NOT EXISTS temp_ach_checks (id TEXT, condition_met BOOLEAN) ON COMMIT DROP;
    TRUNCATE temp_ach_checks;
    INSERT INTO temp_ach_checks VALUES 
        ('first_roll', TRUE), ('streak_7', v_current_streak >= 7), ('streak_14', v_current_streak >= 14),
        ('streak_30', v_current_streak >= 30), ('streak_100', v_current_streak >= 100),
        ('roll_10', v_total_rolls >= 10), ('roll_50', v_total_rolls >= 50), ('roll_100', v_total_rolls >= 100),
        ('roll_365', v_total_rolls >= 365), ('mythic_roll', v_rarity = 'Mythic'),
        ('rarity_anomaly', v_rarity = 'Anomaly'), ('rarity_epic', v_rarity = 'Epic'),
        ('rarity_rare', v_rarity = 'Rare'), ('score_10k', v_total_score >= 10000),
        ('score_50k', v_total_score >= 50000), ('score_100k', v_total_score >= 100000),
        ('score_1m', v_total_score >= 1000000), ('score_5m', v_total_score >= 5000000),
        ('roll_black', v_hex_upper = '#000000'), ('roll_white', v_hex_upper = '#FFFFFF'),
        ('roll_gold', v_r=255 AND v_g=215 AND v_b=0), ('roll_palindrome', v_hex_no_hash = reverse(v_hex_no_hash)),
        ('roll_prime', is_prime(v_sum)), ('roll_beef', v_hex_upper LIKE '%BEEF%'),
        ('roll_cafe', v_hex_upper LIKE '%CAFE%'), ('roll_dead', v_hex_upper LIKE '%DEAD%'),
        ('roll_face', v_hex_upper LIKE '%FACE%'), ('roll_even_sum', v_sum % 2 = 0),
        ('roll_odd_sum', v_sum % 2 != 0), ('roll_div3_sum', v_sum % 3 = 0),
        ('roll_42_sum', v_sum = 42), ('roll_balanced_sum', v_sum > 300 AND v_sum < 500),
        ('all_even_rgb', v_r%2=0 AND v_g%2=0 AND v_b%2=0), ('all_odd_rgb', v_r%2!=0 AND v_g%2!=0 AND v_b%2!=0),
        ('mult_3_rgb', v_r%3=0 AND v_g%3=0 AND v_b%3=0), ('high_contrast', v_range > 200),
        ('low_contrast', v_range < 50), ('mod_contrast', v_range > 50 AND v_range < 150),
        ('pastel_soft', v_max > 200 AND v_min > 100 AND v_range < 80), ('neon_bright', v_max > 200 AND v_min < 50),
        ('web_safe', v_r IN (0,51,102,153,204,255) AND v_g IN (0,51,102,153,204,255) AND v_b IN (0,51,102,153,204,255)),
        ('perfect_triplets', substr(v_hex_no_hash, 1, 2) = substr(v_hex_no_hash, 3, 2) AND substr(v_hex_no_hash, 3, 2) = substr(v_hex_no_hash, 5, 2)),
        ('greyscale', v_r = v_g AND v_g = v_b), ('streamer_purple', v_r=145 AND v_g=70 AND v_b=255),
        ('audio_stream_green', v_r=30 AND v_g=215 AND v_b=96), ('classic_cola_red', v_r=244 AND v_g=0 AND v_b=9),
        ('pure_red', v_r=255 AND v_g=0 AND v_b=0), ('pure_green', v_r=0 AND v_g=255 AND v_b=0), 
        ('pure_blue', v_r=0 AND v_g=0 AND v_b=255),
        ('hex_letters', v_hex_upper LIKE '%A%' AND v_hex_upper LIKE '%B%' AND v_hex_upper LIKE '%C%' AND v_hex_upper LIKE '%D%' AND v_hex_upper LIKE '%E%' AND v_hex_upper LIKE '%F%');

    FOR v_ach_record IN 
        SELECT a.id, a.name, a.icon, a.ep_reward, a.description 
        FROM achievements a
        JOIN temp_ach_checks t ON a.id = t.id AND t.condition_met = TRUE
        WHERE a.season_id IS NULL AND NOT EXISTS (SELECT 1 FROM user_achievements ua WHERE ua.user_id = v_user_id AND ua.achievement_id = a.id)
    LOOP
        INSERT INTO user_achievements (user_id, achievement_id, count) VALUES (v_user_id, v_ach_record.id, 1) ON CONFLICT DO NOTHING;
        v_achievement_ep := v_achievement_ep + v_ach_record.ep_reward;
        v_new_achievements := v_new_achievements || jsonb_build_object('id', v_ach_record.id, 'name', v_ach_record.name, 'icon', v_ach_record.icon, 'ep_reward', v_ach_record.ep_reward);
        v_badges := v_badges || to_jsonb('ach_' || v_ach_record.id);
    END LOOP;

    FOR v_ach_record IN 
        SELECT a.id, a.name, a.icon, a.ep_reward, a.description 
        FROM active_seasonal_achievements a
        JOIN temp_ach_checks t ON a.id = t.id AND t.condition_met = TRUE
        WHERE NOT EXISTS (SELECT 1 FROM user_achievements ua WHERE ua.user_id = v_user_id AND ua.achievement_id = a.id)
    LOOP
        INSERT INTO user_achievements (user_id, achievement_id, count) VALUES (v_user_id, v_ach_record.id, 1) ON CONFLICT DO NOTHING;
        v_achievement_ep := v_achievement_ep + v_ach_record.ep_reward;
        v_new_achievements := v_new_achievements || jsonb_build_object('id', v_ach_record.id, 'name', v_ach_record.name, 'icon', v_ach_record.icon, 'ep_reward', v_ach_record.ep_reward);
        v_badges := v_badges || to_jsonb('ach_' || v_ach_record.id);
    END LOOP;

    FOR v_ach_record IN 
        SELECT a.id FROM achievements a
        JOIN temp_ach_checks t ON a.id = t.id AND t.condition_met = TRUE
        WHERE EXISTS (SELECT 1 FROM user_achievements ua WHERE ua.user_id = v_user_id AND ua.achievement_id = a.id)
    LOOP
        UPDATE user_achievements SET count = count + 1 WHERE user_id = v_user_id AND achievement_id = v_ach_record.id;
    END LOOP;

    IF p_is_reroll THEN
        UPDATE profiles 
        SET lifetime_ep = COALESCE(lifetime_ep, 0) - COALESCE(v_existing_roll.score, 0) + v_total_score + v_achievement_ep
        WHERE id = v_user_id;
        
        UPDATE scores SET hex_code = v_hex_upper, score = v_total_score, rarity = v_rarity, badges = v_badges WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
    ELSE
        BEGIN
            INSERT INTO scores (user_id, hex_code, score, rarity, roll_date, badges)
            VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, CURRENT_DATE, v_badges);
        EXCEPTION WHEN unique_violation THEN
            SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
            RETURN jsonb_build_object('success', true, 'already_rolled', true, 'is_anon', false, 'hex', v_existing_roll.hex_code, 'score', v_existing_roll.score, 'rarity', v_existing_roll.rarity, 'badges', v_existing_roll.badges, 'new_achievements', '[]'::jsonb, 'milestone_granted', '');
        END;
        
        UPDATE profiles 
        SET lifetime_ep = COALESCE(lifetime_ep, 0) + v_total_score + v_achievement_ep
        WHERE id = v_user_id;
    END IF;

    UPDATE profiles 
    SET current_streak = v_current_streak, longest_streak = GREATEST(COALESCE(longest_streak, 0), v_current_streak), last_roll_date = CURRENT_DATE
    WHERE id = v_user_id;

    IF v_total_score > COALESCE(v_best_roll_score, 0) THEN
        UPDATE profiles SET best_roll_score = v_total_score, best_roll_hex = v_hex_upper, best_roll_rarity = v_rarity WHERE id = v_user_id;
    END IF;

    SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = CURRENT_DATE;
    SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = CURRENT_DATE AND score > v_total_score;
    v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::FLOAT / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;

    RETURN jsonb_build_object('success', true, 'already_rolled', false, 'is_anon', false, 'hex', v_hex_upper, 'r', v_r, 'g', v_g, 'b', v_b, 'score', v_total_score, 'rarity', v_rarity, 'badges', v_badges, 'percentile', v_percentile, 'total_rollers', v_total_count, 'new_achievements', v_new_achievements, 'milestone_granted', v_milestone_granted);
END;
 $$;


ALTER FUNCTION "public"."roll_die"("p_is_reroll" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_follow"("p_target_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
    v_user_id UUID := auth.uid();
    v_is_following BOOLEAN;
    v_follow_count INT;
BEGIN
    IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
    IF v_user_id = p_target_id THEN RETURN json_build_object('success', false, 'error', 'Cannot follow yourself'); END IF;
    
    SELECT EXISTS(SELECT 1 FROM user_follows WHERE follower_id = v_user_id AND followee_id = p_target_id) INTO v_is_following;
    
    IF v_is_following THEN
        DELETE FROM user_follows WHERE follower_id = v_user_id AND followee_id = p_target_id;
        RETURN json_build_object('success', true, 'action', 'unfollowed');
    ELSE
        SELECT count(*) INTO v_follow_count FROM user_follows WHERE follower_id = v_user_id;
        IF v_follow_count >= 5 THEN
            RETURN json_build_object('success', false, 'error', 'Maximum of 5 rivals reached.');
        END IF;
        INSERT INTO user_follows (follower_id, followee_id) VALUES (v_user_id, p_target_id);
        RETURN json_build_object('success', true, 'action', 'followed');
    END IF;
END;
 $$;


ALTER FUNCTION "public"."toggle_follow"("p_target_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unequip_item"("p_slot" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
    v_user_id uuid := auth.uid();
    v_current_cosmetics jsonb;
BEGIN
    if v_user_id is null then return json_build_object('success', false, 'error', 'Not authenticated'); end if;
    if p_slot not in ('name_effect', 'frame', 'profile_bg', 'roll_effect', 'lb_theme', 'title', 'orb_shape', 'profile_border') then return json_build_object('success', false, 'error', 'Invalid slot'); end if;
    select equipped_cosmetics into v_current_cosmetics from profiles where id = v_user_id;
    if v_current_cosmetics is null then v_current_cosmetics := '{}'::jsonb; end if;
    v_current_cosmetics := v_current_cosmetics - p_slot;
    update profiles set equipped_cosmetics = v_current_cosmetics where id = v_user_id;
    return json_build_object('success', true, 'cosmetics', v_current_cosmetics);
END;
 $$;


ALTER FUNCTION "public"."unequip_item"("p_slot" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cotw"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$ DECLARE
    v_r INT; v_g INT; v_b INT; v_cotw_str TEXT;
BEGIN
    v_r := floor(random() * 256);
    v_g := floor(random() * 256);
    v_b := floor(random() * 256);
    
    -- Store as "R,G,B" string for easy parsing in roll_die
    v_cotw_str := v_r || ',' || v_g || ',' || v_b;
    
    INSERT INTO meta (key, value) VALUES ('cotw_target', v_cotw_str)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END;
 $$;


ALTER FUNCTION "public"."update_cotw"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lifetime_ep"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN
    -- Update lifetime EP
    UPDATE profiles
    SET lifetime_ep = COALESCE(lifetime_ep, 0) + NEW.score
    WHERE id = NEW.user_id;

    -- Update Best Roll if the new score is higher
    UPDATE profiles
    SET best_roll_score = NEW.score,
        best_roll_hex = NEW.hex_code,
        best_roll_rarity = NEW.rarity
    WHERE id = NEW.user_id AND (best_roll_score IS NULL OR NEW.score > best_roll_score);

    RETURN NEW;
END;
 $$;


ALTER FUNCTION "public"."update_lifetime_ep"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profile_meta"("p_bio" "text", "p_mood_color" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$ DECLARE
    v_user_id UUID := auth.uid();
    v_final_bio TEXT := NULL;
    v_final_color TEXT := NULL;
BEGIN
    IF v_user_id IS NULL THEN 
        RETURN json_build_object('success', false, 'error', 'Not authenticated'); 
    END IF;

    -- Handle Bio: Null or empty string clears it
    IF p_bio IS NOT NULL AND length(p_bio) > 0 THEN
        IF length(p_bio) > 140 THEN
            RETURN json_build_object('success', false, 'error', 'Bio must be 140 characters or less.');
        END IF;
        v_final_bio := p_bio;
    END IF;

    -- Handle Mood Color: Null or empty string clears it
    IF p_mood_color IS NOT NULL AND p_mood_color != '' THEN
        IF p_mood_color !~* '^#[0-9A-F]{6}$' THEN
            RETURN json_build_object('success', false, 'error', 'Invalid color format.');
        END IF;
        v_final_color := p_mood_color;
    END IF;

    UPDATE profiles 
    SET bio = v_final_bio, 
        mood_color = v_final_color
    WHERE id = v_user_id;

    RETURN json_build_object('success', true, 'bio', v_final_bio, 'mood_color', v_final_color);
END;
 $_$;


ALTER FUNCTION "public"."update_profile_meta"("p_bio" "text", "p_mood_color" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_streak"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE
    prev_roll_date DATE;
    user_current_streak INT;
    user_longest_streak INT;
BEGIN
    -- Get the user's current stats
    SELECT current_streak, longest_streak INTO user_current_streak, user_longest_streak
    FROM profiles WHERE id = NEW.user_id;
    
    -- Find the user's previous latest roll date (before today)
    SELECT MAX(roll_date) INTO prev_roll_date
    FROM scores WHERE user_id = NEW.user_id AND roll_date < NEW.roll_date;

    IF prev_roll_date IS NULL THEN
        -- First ever roll
        user_current_streak := 1;
    ELSIF prev_roll_date = (NEW.roll_date - INTERVAL '1 day')::DATE THEN
        -- Rolled yesterday, streak continues!
        user_current_streak := user_current_streak + 1;
    ELSE
        -- Missed a day (or more), streak resets
        user_current_streak := 1;
    END IF;

    -- Update longest streak if current beats it
    IF user_current_streak > user_longest_streak THEN
        user_longest_streak := user_current_streak;
    END IF;

    -- Save the new streak values back to the profile
    UPDATE profiles 
    SET current_streak = user_current_streak, longest_streak = user_longest_streak 
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
 $$;


ALTER FUNCTION "public"."update_streak"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "text" NOT NULL,
    "name" "text",
    "description" "text",
    "icon" "text",
    "ep_reward" bigint,
    "rarity" "text",
    "season_id" "text",
    "season_start" "date",
    "season_end" "date"
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_seasonal_achievements" WITH ("security_invoker"='true') AS
 SELECT "id",
    "name",
    "description",
    "icon",
    "ep_reward",
    "rarity",
    "season_id"
   FROM "public"."achievements"
  WHERE (("season_id" IS NOT NULL) AND ("season_start" <= CURRENT_DATE) AND ("season_end" >= CURRENT_DATE));


ALTER VIEW "public"."active_seasonal_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "ep_spent" bigint DEFAULT 0,
    "equipped_cosmetics" "jsonb" DEFAULT '{}'::"jsonb",
    "lifetime_ep" bigint DEFAULT 0,
    "last_roll_date" "date",
    "best_roll_score" bigint,
    "best_roll_hex" "text",
    "best_roll_rarity" "text",
    "reroll_shards" integer DEFAULT 0,
    "equipped_badges" "jsonb" DEFAULT '[]'::"jsonb",
    "bio" "text",
    "mood_color" "text",
    "is_admin" boolean DEFAULT false,
    "force_cotw_next_roll" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."all_time_leaderboard_view" WITH ("security_invoker"='true') AS
 SELECT "id" AS "user_id",
    "username",
    "current_streak",
    "equipped_cosmetics",
    "equipped_badges",
    "best_roll_score" AS "score",
    "best_roll_hex" AS "hex_code",
    "best_roll_rarity" AS "rarity",
    "lifetime_ep"
   FROM "public"."profiles" "p"
  WHERE ("best_roll_score" IS NOT NULL);


ALTER VIEW "public"."all_time_leaderboard_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_key" "text" NOT NULL,
    "purchased_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scores" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "hex_code" "text" NOT NULL,
    "score" bigint NOT NULL,
    "rarity" "text" NOT NULL,
    "roll_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "badges" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."scores" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."leaderboard_view" WITH ("security_invoker"='true') AS
 SELECT "s"."user_id",
    "s"."hex_code",
    "s"."score",
    "s"."rarity",
    "s"."roll_date",
    "p"."username",
    "p"."current_streak",
    "p"."equipped_cosmetics",
    "p"."equipped_badges"
   FROM ("public"."scores" "s"
     JOIN "public"."profiles" "p" ON (("s"."user_id" = "p"."id")));


ALTER VIEW "public"."leaderboard_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meta" (
    "key" "text" NOT NULL,
    "value" "text"
);


ALTER TABLE "public"."meta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_items" (
    "item_key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slot" "text" NOT NULL,
    "cost" bigint NOT NULL,
    "css_type" "text" NOT NULL,
    "css_value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "available_from" "date",
    "available_until" "date",
    "rarity" "text" DEFAULT 'Common'::"text",
    "description" "text",
    "collection" "text",
    CONSTRAINT "shop_items_cost_check" CHECK (("cost" >= 0)),
    CONSTRAINT "shop_items_css_type_check" CHECK (("css_type" = ANY (ARRAY['style'::"text", 'class'::"text", 'text'::"text"])))
);


ALTER TABLE "public"."shop_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "user_id" "uuid" NOT NULL,
    "achievement_id" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"(),
    "count" integer DEFAULT 1
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_follows" (
    "follower_id" "uuid" NOT NULL,
    "followee_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_follows" OWNER TO "postgres";


ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_user_id_item_key_key" UNIQUE ("user_id", "item_key");



ALTER TABLE ONLY "public"."meta"
    ADD CONSTRAINT "meta_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."scores"
    ADD CONSTRAINT "scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_items"
    ADD CONSTRAINT "shop_items_pkey" PRIMARY KEY ("item_key");



ALTER TABLE ONLY "public"."scores"
    ADD CONSTRAINT "unique_daily_roll" UNIQUE ("user_id", "roll_date");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id", "achievement_id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_pkey" PRIMARY KEY ("follower_id", "followee_id");



CREATE INDEX "idx_scores_roll_date_score" ON "public"."scores" USING "btree" ("roll_date", "score" DESC);



CREATE INDEX "scores_roll_date_score_idx" ON "public"."scores" USING "btree" ("roll_date", "score" DESC);



CREATE UNIQUE INDEX "scores_user_date_idx" ON "public"."scores" USING "btree" ("user_id", "roll_date");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."scores"
    ADD CONSTRAINT "scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Achievements are viewable by everyone." ON "public"."achievements" FOR SELECT USING (true);



CREATE POLICY "Meta is viewable by everyone." ON "public"."meta" FOR SELECT USING (true);



CREATE POLICY "Public can read scores" ON "public"."scores" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Scores are viewable by everyone." ON "public"."scores" FOR SELECT USING (true);



CREATE POLICY "Shop items are viewable by everyone." ON "public"."shop_items" FOR SELECT USING (true);



CREATE POLICY "Users can delete follows" ON "public"."user_follows" FOR DELETE USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can insert follows" ON "public"."user_follows" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can insert own inventory" ON "public"."inventory" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own scores" ON "public"."scores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view follows" ON "public"."user_follows" FOR SELECT USING ((("auth"."uid"() = "follower_id") OR ("auth"."uid"() = "followee_id")));



CREATE POLICY "Users can view own inventory" ON "public"."inventory" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own inventory." ON "public"."inventory" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own unlocked achievements." ON "public"."user_achievements" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meta" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shop_items are publicly readable" ON "public"."shop_items" FOR SELECT USING (true);



ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_follows" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_bump_shop_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_bump_shop_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_bump_shop_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_randomize_cotw"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_randomize_cotw"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_randomize_cotw"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_trigger_cotw_test"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_trigger_cotw_test"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_trigger_cotw_test"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_scores"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_scores"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_scores"() TO "service_role";



GRANT ALL ON FUNCTION "public"."equip_badges"("p_badge_ids" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."equip_badges"("p_badge_ids" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."equip_badges"("p_badge_ids" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."equip_item"("p_item_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."equip_item"("p_item_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."equip_item"("p_item_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_percentile"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_percentile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_percentile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_rivals_scores"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_rivals_scores"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rivals_scores"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_score_percentile"("p_score" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_score_percentile"("p_score" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_score_percentile"("p_score" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_wallet_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_wallet_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_wallet_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_prime"("n" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."is_prime"("n" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_prime"("n" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_item"("p_item_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_item"("p_item_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_item"("p_item_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."roll_die"() TO "anon";
GRANT ALL ON FUNCTION "public"."roll_die"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."roll_die"() TO "service_role";



GRANT ALL ON FUNCTION "public"."roll_die"("p_is_reroll" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."roll_die"("p_is_reroll" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."roll_die"("p_is_reroll" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_follow"("p_target_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_follow"("p_target_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_follow"("p_target_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."unequip_item"("p_slot" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unequip_item"("p_slot" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unequip_item"("p_slot" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cotw"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cotw"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cotw"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lifetime_ep"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lifetime_ep"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lifetime_ep"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profile_meta"("p_bio" "text", "p_mood_color" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_profile_meta"("p_bio" "text", "p_mood_color" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profile_meta"("p_bio" "text", "p_mood_color" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_streak"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_streak"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_streak"() TO "service_role";



GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."active_seasonal_achievements" TO "anon";
GRANT ALL ON TABLE "public"."active_seasonal_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."active_seasonal_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."all_time_leaderboard_view" TO "anon";
GRANT ALL ON TABLE "public"."all_time_leaderboard_view" TO "authenticated";
GRANT ALL ON TABLE "public"."all_time_leaderboard_view" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON TABLE "public"."scores" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."scores" TO "authenticated";
GRANT ALL ON TABLE "public"."scores" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboard_view" TO "anon";
GRANT ALL ON TABLE "public"."leaderboard_view" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboard_view" TO "service_role";



GRANT ALL ON TABLE "public"."meta" TO "anon";
GRANT ALL ON TABLE "public"."meta" TO "authenticated";
GRANT ALL ON TABLE "public"."meta" TO "service_role";



GRANT ALL ON TABLE "public"."shop_items" TO "anon";
GRANT ALL ON TABLE "public"."shop_items" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_items" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_follows" TO "anon";
GRANT ALL ON TABLE "public"."user_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."user_follows" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






