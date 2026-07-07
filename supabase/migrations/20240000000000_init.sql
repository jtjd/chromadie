-- ==========================================
-- 1. TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    email TEXT,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    ep_spent BIGINT DEFAULT 0,
    lifetime_ep BIGINT DEFAULT 0,
    equipped_cosmetics JSONB DEFAULT '{}'::jsonb
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
    css_value TEXT
);

-- FIX: Add the missing unique constraint to prevent double-rolls
ALTER TABLE scores DROP CONSTRAINT IF EXISTS unique_daily_roll;
ALTER TABLE scores ADD CONSTRAINT unique_daily_roll UNIQUE (user_id, roll_date);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
-- FIX: Removed the "Users can update own profile" policy to prevent RPC bypasses
DROP POLICY IF EXISTS "Scores are viewable by everyone." ON scores;
DROP POLICY IF EXISTS "Users can view own inventory." ON inventory;
DROP POLICY IF EXISTS "Shop items are viewable by everyone." ON shop_items;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Scores are viewable by everyone." ON scores FOR SELECT USING (true);
CREATE POLICY "Users can view own inventory." ON inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Shop items are viewable by everyone." ON shop_items FOR SELECT USING (true);

-- ==========================================
-- 3. TRIGGERS (Profile Creation)
-- ==========================================

-- FIX: Add the trigger that creates a profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$ BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.email);
  RETURN new;
END;
 $function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_lifetime_ep()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$ BEGIN
    UPDATE profiles
    SET lifetime_ep = COALESCE(lifetime_ep, 0) + NEW.score
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
 $function$;

DROP TRIGGER IF EXISTS on_score_insert ON scores;
CREATE TRIGGER on_score_insert
AFTER INSERT ON scores
FOR EACH ROW
EXECUTE FUNCTION public.update_lifetime_ep();

-- ==========================================
-- 4. SECURE RPCs
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_wallet_balance()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$ DECLARE
    p_user_id UUID := auth.uid();
    v_lifetime_ep BIGINT;
    v_spent_ep BIGINT;
BEGIN
    IF p_user_id IS NULL THEN RETURN 0; END IF;
    SELECT COALESCE(p.lifetime_ep, 0) INTO v_lifetime_ep FROM profiles p WHERE p.id = p_user_id;
    SELECT COALESCE(p.ep_spent, 0) INTO v_spent_ep FROM profiles p WHERE p.id = p_user_id;
    RETURN v_lifetime_ep - v_spent_ep;
END;
 $function$;

CREATE OR REPLACE FUNCTION public.get_score_percentile(p_score BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$ DECLARE
    v_total BIGINT;
    v_better BIGINT;
    v_percentile NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total FROM scores WHERE roll_date = CURRENT_DATE;
    IF v_total = 0 THEN RETURN json_build_object('total_rollers', 0, 'percentile', 100); END IF;
    SELECT COUNT(*) INTO v_better FROM scores WHERE roll_date = CURRENT_DATE AND score > p_score;
    v_percentile := ((v_total - v_better)::NUMERIC / v_total) * 100;
    RETURN json_build_object('total_rollers', v_total, 'percentile', v_percentile);
END;
 $function$;

CREATE OR REPLACE FUNCTION public.equip_item(p_item_key text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$ declare
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
 $function$;

-- FIX: Removed the get_email_by_username RPC to eliminate the PII harvesting oracle.

CREATE OR REPLACE FUNCTION public.purchase_item(p_item_key text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$ declare
    v_user_id uuid := auth.uid();
    item_cost bigint;
    user_ep_spent bigint;
    user_lifetime_ep bigint;
    user_balance bigint;
    already_owned boolean;
begin
    if v_user_id is null then return json_build_object('success', false, 'error', 'Not authenticated'); end if;

    select cost into item_cost from shop_items where item_key = p_item_key;
    if item_cost is null then return json_build_object('success', false, 'error', 'Invalid item'); end if;

    select exists(select 1 from inventory where user_id = v_user_id and item_key = p_item_key) into already_owned;
    if already_owned then return json_build_object('success', false, 'error', 'Already owned'); end if;

    select ep_spent into user_ep_spent from profiles where id = v_user_id;
    select coalesce(sum(score), 0) into user_lifetime_ep from scores where user_id = v_user_id;
    user_balance := user_lifetime_ep - user_ep_spent;

    if user_balance < item_cost then return json_build_object('success', false, 'error', 'Not enough EP'); end if;

    update profiles set ep_spent = ep_spent + item_cost where id = v_user_id;
    insert into inventory (user_id, item_key) values (v_user_id, p_item_key);

    return json_build_object('success', true);
end;
 $function$;

CREATE OR REPLACE FUNCTION public.roll_die()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$ DECLARE
    v_r INT; v_g INT; v_b INT; v_hex TEXT; v_hex_upper TEXT; v_hex_no_hash TEXT;
    v_total_score BIGINT := 0; v_badges JSONB := '[]'::jsonb; v_rarity TEXT;
    v_user_id UUID := auth.uid(); v_existing_roll RECORD;
    v_sum INT; v_max INT; v_min INT; v_range INT;
    v_total_count INT; v_higher_count INT; v_percentile NUMERIC;
BEGIN
    -- 1. Generate random hex server-side FIRST
    v_r := floor(random() * 256); v_g := floor(random() * 256); v_b := floor(random() * 256);
    v_hex := '#' || lpad(to_hex(v_r), 2, '0') || lpad(to_hex(v_g), 2, '0') || lpad(to_hex(v_b), 2, '0');
    v_hex_upper := upper(v_hex); v_hex_no_hash := substr(v_hex_upper, 2);
    v_sum := v_r + v_g + v_b; v_max := greatest(v_r,v_g,v_b); v_min := least(v_r,v_g,v_b); v_range := v_max - v_min;

    -- 2. Run all 100 checks
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

    IF v_total_score >= 5000000 THEN v_rarity := 'Mythic';
    ELSIF v_total_score >= 1000000 THEN v_rarity := 'Anomaly';
    ELSIF v_total_score >= 250000 THEN v_rarity := 'Epic';
    ELSIF v_total_score >= 50000 THEN v_rarity := 'Rare';
    ELSIF v_total_score >= 10000 THEN v_rarity := 'Uncommon';
    ELSIF v_total_score >= 1500 THEN v_rarity := 'Common';
    ELSE v_rarity := 'Trash';
    END IF;

    -- 3. ANON CHECK: If not logged in, return the roll without saving to DB
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', true, 'already_rolled', false, 'is_anon', true,
            'hex', v_hex_upper, 'r', v_r, 'g', v_g, 'b', v_b,
            'score', v_total_score, 'rarity', v_rarity, 'badges', v_badges
        );
    END IF;

    -- 4. AUTHENTICATED USER LOGIC
    SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
    IF FOUND THEN
        SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = CURRENT_DATE;
        SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = CURRENT_DATE AND score > v_existing_roll.score;
        v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::FLOAT / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;
        RETURN json_build_object('success', true, 'already_rolled', true, 'is_anon', false, 'hex', v_existing_roll.hex_code, 'score', v_existing_roll.score, 'rarity', v_existing_roll.rarity, 'badges', v_existing_roll.badges, 'percentile', v_percentile, 'total_rollers', v_total_count);
    END IF;

    BEGIN
        INSERT INTO scores (user_id, hex_code, score, rarity, roll_date, badges)
        VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, CURRENT_DATE, v_badges);
    EXCEPTION WHEN unique_violation THEN
        SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = CURRENT_DATE;
        RETURN json_build_object('success', true, 'already_rolled', true, 'is_anon', false, 'hex', v_existing_roll.hex_code, 'score', v_existing_roll.score, 'rarity', v_existing_roll.rarity, 'badges', v_existing_roll.badges);
    END;

    SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = CURRENT_DATE;
    SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = CURRENT_DATE AND score > v_total_score;
    v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::FLOAT / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;

    RETURN json_build_object('success', true, 'already_rolled', false, 'is_anon', false, 'hex', v_hex_upper, 'r', v_r, 'g', v_g, 'b', v_b, 'score', v_total_score, 'rarity', v_rarity, 'badges', v_badges, 'percentile', v_percentile, 'total_rollers', v_total_count);
END;
 $function$;

CREATE OR REPLACE FUNCTION public.unequip_item(p_slot text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$ declare
    v_user_id uuid := auth.uid();
    v_current_cosmetics jsonb;
begin
    if v_user_id is null then return json_build_object('success', false, 'error', 'Not authenticated'); end if;
    if p_slot not in ('name_effect', 'frame', 'title') then
        return json_build_object('success', false, 'error', 'Invalid slot');
    end if;

    select equipped_cosmetics into v_current_cosmetics from profiles where id = v_user_id;
    if v_current_cosmetics is null then v_current_cosmetics := '{}'::jsonb; end if;

    v_current_cosmetics := v_current_cosmetics - p_slot;
    update profiles set equipped_cosmetics = v_current_cosmetics where id = v_user_id;

    return json_build_object('success', true, 'cosmetics', v_current_cosmetics);
end;
 $function$;
