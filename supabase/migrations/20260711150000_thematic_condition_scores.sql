-- Give condition rewards memorable values while preserving launch distribution.

DO $$
DECLARE
  v_definition text;
  v_entry record;
  v_values jsonb := '{
    "prime_sum":15013,"fibonacci_sum":25021,"sum_42":150042,"sum_100":100100,
    "sum_255":75255,"sum_666":250666,"high_contrast":18205,"low_contrast":12020,
    "gentle_contrast":3021,"layered_contrast":6080,"pastel":25210,"neon":30220,
    "luminous_core":40090,"triple_crown":175003,"saturation_spike":20095,
    "vivid_saturation":12070,"rich_saturation":7040,"muted_saturation":3015,
    "soft_saturation":1008,"shadow_tone":15015,"deep_tone":7035,"balanced_tone":3050,
    "bright_tone":7065,"luminous_tone":15085,"red_dominant":4777,"green_dominant":4777,
    "blue_dominant":4777,"balanced_channels":2888,"greyscale":75256,"web_safe":50216,
    "palindrome":175571,"repeated_pair":150222,"triple_hex":90333,"f1":75001,
    "dead":307005,"beef":298879,"cafe":251966,"face":264206,"fade":224222,
    "feed":265261,"food":226453,"leet":251337,"james_bond":100007,"blaze_it":75420,
    "pure_black":1677721,"pure_white":1677721,"pure_red":750255,"pure_green":750255,
    "pure_blue":750255,"pure_gold":1500079,"streamer_purple":1014570,
    "audio_stream_green":1030215,"classic_cola_red":1024409
  }'::jsonb;
BEGIN
  SELECT pg_get_functiondef('public.calculate_roll_v2(integer,integer,integer)'::regprocedure)
  INTO v_definition;

  FOR v_entry IN SELECT key, value FROM jsonb_each_text(v_values) LOOP
    v_definition := regexp_replace(
      v_definition,
      '(''id'',''' || v_entry.key || '''[^[:cntrl:]]*''points'',)[0-9]+',
      E'\\1' || v_entry.value,
      'g'
    );
  END LOOP;

  v_definition := replace(v_definition, 'WHEN v_score >= 50000 THEN ''Rare''', 'WHEN v_score >= 49500 THEN ''Rare''');
  v_definition := replace(v_definition, 'WHEN v_score >= 35000 THEN ''Uncommon''', 'WHEN v_score >= 34500 THEN ''Uncommon''');

  EXECUTE v_definition;
END;
$$;
