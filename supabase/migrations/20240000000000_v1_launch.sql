-- ==========================================
-- CHROMADIE V1.0 - FINAL SCHEMA & RPCs
-- ==========================================

-- 1. TABLES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    email TEXT,
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
    best_roll_rarity TEXT
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
    PRIMARY KEY (user_id, achievement_id)
);

-- 2. ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Scores are viewable by everyone." ON scores;
DROP POLICY IF EXISTS "Users can view own inventory." ON inventory;
DROP POLICY IF EXISTS "Shop items are viewable by everyone." ON shop_items;
DROP POLICY IF EXISTS "Achievements are viewable by everyone." ON achievements;
DROP POLICY IF EXISTS "Users can view own unlocked achievements." ON user_achievements;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Scores are viewable by everyone." ON scores FOR SELECT USING (true);
CREATE POLICY "Users can view own inventory." ON inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Shop items are viewable by everyone." ON shop_items FOR SELECT USING (true);
CREATE POLICY "Achievements are viewable by everyone." ON achievements FOR SELECT USING (true);
CREATE POLICY "Users can view own unlocked achievements." ON user_achievements FOR SELECT USING (auth.uid() = user_id);

-- 3. VIEWS
DROP VIEW IF EXISTS leaderboard_view;
CREATE VIEW leaderboard_view AS
SELECT s.user_id, s.hex_code, s.score, s.rarity, s.roll_date, p.username, p.current_streak, p.equipped_cosmetics, p.equipped_badges
FROM scores s JOIN profiles p ON s.user_id = p.id;

DROP VIEW IF EXISTS all_time_leaderboard_view;
CREATE VIEW all_time_leaderboard_view AS
SELECT p.id as user_id, p.username, p.current_streak, p.equipped_cosmetics, p.equipped_badges, p.best_roll_score as score, p.best_roll_hex as hex_code, p.best_roll_rarity as rarity, p.lifetime_ep
FROM profiles p WHERE p.best_roll_score IS NOT NULL;

DROP VIEW IF EXISTS active_seasonal_achievements;
CREATE VIEW active_seasonal_achievements AS
SELECT id, name, description, icon, ep_reward, rarity, season_id
FROM achievements
WHERE season_id IS NOT NULL AND season_start <= CURRENT_DATE AND season_end >= CURRENT_DATE;

-- 4. TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ BEGIN
  INSERT INTO public.profiles (id, username, email) VALUES (new.id, new.raw_user_meta_data->>'username', new.email);
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

-- 5. HELPER FUNCTIONS
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

-- 6. SECURE RPCs
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
    if p_slot not in ('name_effect', 'frame', 'profile_bg', 'roll_effect', 'lb_theme') then return json_build_object('success', false, 'error', 'Invalid slot'); end if;
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
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE v_user_id uuid := auth.uid(); item_cost bigint; user_ep_spent bigint; user_lifetime_ep bigint; user_balance bigint; already_owned boolean;
BEGIN
    if v_user_id is null then return json_build_object('success', false, 'error', 'Not authenticated'); end if;
    select cost into item_cost from shop_items where item_key = p_item_key;
    if item_cost is null then return json_build_object('success', false, 'error', 'Invalid item'); end if;
    select exists(select 1 from inventory where user_id = v_user_id and item_key = p_item_key) into already_owned;
    if already_owned then return json_build_object('success', false, 'error', 'Already owned'); end if;
    select ep_spent into user_ep_spent from profiles where id = v_user_id;
    select coalesce(lifetime_ep, 0) into user_lifetime_ep from profiles where id = v_user_id;
    user_balance := user_lifetime_ep - user_ep_spent;
    if user_balance < item_cost then return json_build_object('success', false, 'error', 'Not enough EP'); end if;
    update profiles set ep_spent = ep_spent + item_cost where id = v_user_id;
    insert into inventory (user_id, item_key) values (v_user_id, p_item_key);
    return json_build_object('success', true);
END;
 $$;

-- roll_die RPC is omitted here for brevity in the migration file,
-- but is assumed to be deployed via the dashboard as the latest version we built.

-- 7. SEED DATA (Shop & Achievements)
-- (Insert statements for 50 achievements and ~30 shop items go here)
