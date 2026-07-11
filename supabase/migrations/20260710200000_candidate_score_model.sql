-- Candidate launch scoring model. The guarded roll transaction will consume this
-- function in a follow-up migration after parity checks pass.
CREATE OR REPLACE FUNCTION public.calculate_roll_v2(p_r integer, p_g integer, p_b integer)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_sum integer := p_r + p_g + p_b;
  v_max integer := greatest(p_r, p_g, p_b);
  v_min integer := least(p_r, p_g, p_b);
  v_range integer := greatest(p_r, p_g, p_b) - least(p_r, p_g, p_b);
  v_hex text := upper(lpad(to_hex(p_r), 2, '0') || lpad(to_hex(p_g), 2, '0') || lpad(to_hex(p_b), 2, '0'));
  v_hue numeric := 0;
  v_saturation numeric := 0;
  v_lightness numeric := 0;
  v_delta numeric;
  v_rn numeric := p_r / 255.0;
  v_gn numeric := p_g / 255.0;
  v_bn numeric := p_b / 255.0;
  v_maxn numeric;
  v_minn numeric;
  v_family text;
  v_saturation_label text;
  v_lightness_label text;
  v_temperature text;
  v_structure text;
  v_conditions jsonb := '[]'::jsonb;
  v_traits jsonb;
  v_contributors jsonb := '[]'::jsonb;
  v_condition jsonb;
  v_category text;
  v_index integer;
  v_multiplier numeric;
  v_awarded integer;
  v_score bigint := 10000;
  v_rarity text;
BEGIN
  IF p_r NOT BETWEEN 0 AND 255 OR p_g NOT BETWEEN 0 AND 255 OR p_b NOT BETWEEN 0 AND 255 THEN
    RAISE EXCEPTION 'RGB channels must be integers from 0 to 255';
  END IF;

  v_maxn := greatest(v_rn, v_gn, v_bn);
  v_minn := least(v_rn, v_gn, v_bn);
  v_delta := v_maxn - v_minn;
  v_lightness := ((v_maxn + v_minn) / 2) * 100;
  IF v_delta <> 0 THEN
    IF v_maxn = v_rn THEN v_hue := 60 * mod(((v_gn - v_bn) / v_delta), 6);
    ELSIF v_maxn = v_gn THEN v_hue := 60 * (((v_bn - v_rn) / v_delta) + 2);
    ELSE v_hue := 60 * (((v_rn - v_gn) / v_delta) + 4);
    END IF;
    IF v_hue < 0 THEN v_hue := v_hue + 360; END IF;
    v_saturation := (v_delta / (1 - abs(2 * ((v_maxn + v_minn) / 2) - 1))) * 100;
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
  v_saturation_label := CASE WHEN v_saturation >= 95 THEN 'Electric' WHEN v_saturation >= 70 THEN 'Vivid' WHEN v_saturation >= 40 THEN 'Rich' WHEN v_saturation >= 15 THEN 'Muted' ELSE 'Soft' END;
  v_lightness_label := CASE WHEN v_lightness < 15 THEN 'Shadow' WHEN v_lightness < 35 THEN 'Deep' WHEN v_lightness < 65 THEN 'Balanced' WHEN v_lightness < 85 THEN 'Bright' ELSE 'Luminous' END;
  v_temperature := CASE WHEN p_r = p_g AND p_g = p_b THEN 'Neutral' WHEN p_r >= p_b THEN 'Warm' ELSE 'Cool' END;
  v_structure := CASE WHEN v_range <= 20 THEN 'Smooth' WHEN v_range >= 205 THEN 'Polarized' ELSE 'Layered' END;

  v_traits := jsonb_build_array(
    jsonb_build_object('id', 'hue_' || lower(v_family), 'label', v_family || ' Hue', 'group', 'hue'),
    jsonb_build_object('id', 'saturation_' || lower(v_saturation_label), 'label', v_saturation_label || ' Saturation', 'group', 'saturation'),
    jsonb_build_object('id', 'lightness_' || lower(v_lightness_label), 'label', v_lightness_label || ' Lightness', 'group', 'lightness'),
    jsonb_build_object('id', 'temperature_' || lower(v_temperature), 'label', v_temperature || ' Temperature', 'group', 'temperature'),
    jsonb_build_object('id', 'structure_' || lower(v_structure), 'label', v_structure || ' Structure', 'group', 'structure')
  );

  -- Each candidate condition is represented as id/name/category/points/fullValue.
  IF is_prime(v_sum) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','prime_sum','name','Prime Energy','category','mathematical','points',15013)); END IF;
  IF v_sum IN (0,1,2,3,5,8,13,21,34,55,89,144,233,377,610) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','fibonacci_sum','name','Fibonacci Energy','category','mathematical','points',25021)); END IF;
  IF v_sum = 42 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','sum_42','name','Meaning of Life','category','rare_event','points',150042,'fullValue',true)); END IF;
  IF v_sum = 100 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','sum_100','name','Perfect Century','category','rare_event','points',100100,'fullValue',true)); END IF;
  IF v_sum = 255 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','sum_255','name','Max Byte','category','rare_event','points',75255,'fullValue',true)); END IF;
  IF v_sum = 666 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','sum_666','name','Sinister Shade','category','rare_event','points',250666,'fullValue',true)); END IF;
  IF v_range >= 205 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','high_contrast','name','Polarized Channels','category','color_relationship','points',18205)); END IF;
  IF v_range <= 20 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','low_contrast','name','Close Harmony','category','color_relationship','points',12020)); END IF;
  IF v_range > 20 AND v_range < 80 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','gentle_contrast','name','Gentle Contrast','category','color_relationship','points',3021)); END IF;
  IF v_range >= 80 AND v_range < 205 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','layered_contrast','name','Layered Contrast','category','color_relationship','points',6080)); END IF;
  IF v_max > 210 AND v_min > 120 AND v_range < 75 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pastel','name','Pastel Bloom','category','color_relationship','points',25210)); END IF;
  IF v_max > 220 AND v_min < 45 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','neon','name','Neon Voltage','category','color_relationship','points',30220)); END IF;
  IF v_lightness >= 90 AND v_saturation <= 20 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','luminous_core','name','Luminous Core','category','color_relationship','points',40090)); END IF;
  IF least(p_r,p_g,p_b) <= 10 AND p_r+p_g+p_b-least(p_r,p_g,p_b)-greatest(p_r,p_g,p_b) BETWEEN 110 AND 145 AND greatest(p_r,p_g,p_b) >= 245 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','triple_crown','name','Triple Crown','category','rare_event','points',175003,'fullValue',true)); END IF;
  IF v_saturation >= 95 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','saturation_spike','name','Saturation Spike','category','saturation','points',20095));
  ELSIF v_saturation >= 70 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','vivid_saturation','name','Vivid Saturation','category','saturation','points',12070));
  ELSIF v_saturation >= 40 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','rich_saturation','name','Rich Saturation','category','saturation','points',7040));
  ELSIF v_saturation >= 15 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','muted_saturation','name','Muted Saturation','category','saturation','points',3015));
  ELSE v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','soft_saturation','name','Soft Saturation','category','saturation','points',1008)); END IF;
  IF v_lightness < 15 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','shadow_tone','name','Shadow Tone','category','tone','points',15015));
  ELSIF v_lightness < 35 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','deep_tone','name','Deep Tone','category','tone','points',7035));
  ELSIF v_lightness < 65 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','balanced_tone','name','Balanced Tone','category','tone','points',3050));
  ELSIF v_lightness < 85 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','bright_tone','name','Bright Tone','category','tone','points',7065));
  ELSE v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','luminous_tone','name','Luminous Tone','category','tone','points',15085)); END IF;
  IF v_range >= 30 AND p_r > p_g AND p_r > p_b THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','red_dominant','name','Red Dominant','category','composition','points',4777));
  ELSIF v_range >= 30 AND p_g > p_r AND p_g > p_b THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','green_dominant','name','Green Dominant','category','composition','points',4777));
  ELSIF v_range >= 30 AND p_b > p_r AND p_b > p_g THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','blue_dominant','name','Blue Dominant','category','composition','points',4777));
  ELSE v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','balanced_channels','name','Balanced Channels','category','composition','points',2888)); END IF;
  IF p_r = p_g AND p_g = p_b THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','greyscale','name','Perfect Greyscale','category','structure','points',75256)); END IF;
  IF p_r IN (0,51,102,153,204,255) AND p_g IN (0,51,102,153,204,255) AND p_b IN (0,51,102,153,204,255) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','web_safe','name','Web Safe','category','structure','points',50216)); END IF;
  IF v_hex = reverse(v_hex) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','palindrome','name','Hex Palindrome','category','hex_pattern','points',175571)); END IF;
  IF substr(v_hex,1,2)=substr(v_hex,3,2) AND substr(v_hex,3,2)=substr(v_hex,5,2) THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','repeated_pair','name','Repeated Pair','category','hex_pattern','points',150222)); END IF;
  IF v_hex ~ '(.)\1\1' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','triple_hex','name','Triple Hex','category','hex_pattern','points',90333)); END IF;
  IF v_hex LIKE '%F1%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','f1','name','F1','category','hex_pattern','points',75001)); END IF;
  IF v_hex LIKE '%DEAD%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','dead','name','DEAD','category','rare_event','points',307005,'fullValue',true)); END IF;
  IF v_hex LIKE '%BEEF%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','beef','name','BEEF','category','rare_event','points',298879,'fullValue',true)); END IF;
  IF v_hex LIKE '%CAFE%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','cafe','name','CAFE','category','rare_event','points',251966,'fullValue',true)); END IF;
  IF v_hex LIKE '%FACE%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','face','name','FACE','category','rare_event','points',264206,'fullValue',true)); END IF;
  IF v_hex LIKE '%FADE%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','fade','name','FADE','category','rare_event','points',224222,'fullValue',true)); END IF;
  IF v_hex LIKE '%FEED%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','feed','name','FEED','category','rare_event','points',265261,'fullValue',true)); END IF;
  IF v_hex LIKE '%F00D%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','food','name','F00D','category','rare_event','points',226453,'fullValue',true)); END IF;
  IF v_hex LIKE '%1337%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','leet','name','1337','category','rare_event','points',251337,'fullValue',true)); END IF;
  IF v_hex LIKE '%007%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','james_bond','name','007','category','rare_event','points',100007,'fullValue',true)); END IF;
  IF v_hex LIKE '%420%' THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','blaze_it','name','420','category','rare_event','points',75420,'fullValue',true)); END IF;
  IF p_r=0 AND p_g=0 AND p_b=0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_black','name','The Void','category','special_event','points',1677721,'fullValue',true)); END IF;
  IF p_r=255 AND p_g=255 AND p_b=255 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_white','name','The Light','category','special_event','points',1677721,'fullValue',true)); END IF;
  IF p_r=255 AND p_g=0 AND p_b=0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_red','name','Maximum Red','category','special_event','points',750255,'fullValue',true)); END IF;
  IF p_r=0 AND p_g=255 AND p_b=0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_green','name','Maximum Green','category','special_event','points',750255,'fullValue',true)); END IF;
  IF p_r=0 AND p_g=0 AND p_b=255 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_blue','name','Maximum Blue','category','special_event','points',750255,'fullValue',true)); END IF;
  IF p_r=255 AND p_g=215 AND p_b=0 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','pure_gold','name','Midas','category','special_event','points',1500079,'fullValue',true)); END IF;
  IF p_r=145 AND p_g=70 AND p_b=255 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','streamer_purple','name','Streamer Purple','category','special_event','points',1014570,'fullValue',true)); END IF;
  IF p_r=30 AND p_g=215 AND p_b=96 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','audio_stream_green','name','Audio Stream Green','category','special_event','points',1030215,'fullValue',true)); END IF;
  IF p_r=244 AND p_g=0 AND p_b=9 THEN v_conditions := v_conditions || jsonb_build_array(jsonb_build_object('id','classic_cola_red','name','Classic Cola Red','category','special_event','points',1024409,'fullValue',true)); END IF;

  FOR v_condition IN SELECT value FROM jsonb_array_elements(v_conditions) LOOP
    IF coalesce((v_condition->>'fullValue')::boolean, false) THEN
      v_awarded := (v_condition->>'points')::integer;
      v_score := v_score + v_awarded;
      v_contributors := v_contributors || jsonb_build_array(v_condition || jsonb_build_object('awardedPoints', v_awarded, 'multiplier', 1));
    END IF;
  END LOOP;
  FOREACH v_category IN ARRAY ARRAY['mathematical','color_relationship','saturation','tone','composition','structure','hex_pattern'] LOOP
    v_index := 0;
    FOR v_condition IN SELECT value FROM jsonb_array_elements(v_conditions) WHERE coalesce((value->>'fullValue')::boolean, false) = false AND value->>'category' = v_category ORDER BY (value->>'points')::integer DESC LOOP
      v_index := v_index + 1;
      IF v_index > 3 THEN EXIT; END IF;
      v_multiplier := CASE v_index WHEN 1 THEN 1 WHEN 2 THEN 0.35 ELSE 0.1 END;
      v_awarded := round((v_condition->>'points')::numeric * v_multiplier);
      v_score := v_score + v_awarded;
      v_contributors := v_contributors || jsonb_build_array(v_condition || jsonb_build_object('awardedPoints', v_awarded, 'multiplier', v_multiplier));
    END LOOP;
  END LOOP;
  SELECT coalesce(jsonb_agg(value ORDER BY (value->>'awardedPoints')::integer DESC), '[]'::jsonb) INTO v_contributors FROM jsonb_array_elements(v_contributors);
  v_rarity := CASE WHEN v_score >= 1500000 THEN 'Mythic' WHEN v_score >= 200000 THEN 'Anomaly' WHEN v_score >= 85000 THEN 'Epic' WHEN v_score >= 49500 THEN 'Rare' WHEN v_score >= 34500 THEN 'Uncommon' WHEN v_score >= 25000 THEN 'Common' ELSE 'Trash' END;
  RETURN jsonb_build_object('score', v_score, 'rarity', v_rarity, 'conditions', v_conditions, 'conditionIds', coalesce((SELECT jsonb_agg(value->>'id') FROM jsonb_array_elements(v_conditions)), '[]'::jsonb), 'contributors', v_contributors, 'traits', v_traits, 'identity', v_lightness_label || ' ' || v_saturation_label || ' ' || v_family);
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_roll_v2(integer, integer, integer) FROM PUBLIC, anon, authenticated;
