-- 1. Add Leaderboard Index (Phase 1 Task 2)
CREATE INDEX IF NOT EXISTS idx_scores_roll_date_score ON scores(roll_date, score DESC);

-- 2. Normalize Badge Storage in roll_die (Phase 1 Task 1)
CREATE OR REPLACE FUNCTION public.roll_die(p_is_reroll BOOLEAN DEFAULT FALSE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
BEGIN
    IF NOT p_is_reroll THEN
        SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
        IF FOUND THEN
            SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = CURRENT_DATE;
            SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = CURRENT_DATE AND score > v_existing_roll.score;
            v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::FLOAT / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;
            RETURN jsonb_build_object('success', true, 'already_rolled', true, 'is_anon', false, 'hex', v_existing_roll.hex_code, 'score', v_existing_roll.score, 'rarity', v_existing_roll.rarity, 'badges', v_existing_roll.badges, 'percentile', v_percentile, 'total_rollers', v_total_count, 'new_achievements', '[]'::jsonb);
        END IF;
    END IF;

    IF p_is_reroll THEN
        SELECT reroll_shards INTO v_shard_count FROM profiles WHERE id = v_user_id;
        IF v_shard_count IS NULL OR v_shard_count <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'No reroll shards available.');
        END IF;
        UPDATE profiles SET reroll_shards = reroll_shards - 1 WHERE id = v_user_id;
    END IF;

    v_r := floor(random() * 256); v_g := floor(random() * 256); v_b := floor(random() * 256);
    v_hex := '#' || lpad(to_hex(v_r), 2, '0') || lpad(to_hex(v_g), 2, '0') || lpad(to_hex(v_b), 2, '0');
    v_hex_upper := upper(v_hex); v_hex_no_hash := substr(v_hex_upper, 2);
    v_sum := v_r + v_g + v_b; v_max := greatest(v_r,v_g,v_b); v_min := least(v_r,v_g,v_b); v_range := v_max - v_min;

    -- BADGE CHECKS (Storing only IDs to save DB space)
    IF true THEN v_total_score := v_total_score + 1337; v_badges := v_badges || to_jsonb('base_spectrum'::text); END IF;
    IF v_sum % 2 = 0 THEN v_total_score := v_total_score + 2024; v_badges := v_badges || to_jsonb('sum_even'::text); END IF;
    IF v_sum % 2 != 0 THEN v_total_score := v_total_score + 2023; v_badges := v_badges || to_jsonb('sum_odd'::text); END IF;
    IF v_sum % 3 = 0 THEN v_total_score := v_total_score + 15000; v_badges := v_badges || to_jsonb('sum_div3'::text); END IF;
    IF v_sum = 42 THEN v_total_score := v_total_score + 42000; v_badges := v_badges || to_jsonb('sum_42'::text); END IF;
    IF v_sum > 300 AND v_sum < 500 THEN v_total_score := v_total_score + 5500; v_badges := v_badges || to_jsonb('sum_balanced'::text); END IF;
    IF v_r%2=0 AND v_g%2=0 AND v_b%2=0 THEN v_total_score := v_total_score + 2222; v_badges := v_badges || to_jsonb('all_even'::text); END IF;
    IF v_r%2!=0 AND v_g%2!=0 AND v_b%2!=0 THEN v_total_score := v_total_score + 3333; v_badges := v_badges || to_jsonb('all_odd'::text); END IF;
    IF v_r%3=0 AND v_g%3=0 AND v_b%3=0 THEN v_total_score := v_total_score + 4444; v_badges := v_badges || to_jsonb('mult_3'::text); END IF;
    IF v_range > 200 THEN v_total_score := v_total_score + 8080; v_badges := v_badges || to_jsonb('high_contrast'::text); END IF;
    IF v_range < 50 THEN v_total_score := v_total_score + 1111; v_badges := v_badges || to_jsonb('low_contrast'::text); END IF;
    IF v_range > 50 AND v_range < 150 THEN v_total_score := v_total_score + 3300; v_badges := v_badges || to_jsonb('mod_contrast'::text); END IF;
    IF v_max > 200 AND v_min > 100 AND v_range < 80 THEN v_total_score := v_total_score + 250000; v_badges := v_badges || to_jsonb('pastel_soft'::text); END IF;
    IF v_max > 200 AND v_min < 50 THEN v_total_score := v_total_score + 250000; v_badges := v_badges || to_jsonb('neon_bright'::text); END IF;
    IF v_r > 128 THEN v_total_score := v_total_score + 4400; v_badges := v_badges || to_jsonb('bright_red'::text); END IF;
    IF v_r < 128 THEN v_total_score := v_total_score + 2200; v_badges := v_badges || to_jsonb('dark_red'::text); END IF;
    IF v_g > 128 THEN v_total_score := v_total_score + 4400; v_badges := v_badges || to_jsonb('bright_green'::text); END IF;
    IF v_g < 128 THEN v_total_score := v_total_score + 2200; v_badges := v_badges || to_jsonb('dark_green'::text); END IF;
    IF v_b > 128 THEN v_total_score := v_total_score + 4400; v_badges := v_badges || to_jsonb('bright_blue'::text); END IF;
    IF v_b < 128 THEN v_total_score := v_total_score + 2200; v_badges := v_badges || to_jsonb('dark_blue'::text); END IF;
    IF v_r IN (0,51,102,153,204,255) AND v_g IN (0,51,102,153,204,255) AND v_b IN (0,51,102,153,204,255) THEN v_total_score := v_total_score + 15151; v_badges := v_badges || to_jsonb('web_safe'::text); END IF;
    IF substr(v_hex_no_hash, 1, 2) = substr(v_hex_no_hash, 3, 2) AND substr(v_hex_no_hash, 3, 2) = substr(v_hex_no_hash, 5, 2) THEN v_total_score := v_total_score + 150000; v_badges := v_badges || to_jsonb('perfect_triplets'::text); END IF;
    IF v_r = v_g AND v_g = v_b THEN v_total_score := v_total_score + 25525; v_badges := v_badges || to_jsonb('greyscale'::text); END IF;
    IF v_hex_no_hash = reverse(v_hex_no_hash) THEN v_total_score := v_total_score + 50005; v_badges := v_badges || to_jsonb('palindrome'::text); END IF;
    IF is_prime(v_sum) THEN v_total_score := v_total_score + 100000; v_badges := v_badges || to_jsonb('prime_sum'::text); END IF;
    IF v_hex_upper LIKE '%A%' THEN v_total_score := v_total_score + 4111; v_badges := v_badges || to_jsonb('contains_a'::text); END IF;
    IF v_hex_upper LIKE '%B%' THEN v_total_score := v_total_score + 4222; v_badges := v_badges || to_jsonb('contains_b'::text); END IF;
    IF v_hex_upper LIKE '%C%' THEN v_total_score := v_total_score + 4333; v_badges := v_badges || to_jsonb('contains_c'::text); END IF;
    IF v_hex_upper LIKE '%D%' THEN v_total_score := v_total_score + 4444; v_badges := v_badges || to_jsonb('contains_d'::text); END IF;
    IF v_hex_upper LIKE '%E%' THEN v_total_score := v_total_score + 4555; v_badges := v_badges || to_jsonb('contains_e'::text); END IF;
    IF v_hex_upper LIKE '%F%' THEN v_total_score := v_total_score + 4666; v_badges := v_badges || to_jsonb('contains_f'::text); END IF;
    IF v_hex_upper LIKE '%0%' THEN v_total_score := v_total_score + 4000; v_badges := v_badges || to_jsonb('contains_0'::text); END IF;
    IF abs(v_r - v_g) < 30 THEN v_total_score := v_total_score + 6600; v_badges := v_badges || to_jsonb('similar_rg'::text); END IF;
    IF abs(v_g - v_b) < 30 THEN v_total_score := v_total_score + 6600; v_badges := v_badges || to_jsonb('similar_gb'::text); END IF;
    IF abs(v_r - v_b) < 30 THEN v_total_score := v_total_score + 6600; v_badges := v_badges || to_jsonb('similar_rb'::text); END IF;
    IF v_r=255 AND v_g=0 AND v_b=0 THEN v_total_score := v_total_score + 666666; v_badges := v_badges || to_jsonb('pure_red'::text); END IF;
    IF v_r=0 AND v_g=255 AND v_b=0 THEN v_total_score := v_total_score + 999999; v_badges := v_badges || to_jsonb('pure_green'::text); END IF;
    IF v_r=0 AND v_g=0 AND v_b=255 THEN v_total_score := v_total_score + 420420; v_badges := v_badges || to_jsonb('pure_blue'::text); END IF;
    IF v_r=255 AND v_g=215 AND v_b=0 THEN v_total_score := v_total_score + 5005005; v_badges := v_badges || to_jsonb('gold'::text); END IF;
    IF v_r=145 AND v_g=70 AND v_b=255 THEN v_total_score := v_total_score + 2940294; v_badges := v_badges || to_jsonb('twitch_purple'::text); END IF;
    IF v_r=30 AND v_g=215 AND v_b=96 THEN v_total_score := v_total_score + 1991991; v_badges := v_badges || to_jsonb('spotify_green'::text); END IF;
    IF v_r=244 AND v_g=0 AND v_b=9 THEN v_total_score := v_total_score + 1865186; v_badges := v_badges || to_jsonb('coca_cola_red'::text); END IF;
    IF v_hex_upper LIKE '%DEAD%' THEN v_total_score := v_total_score + 73217; v_badges := v_badges || to_jsonb('dead'::text); END IF;
    IF v_hex_upper LIKE '%BEEF%' THEN v_total_score := v_total_score + 83388; v_badges := v_badges || to_jsonb('beef'::text); END IF;
    IF v_hex_upper LIKE '%CAFE%' THEN v_total_score := v_total_score + 74237; v_badges := v_badges || to_jsonb('cafe'::text); END IF;
    IF v_hex_upper LIKE '%FACE%' THEN v_total_score := v_total_score + 42069; v_badges := v_badges || to_jsonb('face'::text); END IF;
    IF v_r=255 AND v_g=255 AND v_b=255 THEN v_total_score := v_total_score + 5252525; v_badges := v_badges || to_jsonb('the_light'::text); END IF;
    IF v_r=0 AND v_g=0 AND v_b=0 THEN v_total_score := v_total_score + 16777216; v_badges := v_badges || to_jsonb('the_void'::text); END IF;

    IF v_total_score >= 5000000 THEN v_rarity := 'Mythic';
    ELSIF v_total_score >= 1000000 THEN v_rarity := 'Anomaly';
    ELSIF v_total_score >= 250000 THEN v_rarity := 'Epic';
    ELSIF v_total_score >= 50000 THEN v_rarity := 'Rare';
    ELSIF v_total_score >= 10000 THEN v_rarity := 'Uncommon';
    ELSIF v_total_score >= 1500 THEN v_rarity := 'Common';
    ELSE v_rarity := 'Trash';
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'already_rolled', false, 'is_anon', true, 'hex', v_hex_upper, 'r', v_r, 'g', v_g, 'b', v_b, 'score', v_total_score, 'rarity', v_rarity, 'badges', v_badges);
    END IF;

    SELECT last_roll_date, current_streak INTO v_last_roll, v_current_streak FROM profiles WHERE id = v_user_id;
    IF p_is_reroll THEN
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

    IF v_current_streak % 7 = 0 AND NOT p_is_reroll THEN
        v_streak_bonus := 50000;
        v_total_score := v_total_score + v_streak_bonus;
        v_badges := v_badges || to_jsonb('streak_bonus_7'::text);
        UPDATE profiles SET reroll_shards = COALESCE(reroll_shards, 0) + 1 WHERE id = v_user_id;
        v_badges := v_badges || to_jsonb('reroll_shard_earned'::text);
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
        ('pure_green', v_r=30 AND v_g=215 AND v_b=96), ('pure_red', v_r=244 AND v_g=0 AND v_b=9),
        ('pure_blue', v_r=0 AND v_g=0 AND v_b=255),
        ('hex_letters', v_hex_upper LIKE '%A%' AND v_hex_upper LIKE '%B%' AND v_hex_upper LIKE '%C%' AND v_hex_upper LIKE '%D%' AND v_hex_upper LIKE '%E%' AND v_hex_upper LIKE '%F%');

    FOR v_ach_record IN
        SELECT a.id, a.name, a.icon, a.ep_reward, a.description
        FROM achievements a
        JOIN temp_ach_checks t ON a.id = t.id AND t.condition_met = TRUE
        WHERE a.season_id IS NULL AND NOT EXISTS (SELECT 1 FROM user_achievements ua WHERE ua.user_id = v_user_id AND ua.achievement_id = a.id)
    LOOP
        INSERT INTO user_achievements (user_id, achievement_id) VALUES (v_user_id, v_ach_record.id) ON CONFLICT DO NOTHING;
        v_achievement_ep := v_achievement_ep + v_ach_record.ep_reward;
        v_new_achievements := v_new_achievements || jsonb_build_object('id', v_ach_record.id, 'name', v_ach_record.name, 'icon', v_ach_record.icon, 'ep_reward', v_ach_record.ep_reward);
        -- Store achievement ID with 'ach_' prefix in badges array
        v_badges := v_badges || to_jsonb('ach_' || v_ach_record.id);
    END LOOP;

    FOR v_ach_record IN
        SELECT a.id, a.name, a.icon, a.ep_reward, a.description
        FROM active_seasonal_achievements a
        JOIN temp_ach_checks t ON a.id = t.id AND t.condition_met = TRUE
        WHERE NOT EXISTS (SELECT 1 FROM user_achievements ua WHERE ua.user_id = v_user_id AND ua.achievement_id = a.id)
    LOOP
        INSERT INTO user_achievements (user_id, achievement_id) VALUES (v_user_id, v_ach_record.id) ON CONFLICT DO NOTHING;
        v_achievement_ep := v_achievement_ep + v_ach_record.ep_reward;
        v_new_achievements := v_new_achievements || jsonb_build_object('id', v_ach_record.id, 'name', v_ach_record.name, 'icon', v_ach_record.icon, 'ep_reward', v_ach_record.ep_reward);
        v_badges := v_badges || to_jsonb('ach_' || v_ach_record.id);
    END LOOP;

    IF p_is_reroll THEN
        UPDATE scores SET hex_code = v_hex_upper, score = v_total_score, rarity = v_rarity, badges = v_badges WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
    ELSE
        BEGIN
            INSERT INTO scores (user_id, hex_code, score, rarity, roll_date, badges)
            VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, CURRENT_DATE, v_badges);
        EXCEPTION WHEN unique_violation THEN
            SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
            RETURN jsonb_build_object('success', true, 'already_rolled', true, 'is_anon', false, 'hex', v_existing_roll.hex_code, 'score', v_existing_roll.score, 'rarity', v_existing_roll.rarity, 'badges', v_existing_roll.badges, 'new_achievements', '[]'::jsonb);
        END;
    END IF;

    UPDATE profiles
    SET current_streak = v_current_streak, longest_streak = GREATEST(COALESCE(longest_streak, 0), v_current_streak), last_roll_date = CURRENT_DATE, lifetime_ep = COALESCE(lifetime_ep, 0) + v_achievement_ep
    WHERE id = v_user_id;

    SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = CURRENT_DATE;
    SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = CURRENT_DATE AND score > v_total_score;
    v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::FLOAT / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;

    RETURN jsonb_build_object('success', true, 'already_rolled', false, 'is_anon', false, 'hex', v_hex_upper, 'r', v_r, 'g', v_g, 'b', v_b, 'score', v_total_score, 'rarity', v_rarity, 'badges', v_badges, 'percentile', v_percentile, 'total_rollers', v_total_count, 'new_achievements', v_new_achievements);
END;
 $function$;
