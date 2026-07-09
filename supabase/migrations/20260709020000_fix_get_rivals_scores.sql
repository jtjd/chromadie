CREATE OR REPLACE FUNCTION "public"."get_rivals_scores"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN '[]'::json;
    END IF;

    RETURN COALESCE(
        (
            SELECT json_agg(ranked.row_data ORDER BY ranked.score DESC)
            FROM (
                SELECT
                    s.score,
                    json_build_object(
                        'user_id', s.user_id,
                        'hex_code', s.hex_code,
                        'score', s.score,
                        'rarity', s.rarity,
                        'username', p.username,
                        'current_streak', p.current_streak,
                        'equipped_cosmetics', p.equipped_cosmetics
                    ) AS row_data
                FROM scores s
                JOIN profiles p ON s.user_id = p.id
                WHERE s.roll_date = CURRENT_DATE
                  AND s.user_id IN (
                      SELECT followee_id
                      FROM user_follows
                      WHERE follower_id = v_user_id
                  )
            ) ranked
        ),
        '[]'::json
    );
END;
 $$;


ALTER FUNCTION "public"."get_rivals_scores"() OWNER TO "postgres";
