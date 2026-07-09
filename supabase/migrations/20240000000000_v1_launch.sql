-- ==========================================
-- CHROMADIE V1.0 - FINAL SCHEMA & RPCs
-- ==========================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 2. TABLES
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    ep_spent BIGINT DEFAULT 0,
    lifetime_ep BIGINT DEFAULT 0,
    equipped_cosmetics JSONB DEFAULT '{}'::jsonb,
    last_roll_date DATE,
    reroll_shards INT DEFAULT 0,
    equipped_badges JSONB DEFAULT '[]'::jsonb,
    bio TEXT,
    mood_color TEXT,
    best_roll_score BIGINT,
    best_roll_hex TEXT,
    best_roll_rarity TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    force_cotw_next_roll BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    hex_code TEXT,
    score BIGINT,
    rarity TEXT,
    roll_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    badges JSONB DEFAULT '[]'::jsonb
);
ALTER TABLE scores DROP CONSTRAINT IF EXISTS unique_daily_roll;
ALTER TABLE scores ADD CONSTRAINT unique_daily_roll UNIQUE (user_id, roll_date);
CREATE INDEX IF NOT EXISTS idx_scores_roll_date_score ON scores(roll_date, score DESC);

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    item_key TEXT,
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_items (
    item_key TEXT PRIMARY KEY,
    name TEXT,
    slot TEXT,
    cost BIGINT,
    css_type TEXT,
    css_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    available_from DATE,
    available_until DATE,
    rarity TEXT DEFAULT 'Common',
    description TEXT
);
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_cost_check;
ALTER TABLE shop_items ADD CONSTRAINT shop_items_cost_check CHECK (cost >= 0);

CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    icon TEXT,
    ep_reward BIGINT,
    rarity TEXT,
    season_id TEXT,
    season_start DATE,
    season_end DATE
);

CREATE TABLE IF NOT EXISTS user_achievements (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    count INT DEFAULT 1,
    PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS user_follows (
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    followee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, followee_id)
);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meta is viewable by everyone." ON meta;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Scores are viewable by everyone." ON scores;
DROP POLICY IF EXISTS "Users can view own inventory." ON inventory;
DROP POLICY IF EXISTS "Shop items are viewable by everyone." ON shop_items;
DROP POLICY IF EXISTS "Achievements are viewable by everyone." ON achievements;
DROP POLICY IF EXISTS "Users can view own unlocked achievements." ON user_achievements;
DROP POLICY IF EXISTS "Users can view follows" ON user_follows;
DROP POLICY IF EXISTS "Users can insert follows" ON user_follows;
DROP POLICY IF EXISTS "Users can delete follows" ON user_follows;

CREATE POLICY "Meta is viewable by everyone." ON meta FOR SELECT USING (true);
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Scores are viewable by everyone." ON scores FOR SELECT USING (true);
CREATE POLICY "Users can view own inventory." ON inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Shop items are viewable by everyone." ON shop_items FOR SELECT USING (true);
CREATE POLICY "Achievements are viewable by everyone." ON achievements FOR SELECT USING (true);
CREATE POLICY "Users can view own unlocked achievements." ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view follows" ON user_follows FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = followee_id);
CREATE POLICY "Users can insert follows" ON user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can delete follows" ON user_follows FOR DELETE USING (auth.uid() = follower_id);

-- 4. VIEWS (Security Invoker enabled to respect RLS)
DROP VIEW IF EXISTS leaderboard_view;
CREATE VIEW leaderboard_view WITH (security_invoker = true) AS
SELECT s.user_id, s.hex_code, s.score, s.rarity, s.roll_date, p.username, p.current_streak, p.equipped_cosmetics, p.equipped_badges
FROM scores s JOIN profiles p ON s.user_id = p.id;

DROP VIEW IF EXISTS all_time_leaderboard_view;
CREATE VIEW all_time_leaderboard_view WITH (security_invoker = true) AS
SELECT p.id as user_id, p.username, p.current_streak, p.equipped_cosmetics, p.equipped_badges, p.best_roll_score as score, p.best_roll_hex as hex_code, p.best_roll_rarity as rarity, p.lifetime_ep
FROM profiles p WHERE p.best_roll_score IS NOT NULL;

DROP VIEW IF EXISTS active_seasonal_achievements;
CREATE VIEW active_seasonal_achievements WITH (security_invoker = true) AS
SELECT id, name, description, icon, ep_reward, rarity, season_id
FROM achievements
WHERE season_id IS NOT NULL AND season_start <= CURRENT_DATE AND season_end >= CURRENT_DATE;

-- 5. TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ BEGIN
  INSERT INTO public.profiles (id, username) VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
 $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_lifetime_ep()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
    UPDATE profiles SET lifetime_ep = COALESCE(lifetime_ep, 0) + NEW.score WHERE id = NEW.user_id;
    UPDATE profiles SET best_roll_score = NEW.score, best_roll_hex = NEW.hex_code, best_roll_rarity = NEW.rarity
    WHERE id = NEW.user_id AND (best_roll_score IS NULL OR NEW.score > best_roll_score);
    RETURN NEW;
END;
 $$;
DROP TRIGGER IF EXISTS on_score_insert ON scores;
CREATE TRIGGER on_score_insert AFTER INSERT ON scores FOR EACH ROW EXECUTE FUNCTION public.update_lifetime_ep();

-- 6. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_prime(n INT)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$ DECLARE i INT;
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

CREATE OR REPLACE FUNCTION public.update_cotw()
RETURNS VOID LANGUAGE plpgsql AS $$ DECLARE
    v_r INT; v_g INT; v_b INT; v_cotw_str TEXT;
BEGIN
    v_r := floor(random() * 256);
    v_g := floor(random() * 256);
    v_b := floor(random() * 256);
    v_cotw_str := v_r || ',' || v_g || ',' || v_b;
    INSERT INTO meta (key, value) VALUES ('cotw_target', v_cotw_str)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END;
 $$;

-- Schedule COTW to run every Monday at 00:00 UTC
SELECT cron.schedule('cron_update_cotw', '0 0 * * 1', 'SELECT public.update_cotw()');
SELECT public.update_cotw(); -- Run once to populate initial value

-- 7. SECURE RPCs
CREATE OR REPLACE FUNCTION public.get_wallet_balance()
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE p_user_id UUID := auth.uid(); v_lifetime_ep BIGINT; v_spent_ep BIGINT;
BEGIN
    IF p_user_id IS NULL THEN RETURN 0; END IF;
    SELECT COALESCE(p.lifetime_ep, 0) INTO v_lifetime_ep FROM profiles p WHERE p.id = p_user_id;
    SELECT COALESCE(p.ep_spent, 0) INTO v_spent_ep FROM profiles p WHERE p.id = p_user_id;
    RETURN v_lifetime_ep - v_spent_ep;
END;
 $$;

CREATE OR REPLACE FUNCTION public.get_score_percentile(p_score BIGINT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_total BIGINT; v_better BIGINT; v_percentile NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total FROM scores WHERE roll_date = CURRENT_DATE;
    IF v_total = 0 THEN RETURN json_build_object('total_rollers', 0, 'percentile', 100); END IF;
    SELECT COUNT(*) INTO v_better FROM scores WHERE roll_date = CURRENT_DATE AND score > p_score;
    v_percentile := ((v_total - v_better)::NUMERIC / v_total) * 100;
    RETURN json_build_object('total_rollers', v_total, 'percentile', v_percentile);
END;
 $$;

CREATE OR REPLACE FUNCTION public.equip_item(p_item_key text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE v_user_id uuid := auth.uid(); v_owned boolean; v_slot text; v_current_cosmetics jsonb;
BEGIN
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
END;
 $$;

CREATE OR REPLACE FUNCTION public.unequip_item(p_slot text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE v_user_id uuid := auth.uid(); v_current_cosmetics jsonb;
BEGIN
    if v_user_id is null then return json_build_object('success', false, 'error', 'Not authenticated'); end if;
    if p_slot not in ('name_effect', 'frame', 'profile_bg', 'roll_effect', 'lb_theme', 'title') then return json_build_object('success', false, 'error', 'Invalid slot'); end if;
    select equipped_cosmetics into v_current_cosmetics from profiles where id = v_user_id;
    if v_current_cosmetics is null then v_current_cosmetics := '{}'::jsonb; end if;
    v_current_cosmetics := v_current_cosmetics - p_slot;
    update profiles set equipped_cosmetics = v_current_cosmetics where id = v_user_id;
    return json_build_object('success', true, 'cosmetics', v_current_cosmetics);
END;
 $$;

CREATE OR REPLACE FUNCTION public.equip_badges(p_badge_ids JSONB)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE v_user_id UUID := auth.uid(); v_badge TEXT; v_invalid_badge BOOLEAN := FALSE;
BEGIN
    IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
    IF jsonb_array_length(p_badge_ids) > 3 THEN RETURN json_build_object('success', false, 'error', 'You can only pin 3 achievements.'); END IF;
    FOR v_badge IN SELECT * FROM jsonb_array_elements_text(p_badge_ids) LOOP
        IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = v_user_id AND achievement_id = v_badge) THEN v_invalid_badge := TRUE; END IF;
    END LOOP;
    IF v_invalid_badge THEN RETURN json_build_object('success', false, 'error', 'You do not own all selected badges.'); END IF;
    UPDATE profiles SET equipped_badges = p_badge_ids WHERE id = v_user_id;
    RETURN json_build_object('success', true, 'badges', p_badge_ids);
END;
 $$;

CREATE OR REPLACE FUNCTION public.update_profile_meta(p_bio TEXT, p_mood_color TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE v_user_id UUID := auth.uid(); v_final_bio TEXT := NULL; v_final_color TEXT := NULL;
BEGIN
    IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
    IF p_bio IS NOT NULL AND length(p_bio) > 0 THEN
        IF length(p_bio) > 140 THEN RETURN json_build_object('success', false, 'error', 'Bio must be 140 characters or less.'); END IF;
        v_final_bio := p_bio;
    END IF;
    IF p_mood_color IS NOT NULL AND p_mood_color != '' THEN
        IF p_mood_color !~* '^#[0-9A-F]{6}$' THEN RETURN json_build_object('success', false, 'error', 'Invalid color format.'); END IF;
        v_final_color := p_mood_color;
    END IF;
    UPDATE profiles SET bio = v_final_bio, mood_color = v_final_color WHERE id = v_user_id;
    RETURN json_build_object('success', true, 'bio', v_final_bio, 'mood_color', v_final_color);
END;
 $$;

CREATE OR REPLACE FUNCTION public.purchase_item(p_item_key text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE
    v_user_id uuid := auth.uid(); v_item_slot text; item_cost bigint; user_ep_spent bigint; user_lifetime_ep bigint; user_balance bigint;
BEGIN
    if v_user_id is null then return json_build_object('success', false, 'error', 'Not authenticated'); end if;
    select cost, slot into item_cost, v_item_slot from shop_items where item_key = p_item_key;
    if item_cost is null then return json_build_object('success', false, 'error', 'Invalid item'); end if;
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

CREATE OR REPLACE FUNCTION public.toggle_follow(p_target_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE
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

CREATE OR REPLACE FUNCTION public.get_rivals_scores()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RETURN '[]'::json; END IF;
    RETURN json_agg(
        json_build_object(
            'user_id', s.user_id, 'hex_code', s.hex_code, 'score', s.score, 'rarity', s.rarity,
            'username', p.username, 'current_streak', p.current_streak, 'equipped_cosmetics', p.equipped_cosmetics
        )
    )
    FROM scores s JOIN profiles p ON s.user_id = p.id
    WHERE s.roll_date = CURRENT_DATE AND s.user_id IN (SELECT followee_id FROM user_follows WHERE follower_id = v_user_id)
    ORDER BY s.score DESC;
END;
 $$;

-- Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_bump_shop_version()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE v_user_id UUID := auth.uid(); v_is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_user_id;
    IF NOT COALESCE(v_is_admin, false) THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
    UPDATE meta SET value = NOW()::text WHERE key = 'shop_version';
    RETURN json_build_object('success', true);
END;
 $$;

CREATE OR REPLACE FUNCTION public.admin_randomize_cotw()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE v_user_id UUID := auth.uid(); v_is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_user_id;
    IF NOT COALESCE(v_is_admin, false) THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
    PERFORM public.update_cotw();
    RETURN json_build_object('success', true);
END;
 $$;

CREATE OR REPLACE FUNCTION public.admin_trigger_cotw_test()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE v_user_id UUID := auth.uid(); v_is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_user_id;
    IF NOT COALESCE(v_is_admin, false) THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
    UPDATE profiles SET force_cotw_next_roll = TRUE WHERE id = v_user_id;
    RETURN json_build_object('success', true, 'message', 'COTW test armed. Your next roll will hit.');
END;
 $$;

-- 8. CORE GAME RPC: roll_die (Consolidated Version)
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
    v_milestone_granted TEXT := '';
    v_best_roll_score BIGINT;

    v_cotw_str TEXT; v_cotw_r INT; v_cotw_g INT; v_cotw_b INT; v_dist FLOAT; v_force_cotw BOOLEAN; v_is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_user_id;

    IF NOT p_is_reroll AND COALESCE(v_is_admin, false) = FALSE THEN
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

    -- BADGE CHECKS
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
    IF v_r=145 AND v_g=70 AND v_b=255 THEN v_total_score := v_total_score + 2940294; v_badges := v_badges || to_jsonb('streamer_purple'::text); END IF;
    IF v_r=30 AND v_g=215 AND v_b=96 THEN v_total_score := v_total_score + 1991991; v_badges := v_badges || to_jsonb('audio_stream_green'::text); END IF;
    IF v_r=244 AND v_g=0 AND v_b=9 THEN v_total_score := v_total_score + 1865186; v_badges := v_badges || to_jsonb('classic_cola_red'::text); END IF;
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

    IF v_user_id IS NOT NULL AND v_total_score > COALESCE(v_best_roll_score, 0) THEN
        v_achievement_ep := v_achievement_ep + 50000;
        v_badges := v_badges || to_jsonb('beat_your_best'::text);
    END IF;

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

    IF COALESCE(v_is_admin, false) AND NOT p_is_reroll THEN
        DELETE FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
    END IF;

    IF p_is_reroll THEN
        UPDATE scores SET hex_code = v_hex_upper, score = v_total_score, rarity = v_rarity, badges = v_badges WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
    ELSE
        BEGIN
            INSERT INTO scores (user_id, hex_code, score, rarity, roll_date, badges)
            VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, CURRENT_DATE, v_badges);
        EXCEPTION WHEN unique_violation THEN
            SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
            RETURN jsonb_build_object('success', true, 'already_rolled', true, 'is_anon', false, 'hex', v_existing_roll.hex_code, 'score', v_existing_roll.score, 'rarity', v_existing_roll.rarity, 'badges', v_existing_roll.badges, 'new_achievements', '[]'::jsonb, 'milestone_granted', '');
        END;
    END IF;

    UPDATE profiles
    SET current_streak = v_current_streak, longest_streak = GREATEST(COALESCE(longest_streak, 0), v_current_streak), last_roll_date = CURRENT_DATE, lifetime_ep = COALESCE(lifetime_ep, 0) + v_achievement_ep
    WHERE id = v_user_id;

    SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = CURRENT_DATE;
    SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = CURRENT_DATE AND score > v_total_score;
    v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::FLOAT / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;

    RETURN jsonb_build_object('success', true, 'already_rolled', false, 'is_anon', false, 'hex', v_hex_upper, 'r', v_r, 'g', v_g, 'b', v_b, 'score', v_total_score, 'rarity', v_rarity, 'badges', v_badges, 'percentile', v_percentile, 'total_rollers', v_total_count, 'new_achievements', v_new_achievements, 'milestone_granted', v_milestone_granted);
END;
 $function$;

-- 9. SEED DATA (Shop & Achievements)

-- ACHIEVEMENTS (50)
INSERT INTO achievements (id, name, description, icon, ep_reward, rarity) VALUES
('first_roll', 'First Steps', 'Roll the die for the first time.', '🎲', 1000, 'Common'),
('roll_10', 'Dedicated', 'Roll the die 10 times.', '🧡', 10000, 'Common'),
('roll_50', 'Veteran', 'Roll the die 50 times.', '💜', 100000, 'Rare'),
('roll_100', 'Centurion', 'Roll the die 100 times.', '💯', 250000, 'Epic'),
('roll_365', 'Annual', 'Roll the die 365 times.', '📅', 1000000, 'Mythic'),
('streak_7', 'Week Warrior', 'Maintain a 7-day streak.', '🔥', 50000, 'Uncommon'),
('streak_14', 'Fortnight', 'Maintain a 14-day streak.', '🔥', 100000, 'Rare'),
('streak_30', 'Monthly Grinder', 'Maintain a 30-day streak.', '📅', 500000, 'Rare'),
('streak_100', 'Iron Will', 'Maintain a 100-day streak.', '🔥', 2000000, 'Mythic'),
('score_10k', 'Five Digits', 'Score over 10,000 EP in a single roll.', '💰', 10000, 'Common'),
('score_50k', 'High Roller', 'Score over 50,000 EP in a single roll.', '💰', 50000, 'Uncommon'),
('score_100k', 'Six Digits', 'Score over 100,000 EP in a single roll.', '💰', 100000, 'Rare'),
('score_1m', 'Millionaire', 'Score over 1,000,000 EP in a single roll.', '💰', 250000, 'Epic'),
('score_5m', 'Tycoon', 'Score over 5,000,000 EP in a single roll.', '💰', 1000000, 'Mythic'),
('rarity_rare', 'Uncommonly Rare', 'Roll a Rare rarity color.', '🔵', 25000, 'Uncommon'),
('rarity_epic', 'Epic Encounter', 'Roll an Epic rarity color.', '🟣', 100000, 'Rare'),
('rarity_anomaly', 'Anomaly Detected', 'Roll an Anomaly rarity color.', '🟠', 500000, 'Epic'),
('mythic_roll', 'Mythic Touch', 'Roll a Mythic rarity color.', '🌟', 1000000, 'Mythic'),
('roll_even_sum', 'Even Steven', 'Roll a color with an even R+G+B sum.', '⚖️', 5000, 'Common'),
('roll_odd_sum', 'Oddball', 'Roll a color with an odd R+G+B sum.', '🎲', 5000, 'Common'),
('roll_div3_sum', 'Rule of Three', 'Roll a color where R+G+B is divisible by 3.', '3️⃣', 15000, 'Uncommon'),
('roll_42_sum', 'Meaning of Life', 'Roll a color where R+G+B is exactly 42.', '🧬', 42000, 'Rare'),
('roll_balanced_sum', 'Balanced', 'Roll a color where R+G+B is between 300 and 499.', '🧘', 10000, 'Common'),
('roll_prime', 'Prime Number', 'Roll a color with a prime R+G+B sum.', '🔢', 100000, 'Rare'),
('all_even_rgb', 'All Even', 'Roll a color where R, G, and B are all even numbers.', '2️⃣', 15000, 'Uncommon'),
('all_odd_rgb', 'All Odd', 'Roll a color where R, G, and B are all odd numbers.', '1️⃣', 15000, 'Uncommon'),
('mult_3_rgb', 'Triple Threat', 'Roll a color where R, G, and B are all multiples of 3.', '🔢', 25000, 'Uncommon'),
('high_contrast', 'High Contrast', 'Roll a color with an extreme RGB range (>200).', '🌓', 25000, 'Uncommon'),
('low_contrast', 'Low Contrast', 'Roll a color with a muddy/muted RGB range (<50).', '🌫️', 10000, 'Common'),
('mod_contrast', 'Moderate Contrast', 'Roll a color with an RGB range between 50 and 150.', '🛤️', 15000, 'Uncommon'),
('pastel_soft', 'Pastel Soft', 'Roll a soft pastel hue.', '🌸', 200000, 'Epic'),
('neon_bright', 'Neon Bright', 'Roll a vivid neon glow.', '💡', 200000, 'Epic'),
('web_safe', 'Web Safe', 'Roll a 1990s web safe color.', '🕸️', 30000, 'Uncommon'),
('roll_palindrome', 'Mirror', 'Roll a hex palindrome (reads same backwards).', '🪞', 100000, 'Rare'),
('perfect_triplets', 'Perfect Triplets', 'Roll a hex that is XXYYZZ.', '🟰', 150000, 'Rare'),
('greyscale', 'Greyscale', 'Roll a pure greyscale color.', '⚫', 30000, 'Uncommon'),
('hex_letters', 'Alphabet Soup', 'Roll a hex containing all 6 letters (A-F).', '🔤', 500000, 'Epic'),
('contains_a', 'A is for Apple', 'Roll a hex containing A.', '🅰️', 5000, 'Common'),
('contains_b', 'B is for Bee', 'Roll a hex containing B.', '🅱️', 5000, 'Common'),
('contains_c', 'C is for Sea', 'Roll a hex containing C.', '©️', 5000, 'Common'),
('contains_d', 'D is for Dog', 'Roll a hex containing D.', '🇩', 5000, 'Common'),
('contains_e', 'E is for Elephant', 'Roll a hex containing E.', '📧', 5000, 'Common'),
('contains_f', 'F is for Fox', 'Roll a hex containing F.', '🇫', 5000, 'Common'),
('contains_0', 'Zero Hero', 'Roll a hex containing 0.', '⭕', 5000, 'Common'),
('roll_black', 'The Void', 'Roll Pure Black (#000000).', '🌑', 5000000, 'Mythic'),
('roll_white', 'The Light', 'Roll Pure White (#FFFFFF).', '☀️', 5000000, 'Mythic'),
('roll_gold', 'Midas', 'Roll Pure Gold.', '🥇', 2000000, 'Epic'),
('pure_red', 'Maximum Red', 'Roll Pure Red (255,0,0).', '🟥', 500000, 'Epic'),
('pure_green', 'Maximum Green', 'Roll Pure Green (0,255,0).', '🟩', 500000, 'Epic'),
('pure_blue', 'Maximum Blue', 'Roll Pure Blue (0,0,255).', '🟦', 500000, 'Epic'),
('streamer_purple', 'Streamer Purple', 'Roll the exact Streamer Purple.', '🟣', 2000000, 'Mythic'),
('roll_beef', 'Where is the Beef?', 'Roll a hex containing BEEF.', '🥩', 50000, 'Uncommon'),
('roll_cafe', 'Coffee Break', 'Roll a hex containing CAFE.', '☕', 50000, 'Uncommon'),
('roll_dead', 'Dead Man Walking', 'Roll a hex containing DEAD.', '💀', 50000, 'Uncommon'),
('roll_face', 'Face Value', 'Roll a hex containing FACE.', '😎', 50000, 'Uncommon')
ON CONFLICT (id) DO NOTHING;

-- SHOP ITEMS (Catalog)
INSERT INTO shop_items (item_key, name, slot, cost, css_type, css_value, rarity, description) VALUES
-- Consumables
('streak_freeze', 'Streak Freeze', 'consumable', 100000, 'text', 'Protects your streak if you miss a day.', 'Rare', 'Protects your streak if you miss a day.'),
('reroll_shard', 'Reroll Shard', 'consumable', 200000, 'text', 'Allows you to reroll your daily color.', 'Rare', 'Grants 1 Reroll Shard, usable on the results screen.'),
-- Milestone Frames
('frame_30_day', 'Monthly Grinder Frame', 'frame', 0, 'style', 'border: 2px solid #10b981; box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);', 'Mythic', 'Unlocked at a 30-day streak.'),
('frame_100_day', 'Iron Will Frame', 'frame', 0, 'style', 'border: 2px solid #f1c40f; box-shadow: 0 0 15px rgba(241, 196, 15, 0.5);', 'Mythic', 'Unlocked at a 100-day streak.'),
('frame_365_day', 'Annual Frame', 'frame', 0, 'style', 'border: 2px solid #a15cff; box-shadow: 0 0 15px rgba(161, 92, 255, 0.5);', 'Mythic', 'Unlocked at a 365-day streak.'),
-- Frames
('frame_thin_white', 'Hairline Frame', 'frame', 40000, 'style', 'border: 1px solid rgba(255,255,255,0.35);', 'Uncommon', 'Applies a custom border to your profile header.'),
('frame_neon_cyan', 'Cyan Frame', 'frame', 150000, 'style', 'border: 1px solid #22d3ee; box-shadow: 0 0 12px rgba(34,211,238,0.5);', 'Rare', 'Applies a custom border to your profile header.'),
('frame_neon_pink', 'Pink Frame', 'frame', 150000, 'style', 'border: 1px solid #ff4fd8; box-shadow: 0 0 12px rgba(255,79,216,0.5);', 'Rare', 'Applies a custom border to your profile header.'),
('frame_gold_ring', 'Gold Ring', 'frame', 600000, 'style', 'border: 1px solid #f1c40f; box-shadow: 0 0 16px rgba(241,196,15,0.45);', 'Epic', 'Applies a custom border to your profile header.'),
('frame_spectrum', 'Spectrum Frame', 'frame', 4000000, 'class', 'frame-spectrum-anim', 'Epic', 'Applies a custom border to your profile header.'),
('frame_diamond', 'Diamond Frame', 'frame', 12000000, 'class', 'frame-diamond-anim', 'Mythic', 'Applies a custom border to your profile header.'),
-- Profile Backgrounds
('bg_aurora', 'Aurora Background', 'profile_bg', 1500000, 'style', 'background-image: linear-gradient(135deg, #00c6ff, #0072ff); background-size: cover;', 'Epic', 'Applies a custom background to your profile card.'),
('bg_sunset', 'Sunset Background', 'profile_bg', 1500000, 'style', 'background-image: linear-gradient(135deg, #ff9a9e, #fad0c4); background-size: cover;', 'Epic', 'Applies a custom background to your profile card.'),
('bg_matrix', 'Matrix Background', 'profile_bg', 3000000, 'style', 'background-color: #001100; background-image: linear-gradient(0deg, transparent 24%, rgba(0, 255, 0, .1) 25%, rgba(0, 255, 0, .1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .1) 75%, rgba(0, 255, 0, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 0, .1) 25%, rgba(0, 255, 0, .1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .1) 75%, rgba(0, 255, 0, .1) 76%, transparent 77%, transparent); background-size: 50px 50px;', 'Epic', 'Applies a custom background to your profile card.'),
('bg_void', 'Void Background', 'profile_bg', 5000000, 'style', 'background-image: radial-gradient(circle, #1a1a1a, #000000); background-size: cover;', 'Mythic', 'Applies a custom background to your profile card.'),
-- Name Effects (Styles)
('name_italic', 'Italic Font', 'name_effect', 50000, 'style', 'font-style: italic; color: #fff;', 'Uncommon', 'Applies a custom visual effect to your username.'),
('name_drop_shadow', 'Drop Shadow', 'name_effect', 50000, 'style', 'text-shadow: 2px 2px 4px #000; color: #fff;', 'Uncommon', 'Applies a custom visual effect to your username.'),
('name_smallcaps', 'Small Caps', 'name_effect', 75000, 'style', 'font-variant: small-caps; color: #fff; letter-spacing: 1px;', 'Uncommon', 'Applies a custom visual effect to your username.'),
('name_glow_blue', 'Blue Glow', 'name_effect', 100000, 'style', 'text-shadow: 0 0 10px #3498db; color: #fff;', 'Rare', 'Applies a custom visual effect to your username.'),
('name_glow_green', 'Green Glow', 'name_effect', 100000, 'style', 'text-shadow: 0 0 10px #2ecc71; color: #fff;', 'Rare', 'Applies a custom visual effect to your username.'),
('name_glow_purple', 'Purple Glow', 'name_effect', 100000, 'style', 'text-shadow: 0 0 10px #9b59b6; color: #fff;', 'Rare', 'Applies a custom visual effect to your username.'),
('name_glow_red', 'Red Glow', 'name_effect', 100000, 'style', 'text-shadow: 0 0 10px #ff4c4c; color: #fff;', 'Rare', 'Applies a custom visual effect to your username.'),
('name_glow_pink_neon', 'Neon Pink Glow', 'name_effect', 250000, 'style', 'text-shadow: 0 0 5px #ff00de, 0 0 10px #ff00de; color: #fff;', 'Rare', 'Applies a custom visual effect to your username.'),
('name_gradient_purple', 'Purple Gradient', 'name_effect', 500000, 'style', 'background: linear-gradient(45deg, #8E2DE2, #4A00E0); -webkit-background-clip: text; background-clip: text; color: transparent;', 'Epic', 'Applies a custom visual effect to your username.'),
('name_glow_gold', 'Gold Glow', 'name_effect', 500000, 'style', 'text-shadow: 0 0 15px #f1c40f; color: #fff;', 'Epic', 'Applies a custom visual effect to your username.'),
('name_gradient_fire', 'Fire Gradient', 'name_effect', 750000, 'style', 'background: linear-gradient(45deg, #f12711, #f5af19); -webkit-background-clip: text; background-clip: text; color: transparent;', 'Epic', 'Applies a custom visual effect to your username.'),
-- Name Effects (Classes/Animations)
('name_rainbow', 'Rainbow Shift', 'name_effect', 2000000, 'class', 'rainbow-text-anim', 'Epic', 'Applies a custom visual effect to your username.'),
('name_flicker_neon', 'Flickering Neon', 'name_effect', 2000000, 'class', 'flicker-neon-anim', 'Epic', 'Applies a custom visual effect to your username.'),
('name_shining_gold', 'Shining Gold Name', 'name_effect', 3000000, 'class', 'shining-gold-anim', 'Epic', 'Applies a custom visual effect to your username.'),
('name_pulsing_glow', 'Pulsing Aura', 'name_effect', 3000000, 'class', 'pulsing-glow-anim', 'Epic', 'Applies a custom visual effect to your username.'),
('name_matrix_rain', 'Matrix Rain', 'name_effect', 5000000, 'class', 'matrix-rain-anim', 'Mythic', 'Applies a custom visual effect to your username.'),
('name_diamond_shimmer', 'Diamond Shimmer', 'name_effect', 7500000, 'class', 'diamond-shimmer-anim', 'Mythic', 'Applies a custom visual effect to your username.'),
('name_glitch_effect', 'Glitch Effect', 'name_effect', 10000000, 'class', 'glitch-anim', 'Mythic', 'Applies a custom visual effect to your username.'),
('name_ocean_wave', 'Ocean Wave', 'name_effect', 12000000, 'class', 'ocean-wave-anim', 'Mythic', 'Applies a custom visual effect to your username.'),
('name_sunset_blur', 'Sunset Blur', 'name_effect', 15000000, 'class', 'sunset-blur-anim', 'Mythic', 'Applies a custom visual effect to your username.'),
-- Prestige Name Effects
('name_inferno', 'Inferno Name', 'name_effect', 15000000, 'class', 'inferno-name-anim', 'Mythic', 'Applies a custom visual effect to your username.'),
('name_spectrum', 'Spectrum Name', 'name_effect', 25000000, 'class', 'spectrum-name-anim', 'Mythic', 'Applies a custom visual effect to your username.'),
-- Roll Particle Effects
('roll_sparkles', 'Sparkle Aura', 'roll_effect', 500000, 'class', 'roll-sparkles-anim', 'Epic', 'Applies a visual aura to your color orb on the results screen.'),
('roll_inferno', 'Inferno Aura', 'roll_effect', 5000000, 'class', 'roll-inferno-anim', 'Mythic', 'Applies a visual aura to your color orb on the results screen.'),
('roll_spectrum', 'Spectrum Aura', 'roll_effect', 12000000, 'class', 'roll-spectrum-anim', 'Mythic', 'Applies a visual aura to your color orb on the results screen.'),
-- Leaderboard Row Themes
('lb_glow', 'Glowing Row', 'lb_theme', 250000, 'class', 'lb-glow-theme', 'Rare', 'Applies a custom background and border to your row on the global leaderboard.'),
('lb_spectrum', 'Spectrum Row', 'lb_theme', 25000000, 'class', 'lb-spectrum-theme', 'Mythic', 'Applies a custom background and border to your row on the global leaderboard.'),
('lb_gold', 'Golden Row', 'lb_theme', 8000000, 'class', 'lb-gold-theme', 'Mythic', 'Applies a custom background and border to your row on the global leaderboard.')
ON CONFLICT (item_key) DO NOTHING;

-- 10. META INITIALIZATION
INSERT INTO meta (key, value) VALUES ('shop_version', '2024-01-01T00:00:00Z')
ON CONFLICT (key) DO NOTHING;
