-- == TABLES ==

-- profiles table schema
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    email TEXT,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    ep_spent BIGINT DEFAULT 0,
    lifetime_ep BIGINT DEFAULT 0, -- Added for free-tier optimization
    equipped_cosmetics JSONB DEFAULT '{}'::jsonb
);

-- scores table schema
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

-- inventory table schema
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    item_key TEXT,
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- shop_items table schema
CREATE TABLE IF NOT EXISTS shop_items (
    item_key TEXT PRIMARY KEY,
    name TEXT,
    slot TEXT,
    cost BIGINT,
    css_type TEXT,
    css_value TEXT
);

-- == RPCs ==

-- Secure wallet balance calculation
CREATE OR REPLACE FUNCTION get_wallet_balance()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ DECLARE
    p_user_id UUID := auth.uid();
    v_lifetime_ep BIGINT;
    v_spent_ep BIGINT;
BEGIN
    IF p_user_id IS NULL THEN RETURN 0; END IF;
    SELECT COALESCE(p.lifetime_ep, 0) INTO v_lifetime_ep FROM profiles p WHERE p.id = p_user_id;
    SELECT COALESCE(p.ep_spent, 0) INTO v_spent_ep FROM profiles p WHERE p.id = p_user_id;
    RETURN v_lifetime_ep - v_spent_ep;
END;
 $$;

-- Percentile calculation
CREATE OR REPLACE FUNCTION get_score_percentile(p_score BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ DECLARE
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
 $$;
