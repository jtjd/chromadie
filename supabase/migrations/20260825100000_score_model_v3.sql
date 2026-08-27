-- Score model v3.
--
-- A roll still produces one server-authoritative RGB color. v3 changes only
-- the deterministic interpretation of that color: every triggered condition
-- contributes its full positive value, condition rarity is empirical metadata,
-- and roll rarity is assigned from the exhaustive RGB-space histogram.
BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_roll_v3(p_r integer, p_g integer, p_b integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_sum integer;
  v_max integer;
  v_min integer;
  v_range integer;
  v_hex text;
  v_hue numeric := 0;
  v_saturation numeric := 0;
  v_lightness numeric := 0;
  v_r numeric;
  v_g numeric;
  v_b numeric;
  v_max_n numeric;
  v_min_n numeric;
  v_delta numeric;
  v_family text;
  v_saturation_label text;
  v_lightness_label text;
  v_temperature text;
  v_structure text;
  v_even_channels integer;
  v_hex_letters integer;
  v_hex_digits integer;
  v_hex_digit_sum integer;
  v_base_condition_count integer;
  v_conditions jsonb := '[]'::jsonb;
  v_contributors jsonb := '[]'::jsonb;
  v_condition jsonb;
  v_awarded bigint;
  v_score bigint := 0;
  v_rarity text;
  v_traits jsonb;
  v_identity text;
BEGIN
  IF p_r IS NULL OR p_g IS NULL OR p_b IS NULL
     OR p_r NOT BETWEEN 0 AND 255
     OR p_g NOT BETWEEN 0 AND 255
     OR p_b NOT BETWEEN 0 AND 255 THEN
    RAISE EXCEPTION 'RGB channels must be integers from 0 to 255';
  END IF;

  v_sum := p_r + p_g + p_b;
  v_max := greatest(p_r, p_g, p_b);
  v_min := least(p_r, p_g, p_b);
  v_range := v_max - v_min;
  v_hex := upper(lpad(to_hex(p_r), 2, '0') || lpad(to_hex(p_g), 2, '0') || lpad(to_hex(p_b), 2, '0'));
  v_r := p_r::numeric;
  v_g := p_g::numeric;
  v_b := p_b::numeric;
  v_max_n := greatest(v_r, v_g, v_b);
  v_min_n := least(v_r, v_g, v_b);
  v_delta := v_max_n - v_min_n;
  v_lightness := ((v_max_n + v_min_n) / 510) * 100;

  IF v_delta <> 0 THEN
    IF v_max_n = v_r THEN
      v_hue := 60 * mod(((v_g - v_b) / v_delta), 6);
    ELSIF v_max_n = v_g THEN
      v_hue := 60 * (((v_b - v_r) / v_delta) + 2);
    ELSE
      v_hue := 60 * (((v_r - v_g) / v_delta) + 4);
    END IF;
    IF v_hue < 0 THEN v_hue := v_hue + 360; END IF;
    IF v_max_n + v_min_n <= 255 THEN
      v_saturation := (v_delta * 100) / NULLIF(v_max_n + v_min_n, 0);
    ELSE
      v_saturation := (v_delta * 100) / NULLIF(510 - v_max_n - v_min_n, 0);
    END IF;
  END IF;

  v_family := CASE
    WHEN v_saturation < 8 THEN 'Neutral'
    WHEN v_hue < 15 OR v_hue >= 345 THEN 'Crimson'
    WHEN v_hue < 45 THEN 'Amber'
    WHEN v_hue < 75 THEN 'Gold'
    WHEN v_hue < 105 THEN 'Lime'
    WHEN v_hue < 165 THEN 'Emerald'
    WHEN v_hue < 195 THEN 'Cyan'
    WHEN v_hue < 225 THEN 'Azure'
    WHEN v_hue < 255 THEN 'Blue'
    WHEN v_hue < 285 THEN 'Violet'
    WHEN v_hue < 315 THEN 'Magenta'
    ELSE 'Rose'
  END;
  v_saturation_label := CASE
    WHEN v_saturation >= 95 THEN 'Electric'
    WHEN v_saturation >= 70 THEN 'Vivid'
    WHEN v_saturation >= 40 THEN 'Rich'
    WHEN v_saturation >= 15 THEN 'Muted'
    ELSE 'Soft'
  END;
  v_lightness_label := CASE
    WHEN v_lightness < 15 THEN 'Shadow'
    WHEN v_lightness < 35 THEN 'Deep'
    WHEN v_lightness < 65 THEN 'Balanced'
    WHEN v_lightness < 85 THEN 'Bright'
    ELSE 'Luminous'
  END;
  v_temperature := CASE WHEN p_r = p_g AND p_g = p_b THEN 'Neutral' WHEN p_r >= p_b THEN 'Warm' ELSE 'Cool' END;
  v_structure := CASE WHEN v_range <= 20 THEN 'Smooth' WHEN v_range >= 205 THEN 'Polarized' ELSE 'Layered' END;
  v_even_channels := (CASE WHEN p_r % 2 = 0 THEN 1 ELSE 0 END)
    + (CASE WHEN p_g % 2 = 0 THEN 1 ELSE 0 END)
    + (CASE WHEN p_b % 2 = 0 THEN 1 ELSE 0 END);
  v_hex_letters := length(v_hex) - length(regexp_replace(v_hex, '[A-F]', '', 'g'));
  v_hex_digits := 6 - v_hex_letters;
  v_hex_digit_sum := floor(p_r / 16)::integer + mod(p_r, 16)
    + floor(p_g / 16)::integer + mod(p_g, 16)
    + floor(p_b / 16)::integer + mod(p_b, 16);
  v_traits := jsonb_build_array(
    jsonb_build_object('id', 'hue_' || lower(v_family), 'label', v_family || ' Hue', 'group', 'hue'),
    jsonb_build_object('id', 'saturation_' || lower(v_saturation_label), 'label', v_saturation_label || ' Saturation', 'group', 'saturation'),
    jsonb_build_object('id', 'lightness_' || lower(v_lightness_label), 'label', v_lightness_label || ' Lightness', 'group', 'lightness'),
    jsonb_build_object('id', 'temperature_' || lower(v_temperature), 'label', v_temperature || ' Temperature', 'group', 'temperature'),
    jsonb_build_object('id', 'structure_' || lower(v_structure), 'label', v_structure || ' Structure', 'group', 'structure')
  );
  v_identity := v_lightness_label || ' ' || v_saturation_label || ' ' || v_family;

  -- Every condition is positive and is added independently. conditionRarity is
  -- the empirical rarity of the condition itself, not the roll's final tier.
  v_conditions := v_conditions || jsonb_build_array(jsonb_build_object(
    'id', CASE WHEN v_sum % 2 = 0 THEN 'sum_even' ELSE 'sum_odd' END,
    'name', CASE WHEN v_sum % 2 = 0 THEN 'Even Pulse' ELSE 'Odd Pulse' END,
    'category', 'number_pattern',
    'points', CASE WHEN v_sum % 2 = 0 THEN 140 ELSE 150 END,
    'conditionRarity', 'Common'
  ));
  v_conditions := v_conditions || jsonb_build_array(jsonb_build_object(
    'id', 'hue_family_' || lower(v_family), 'name', v_family || ' Hue',
    'category', 'color_identity', 'points', 120,
    'conditionRarity', CASE WHEN v_family = 'Neutral' THEN 'Rare' WHEN v_family = 'Emerald' THEN 'Common' ELSE 'Uncommon' END
  ));
  v_conditions := v_conditions || jsonb_build_array(jsonb_build_object(
    'id', 'temperature_' || lower(v_temperature), 'name', v_temperature || ' Temperature',
    'category', 'color_identity', 'points', 120,
    'conditionRarity', CASE WHEN p_r = p_g AND p_g = p_b THEN 'Legendary' ELSE 'Common' END
  ));
  v_conditions := v_conditions || jsonb_build_array(jsonb_build_object(
    'id', CASE WHEN v_even_channels = 3 THEN 'even_channel_harmony' WHEN v_even_channels = 0 THEN 'odd_channel_rhythm' ELSE 'mixed_channel_rhythm' END,
    'name', CASE WHEN v_even_channels = 3 THEN 'Even Channel Harmony' WHEN v_even_channels = 0 THEN 'Odd Channel Rhythm' ELSE 'Mixed Channel Rhythm' END,
    'category', 'channel_identity', 'points', 150, 'conditionRarity', 'Common'
  ));

  IF is_prime(v_sum) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','prime_sum','name','Prime Energy','category','mathematical','points',2400,'conditionRarity','Common')); END IF;
  IF v_sum IN (0,1,2,3,5,8,13,21,34,55,89,144,233,377,610) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','fibonacci_sum','name','Fibonacci Energy','category','mathematical','points',3200,'conditionRarity','Rare')); END IF;
  IF v_sum % 3 = 0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','sum_divisible_3','name','Rule of Three','category','mathematical','points',900,'conditionRarity','Common')); END IF;
  IF v_sum % 5 = 0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','sum_divisible_5','name','Fivefold Sum','category','mathematical','points',1100,'conditionRarity','Common')); END IF;
  IF v_sum % 7 = 0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','sum_divisible_7','name','Lucky Sum','category','mathematical','points',1500,'conditionRarity','Common')); END IF;
  IF v_sum = 42 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','sum_42','name','Meaning of Life','category','rare_event','points',75000,'conditionRarity','Legendary')); END IF;
  IF v_sum = 100 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','sum_100','name','Perfect Century','category','rare_event','points',55000,'conditionRarity','Epic')); END IF;
  IF v_sum = 255 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','sum_255','name','Max Byte','category','rare_event','points',45000,'conditionRarity','Rare')); END IF;
  IF v_sum = 666 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','sum_666','name','Sinister Shade','category','rare_event','points',85000,'conditionRarity','Epic')); END IF;
  IF v_sum BETWEEN 300 AND 465 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','balanced_sum_band','name','Balanced Sum','category','sum_shape','points',700,'conditionRarity','Common')); END IF;

  IF v_range >= 205 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','high_contrast','name','Polarized Channels','category','color_relationship','points',4200,'conditionRarity','Common')); END IF;
  IF v_range <= 20 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','low_contrast','name','Close Harmony','category','color_relationship','points',2900,'conditionRarity','Uncommon')); END IF;
  IF v_range > 20 AND v_range < 80 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','gentle_contrast','name','Gentle Contrast','category','color_relationship','points',1900,'conditionRarity','Common')); END IF;
  IF v_range >= 80 AND v_range < 205 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','layered_contrast','name','Layered Contrast','category','color_relationship','points',2400,'conditionRarity','Common')); END IF;
  IF v_max > 210 AND v_min > 120 AND v_range < 75 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pastel','name','Pastel Bloom','category','color_relationship','points',4500,'conditionRarity','Uncommon')); END IF;
  IF v_max > 220 AND v_min < 45 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','neon','name','Neon Voltage','category','color_relationship','points',5200,'conditionRarity','Common')); END IF;
  IF v_lightness >= 90 AND v_saturation <= 20 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','luminous_core','name','Luminous Core','category','color_relationship','points',9000,'conditionRarity','Epic')); END IF;
  IF v_max + v_min >= 235 AND v_range >= 120 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','complementary_balance','name','Complementary Balance','category','color_relationship','points',3200,'conditionRarity','Common')); END IF;
  IF p_r >= p_g AND p_g >= p_b AND p_r > p_b THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','warm_bias','name','Warm Bias','category','color_relationship','points',1800,'conditionRarity','Common')); END IF;
  IF p_b >= p_g AND p_g >= p_r AND p_b > p_r THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','cool_bias','name','Cool Bias','category','color_relationship','points',1800,'conditionRarity','Common')); END IF;

  IF v_saturation >= 70 AND v_range >= 120 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','vivid_contrast','name','Vivid Contrast','category','color_signature','points',3700,'conditionRarity','Common')); END IF;
  IF v_lightness < 20 OR v_lightness >= 80 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','edge_luminance','name','Edge Luminance','category','color_signature','points',2300,'conditionRarity','Uncommon')); END IF;
  IF v_range >= 170 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','channel_span','name','Wide Channel Span','category','color_signature','points',3000,'conditionRarity','Common')); END IF;
  IF v_hex_letters >= 3 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','hex_letter_rich','name','Letter-Rich Hex','category','hex_signature','points',1400,'conditionRarity','Common')); END IF;
  IF v_hex_digits >= 4 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','hex_digit_rich','name','Digit-Rich Hex','category','hex_signature','points',1300,'conditionRarity','Common')); END IF;
  IF is_prime(v_hex_digit_sum) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','hex_digit_prime','name','Prime Hex Sum','category','hex_signature','points',1600,'conditionRarity','Common')); END IF;
  IF v_min <= 8 OR v_max >= 247 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','channel_edge','name','Edge Channel','category','edge_behavior','points',1500,'conditionRarity','Common')); END IF;
  IF ((CASE WHEN p_r <= 8 OR p_r >= 247 THEN 1 ELSE 0 END) + (CASE WHEN p_g <= 8 OR p_g >= 247 THEN 1 ELSE 0 END) + (CASE WHEN p_b <= 8 OR p_b >= 247 THEN 1 ELSE 0 END)) >= 2 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','edge_pair','name','Edge Pair','category','edge_behavior','points',9500,'conditionRarity','Uncommon')); END IF;
  IF v_range >= 230 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','extreme_span','name','Extreme Span','category','edge_behavior','points',4000,'conditionRarity','Uncommon')); END IF;
  IF p_r = p_b THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','mirror_channels','name','Mirror Channels','category','symmetry','points',7000,'conditionRarity','Rare')); END IF;
  IF v_hex ~ '(.)\1' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','hex_echo','name','Hex Echo','category','hex_signature','points',2500,'conditionRarity','Common')); END IF;
  IF substr(v_hex, 1, 1) = substr(v_hex, 6, 1) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','hex_bookends','name','Hex Bookends','category','hex_signature','points',4500,'conditionRarity','Uncommon')); END IF;
  IF v_even_channels = 0 OR v_even_channels = 3 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','channel_parity_lock','name','Parity Lock','category','channel_identity','points',1200,'conditionRarity','Common')); END IF;

  IF least(p_r,p_g,p_b) <= 10
     AND (p_r + p_g + p_b - least(p_r,p_g,p_b) - greatest(p_r,p_g,p_b)) BETWEEN 110 AND 145
     AND greatest(p_r,p_g,p_b) >= 245 THEN
    v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','triple_crown','name','Triple Crown','category','rare_event','points',175000,'conditionRarity','Rare'));
  END IF;

  IF v_saturation >= 95 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','saturation_spike','name','Saturation Spike','category','saturation','points',4500,'conditionRarity','Common')); END IF;
  IF v_saturation >= 70 AND v_saturation < 95 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','vivid_saturation','name','Vivid Saturation','category','saturation','points',3300,'conditionRarity','Common')); END IF;
  IF v_saturation >= 40 AND v_saturation < 70 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','rich_saturation','name','Rich Saturation','category','saturation','points',2300,'conditionRarity','Common')); END IF;
  IF v_saturation >= 15 AND v_saturation < 40 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','muted_saturation','name','Muted Saturation','category','saturation','points',1400,'conditionRarity','Common')); END IF;
  IF v_saturation < 15 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','soft_saturation','name','Soft Saturation','category','saturation','points',900,'conditionRarity','Uncommon')); END IF;
  IF v_saturation >= 80 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','high_chroma','name','High Chroma','category','saturation','points',2100,'conditionRarity','Common')); END IF;
  IF v_lightness >= 70 AND v_saturation >= 55 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','luminous_saturation','name','Luminous Saturation','category','saturation','points',4500,'conditionRarity','Uncommon')); END IF;
  IF v_lightness <= 30 AND v_saturation >= 55 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','shadow_saturation','name','Shadow Saturation','category','saturation','points',4300,'conditionRarity','Uncommon')); END IF;

  IF v_lightness < 15 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','shadow_tone','name','Shadow Tone','category','tone','points',4500,'conditionRarity','Uncommon')); END IF;
  IF v_lightness >= 15 AND v_lightness < 35 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','deep_tone','name','Deep Tone','category','tone','points',2400,'conditionRarity','Common')); END IF;
  IF v_lightness >= 35 AND v_lightness < 65 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','balanced_tone','name','Balanced Tone','category','tone','points',1400,'conditionRarity','Common')); END IF;
  IF v_lightness >= 65 AND v_lightness < 85 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','bright_tone','name','Bright Tone','category','tone','points',2400,'conditionRarity','Common')); END IF;
  IF v_lightness >= 85 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','luminous_tone','name','Luminous Tone','category','tone','points',4500,'conditionRarity','Uncommon')); END IF;
  IF v_lightness < 10 OR v_lightness > 90 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','tone_edge','name','Tone Edge','category','tone','points',3500,'conditionRarity','Rare')); END IF;

  IF (p_r > p_g AND p_r > p_b) AND v_range >= 30 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','red_dominant','name','Red Dominant','category','composition','points',2500,'conditionRarity','Common')); END IF;
  IF (p_g > p_r AND p_g > p_b) AND v_range >= 30 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','green_dominant','name','Green Dominant','category','composition','points',2500,'conditionRarity','Common')); END IF;
  IF (p_b > p_r AND p_b > p_g) AND v_range >= 30 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','blue_dominant','name','Blue Dominant','category','composition','points',2500,'conditionRarity','Common')); END IF;
  IF NOT ((p_r > p_g AND p_r > p_b) OR (p_g > p_r AND p_g > p_b) OR (p_b > p_r AND p_b > p_g)) OR v_range < 30 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','balanced_channels','name','Balanced Channels','category','composition','points',1800,'conditionRarity','Uncommon')); END IF;
  IF p_r < p_g AND p_g < p_b THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','ascending_channels','name','Ascending Channels','category','composition','points',3600,'conditionRarity','Common')); END IF;
  IF p_r > p_g AND p_g > p_b THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','descending_channels','name','Descending Channels','category','composition','points',3600,'conditionRarity','Common')); END IF;
  IF p_r = p_g OR p_g = p_b OR p_r = p_b THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','channel_pair','name','Channel Pair','category','symmetry','points',8000,'conditionRarity','Uncommon')); END IF;
  IF p_r = p_g AND p_g = p_b THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','greyscale','name','Perfect Greyscale','category','structure','points',40000,'conditionRarity','Legendary')); END IF;
  IF p_r IN (0,51,102,153,204,255) AND p_g IN (0,51,102,153,204,255) AND p_b IN (0,51,102,153,204,255) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','web_safe','name','Web Safe','category','structure','points',22000,'conditionRarity','Legendary')); END IF;
  IF p_r % 2 = 0 AND p_g % 2 = 0 AND p_b % 2 = 0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','all_channels_even','name','All Even Channels','category','channel_identity','points',3500,'conditionRarity','Common')); END IF;
  IF p_r % 2 <> 0 AND p_g % 2 <> 0 AND p_b % 2 <> 0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','all_channels_odd','name','All Odd Channels','category','channel_identity','points',3500,'conditionRarity','Common')); END IF;

  IF v_hex = reverse(v_hex) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','palindrome','name','Hex Palindrome','category','hex_pattern','points',120000,'conditionRarity','Epic')); END IF;
  IF substr(v_hex,1,2) = substr(v_hex,3,2) AND substr(v_hex,3,2) = substr(v_hex,5,2) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','repeated_pair','name','Repeated Pair','category','hex_pattern','points',100000,'conditionRarity','Legendary')); END IF;
  IF v_hex ~ '(.)\1\1' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','triple_hex','name','Triple Hex','category','hex_pattern','points',45000,'conditionRarity','Uncommon')); END IF;
  IF v_hex LIKE '%F1%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','f1','name','F1','category','hex_pattern','points',30000,'conditionRarity','Uncommon')); END IF;
  IF v_hex IN ('012345','123456','234567','345678','456789','56789A','6789AB','789ABC','89ABCD','9ABCDE','ABCDEF','FEDCBA','EDCBA9','DCBA98','CBA987','BA9876','A98765','987654') THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','hex_staircase','name','Hex Staircase','category','hex_pattern','points',100000,'conditionRarity','Anomaly')); END IF;
  IF v_hex ~ '[A-F]{3}' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','hex_letter_run','name','Letter Run','category','hex_pattern','points',15000,'conditionRarity','Common')); END IF;
  IF v_hex ~ '[0-9]{3}' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','hex_digit_run','name','Digit Run','category','hex_pattern','points',14000,'conditionRarity','Common')); END IF;

  IF v_hex LIKE '%DEAD%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','dead','name','DEAD','category','hex_culture','points',180000,'conditionRarity','Legendary')); END IF;
  IF v_hex LIKE '%BEEF%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','beef','name','BEEF','category','hex_culture','points',165000,'conditionRarity','Legendary')); END IF;
  IF v_hex LIKE '%CAFE%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','cafe','name','CAFE','category','hex_culture','points',150000,'conditionRarity','Legendary')); END IF;
  IF v_hex LIKE '%FACE%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','face','name','FACE','category','hex_culture','points',150000,'conditionRarity','Legendary')); END IF;
  IF v_hex LIKE '%FADE%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','fade','name','FADE','category','hex_culture','points',140000,'conditionRarity','Legendary')); END IF;
  IF v_hex LIKE '%FEED%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','feed','name','FEED','category','hex_culture','points',180000,'conditionRarity','Legendary')); END IF;
  IF v_hex LIKE '%F00D%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','food','name','F00D','category','hex_culture','points',160000,'conditionRarity','Legendary')); END IF;
  IF v_hex LIKE '%1337%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','leet','name','1337','category','hex_culture','points',220000,'conditionRarity','Legendary')); END IF;
  IF v_hex LIKE '%007%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','james_bond','name','007','category','hex_culture','points',90000,'conditionRarity','Epic')); END IF;
  IF v_hex LIKE '%420%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','blaze_it','name','420','category','hex_culture','points',70000,'conditionRarity','Epic')); END IF;
  IF v_hex LIKE '%BABE%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','babe','name','BABE','category','hex_culture','points',95000,'conditionRarity','Legendary')); END IF;
  IF v_hex LIKE '%B00B%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','boob','name','B00B','category','hex_culture','points',95000,'conditionRarity','Legendary')); END IF;
  IF v_hex LIKE '%D00D%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','dood','name','D00D','category','hex_culture','points',75000,'conditionRarity','Legendary')); END IF;
  IF v_hex LIKE '%69%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','nice','name','69','category','hex_culture','points',35000,'conditionRarity','Uncommon')); END IF;
  IF v_hex LIKE '%666%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','demon','name','666','category','hex_culture','points',80000,'conditionRarity','Epic')); END IF;
  IF v_hex LIKE '%777%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','jackpot','name','777','category','hex_culture','points',90000,'conditionRarity','Epic')); END IF;
  IF v_hex LIKE '%404%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','not_found','name','404','category','hex_culture','points',55000,'conditionRarity','Epic')); END IF;
  IF v_hex LIKE '%500%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','server_error','name','500','category','hex_culture','points',60000,'conditionRarity','Epic')); END IF;
  IF v_hex LIKE '%100%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','perfect_score','name','100','category','hex_culture','points',80000,'conditionRarity','Epic')); END IF;
  IF v_hex LIKE '%ABCD%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','abcd','name','ABCD','category','hex_culture','points',65000,'conditionRarity','Legendary')); END IF;

  v_base_condition_count := jsonb_array_length(v_conditions);
  IF v_base_condition_count >= 14 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','condition_cascade','name','Condition Cascade','category','cascade','points',3000,'conditionRarity','Common')); END IF;
  IF v_base_condition_count >= 18 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','condition_storm','name','Condition Storm','category','cascade','points',20000,'conditionRarity','Common')); END IF;
  IF v_base_condition_count >= 22 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','condition_constellation','name','Condition Constellation','category','cascade','points',100000,'conditionRarity','Uncommon')); END IF;

  IF p_r = 0 AND p_g = 0 AND p_b = 0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_black','name','The Void','category','special_event','points',100000000,'conditionRarity','Anomaly')); END IF;
  IF p_r = 255 AND p_g = 255 AND p_b = 255 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_white','name','The Light','category','special_event','points',100000000,'conditionRarity','Anomaly')); END IF;
  IF p_r = 255 AND p_g = 0 AND p_b = 0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_red','name','Maximum Red','category','special_event','points',18000000,'conditionRarity','Anomaly')); END IF;
  IF p_r = 0 AND p_g = 255 AND p_b = 0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_green','name','Maximum Green','category','special_event','points',18000000,'conditionRarity','Anomaly')); END IF;
  IF p_r = 0 AND p_g = 0 AND p_b = 255 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_blue','name','Maximum Blue','category','special_event','points',18000000,'conditionRarity','Anomaly')); END IF;
  IF p_r = 0 AND p_g = 255 AND p_b = 255 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_cyan','name','Maximum Cyan','category','special_event','points',16000000,'conditionRarity','Anomaly')); END IF;
  IF p_r = 255 AND p_g = 0 AND p_b = 255 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_magenta','name','Maximum Magenta','category','special_event','points',16000000,'conditionRarity','Anomaly')); END IF;
  IF p_r = 255 AND p_g = 255 AND p_b = 0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_yellow','name','Maximum Yellow','category','special_event','points',16000000,'conditionRarity','Anomaly')); END IF;
  IF p_r = 255 AND p_g = 215 AND p_b = 0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_gold','name','Midas','category','special_event','points',30000000,'conditionRarity','Anomaly')); END IF;
  IF p_r = 145 AND p_g = 70 AND p_b = 255 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','streamer_purple','name','Streamer Purple','category','special_event','points',20000000,'conditionRarity','Anomaly')); END IF;
  IF p_r = 30 AND p_g = 215 AND p_b = 96 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','audio_stream_green','name','Audio Stream Green','category','special_event','points',20000000,'conditionRarity','Anomaly')); END IF;
  IF p_r = 244 AND p_g = 0 AND p_b = 9 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','classic_cola_red','name','Classic Cola Red','category','special_event','points',20000000,'conditionRarity','Anomaly')); END IF;
  IF v_hex = '123456' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','reference_123456','name','Reference Sequence','category','special_event','points',30000000,'conditionRarity','Anomaly')); END IF;
  IF v_hex = 'ABCDEF' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','reference_abcdef','name','Alphabetic Gradient','category','special_event','points',30000000,'conditionRarity','Anomaly')); END IF;
  IF v_hex = 'FEDCBA' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','reference_fedcba','name','Reverse Gradient','category','special_event','points',30000000,'conditionRarity','Anomaly')); END IF;

  FOR v_condition IN SELECT value FROM jsonb_array_elements(v_conditions) AS condition(value) LOOP
    v_awarded := (v_condition->>'points')::bigint;
    v_score := v_score + v_awarded;
    v_contributors := v_contributors || jsonb_build_array(
      v_condition || jsonb_build_object('awardedPoints', v_awarded, 'multiplier', 1)
    );
  END LOOP;

  SELECT COALESCE(
    jsonb_agg(value ORDER BY (value->>'awardedPoints')::bigint DESC, value->>'id' ASC),
    '[]'::jsonb
  ) INTO v_contributors
  FROM jsonb_array_elements(v_contributors) AS contributor(value);

  v_rarity := CASE
    WHEN v_score >= 313230 THEN 'Anomaly'
    WHEN v_score >= 212130 THEN 'Legendary'
    WHEN v_score >= 73530 THEN 'Epic'
    WHEN v_score >= 47530 THEN 'Rare'
    WHEN v_score >= 35930 THEN 'Uncommon'
    WHEN v_score >= 11130 THEN 'Common'
    ELSE 'Trash'
  END;

  RETURN jsonb_build_object(
    'scoreVersion', 3,
    'score_version', 3,
    'score', v_score,
    'rarity', v_rarity,
    'conditions', v_conditions,
    'conditionIds', COALESCE((SELECT jsonb_agg(value->>'id') FROM jsonb_array_elements(v_conditions) AS condition(value)), '[]'::jsonb),
    'contributors', v_contributors,
    'traits', v_traits,
    'identity', v_identity
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.calculate_roll_v3(integer, integer, integer) FROM PUBLIC, anon, authenticated, service_role;

-- Switch only the authoritative scoring call and stored version. The layered
-- audited/progression wrappers remain intact, so transaction and reward
-- behavior does not move into the client.
DO $patch_roll_v3$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.roll_die_impl_pre_audit(boolean)'::regprocedure)
  INTO v_definition;

  IF position('public.calculate_roll_v2(' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'roll_die_impl_pre_audit no longer exposes the expected scoring call';
  END IF;

  v_definition := replace(v_definition, 'public.calculate_roll_v2(', 'public.calculate_roll_v3(');
  v_definition := replace(v_definition, 'score_version = 2', 'score_version = 3');
  v_definition := replace(
    v_definition,
    'VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, public.game_utc_date(), ''[]''::jsonb, 2);',
    'VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, public.game_utc_date(), ''[]''::jsonb, 3);'
  );
  v_definition := replace(v_definition, '''rarity_anomaly'', v_rarity = ''Anomaly''', '''rarity_anomaly'', v_rarity = ''Legendary''');
  v_definition := replace(v_definition, '''mythic_roll'', v_rarity = ''Mythic''', '''mythic_roll'', v_rarity = ''Anomaly''');
  EXECUTE v_definition;
END;
$patch_roll_v3$;

-- The stable achievement IDs survive the migration; their descriptions follow
-- the new active names and their progression pacing follows the measured bands.
UPDATE public.progression_milestones
SET sort_order = 10,
    expected_rolls = 6
WHERE id = 'journey_roll_prime';

UPDATE public.progression_milestones
SET sort_order = 20,
    expected_rolls = 7
WHERE id = 'journey_rarity_rare';

UPDATE public.progression_milestones
SET sort_order = 30,
    expected_rolls = 10
WHERE id = 'journey_high_contrast';

UPDATE public.progression_milestones
SET sort_order = 40,
    expected_rolls = 10
WHERE id = 'journey_rarity_epic';

UPDATE public.achievements
SET name = 'Legendary Detected',
    description = 'Roll a Legendary color.',
    icon = '🟠'
WHERE id = 'rarity_anomaly' AND season_id IS NULL;

UPDATE public.achievements
SET name = 'Anomaly Touch',
    description = 'Roll an Anomaly color.',
    icon = '✺'
WHERE id = 'mythic_roll' AND season_id IS NULL;

UPDATE public.progression_milestones
SET name = 'Legendary color',
    description = 'Roll a Legendary color.',
    expected_rolls = 333,
    sort_order = 50,
    pace_band = 'years'
WHERE id = 'journey_rarity_anomaly';

UPDATE public.progression_milestones
SET name = 'Anomaly color',
    description = 'Roll the rarest active color tier.',
    expected_rolls = 1000,
    sort_order = 60,
    pace_band = 'years'
WHERE id = 'journey_mythic';

-- Rewrite v2 labels once, without recomputing historical scores or condition
-- evidence. A single CASE is important: both directions are simultaneous.
UPDATE public.scores
SET rarity = CASE rarity
  WHEN 'Mythic' THEN 'Anomaly'
  WHEN 'Anomaly' THEN 'Legendary'
  ELSE rarity
END
WHERE score_version < 3 AND rarity IN ('Mythic', 'Anomaly');

UPDATE public.user_roll_best_candidates
SET rarity = CASE rarity
  WHEN 'Mythic' THEN 'Anomaly'
  WHEN 'Anomaly' THEN 'Legendary'
  ELSE rarity
END
WHERE rarity IN ('Mythic', 'Anomaly');

UPDATE public.profiles
SET best_roll_rarity = CASE best_roll_rarity
  WHEN 'Mythic' THEN 'Anomaly'
  WHEN 'Anomaly' THEN 'Legendary'
  ELSE best_roll_rarity
END
WHERE best_roll_rarity IN ('Mythic', 'Anomaly');

UPDATE public.profile_events
SET payload = jsonb_set(
  payload,
  '{rarity}',
  to_jsonb(CASE payload->>'rarity'
    WHEN 'Mythic' THEN 'Anomaly'
    WHEN 'Anomaly' THEN 'Legendary'
    ELSE payload->>'rarity'
  END),
  true
)
WHERE event_type = 'roll'
  AND payload->>'rarity' IN ('Mythic', 'Anomaly');

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_best_roll_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_best_roll_check CHECK (
  (best_roll_score IS NULL AND best_roll_hex IS NULL AND best_roll_rarity IS NULL)
  OR (
    best_roll_score >= 0
    AND best_roll_hex ~ '^#[0-9A-F]{6}$'
    AND best_roll_rarity IN ('Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Anomaly', 'Mythic')
  )
);

ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS scores_authoritative_value_check;
ALTER TABLE public.scores ADD CONSTRAINT scores_authoritative_value_check CHECK (
  score >= 0
  AND hex_code ~ '^#[0-9A-F]{6}$'
  AND rarity IN ('Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Anomaly', 'Mythic')
  AND score_version > 0
  AND jsonb_typeof(condition_ids) = 'array' AND jsonb_array_length(condition_ids) <= 80
  AND jsonb_typeof(contributors) = 'array' AND jsonb_array_length(contributors) <= 64
  AND jsonb_typeof(traits) = 'array' AND jsonb_array_length(traits) <= 12
  AND char_length(identity) <= 120
);

COMMIT;
