-- Canonical seed data for fresh Supabase resets.
--
-- This keeps a new database playable without any manual dashboard setup.

INSERT INTO public.achievements (id, name, description, icon, ep_reward, rarity) VALUES
('first_roll', 'First Steps', 'Roll the die for the first time.', '🎲', 5000, 'Common'),
('roll_10', 'Dedicated', 'Roll the die 10 times.', '🧡', 25000, 'Common'),
('roll_50', 'Veteran', 'Roll the die 50 times.', '💜', 100000, 'Rare'),
('roll_100', 'Centurion', 'Roll the die 100 times.', '💯', 250000, 'Epic'),
('roll_365', 'Annual', 'Roll the die 365 times.', '📅', 1000000, 'Mythic'),
('streak_7', 'Week Warrior', 'Maintain a 7-day streak.', '🔥', 50000, 'Common'),
('streak_14', 'Fortnight', 'Maintain a 14-day streak.', '🔥', 100000, 'Rare'),
('streak_30', 'Monthly Grinder', 'Maintain a 30-day streak.', '📅', 250000, 'Epic'),
('streak_100', 'Iron Will', 'Maintain a 100-day streak.', '🔥', 750000, 'Mythic'),
('rarity_rare', 'Uncommonly Rare', 'Roll a Rare color.', '🔵', 25000, 'Common'),
('rarity_epic', 'Epic Encounter', 'Roll an Epic rarity color.', '🟣', 100000, 'Rare'),
('rarity_anomaly', 'Anomaly Detected', 'Roll an Anomaly rarity color.', '🟠', 250000, 'Epic'),
('mythic_roll', 'Mythic Touch', 'Roll a Mythic rarity color.', '🌟', 500000, 'Mythic'),
('score_50k', 'High Roller', 'Score at least 50,000 EP in a single roll.', '💰', 25000, 'Common'),
('score_100k', 'Six Digits', 'Score at least 100,000 EP in a single roll.', '💰', 100000, 'Rare'),
('score_200k', 'Anomaly Hunter', 'Score at least 200,000 EP in a single roll.', '💰', 250000, 'Epic'),
('score_1_5m', 'Once in a Spectrum', 'Score at least 1,500,000 EP in a single roll.', '🌈', 500000, 'Mythic'),
('roll_prime', 'Prime Number', 'Roll a color with a prime R+G+B sum.', '🔢', 25000, 'Common'),
('high_contrast', 'Polarized Channels', 'Roll a color with an extreme RGB range.', '🌓', 25000, 'Common'),
('low_contrast', 'Close Harmony', 'Roll a color with very close RGB channels.', '🌫️', 15000, 'Common'),
('greyscale', 'Perfect Greyscale', 'Roll a pure greyscale color.', '⚫', 50000, 'Rare'),
('web_safe', 'Web Safe', 'Roll a classic web-safe color.', '🕸️', 50000, 'Rare'),
('roll_42_sum', 'Meaning of Life', 'Roll a color where R+G+B is exactly 42.', '🧬', 100000, 'Rare'),
('roll_beef', 'Where is the Beef?', 'Roll a hex containing BEEF.', '🥩', 100000, 'Rare'),
('roll_cafe', 'Coffee Break', 'Roll a hex containing CAFE.', '☕', 100000, 'Rare'),
('roll_dead', 'Dead Man Walking', 'Roll a hex containing DEAD.', '💀', 100000, 'Rare'),
('roll_face', 'Face Value', 'Roll a hex containing FACE.', '😎', 100000, 'Rare'),
('roll_palindrome', 'Mirror', 'Roll a hex palindrome.', '🪞', 150000, 'Epic'),
('repeated_pair', 'Repeated Pair', 'Roll a hex that repeats the same byte three times.', '🟰', 125000, 'Epic'),
('saturation_spike', 'Saturation Spike', 'Roll an extremely saturated color.', '🎨', 50000, 'Rare'),
('triple_crown', 'Triple Crown', 'Roll one low, one middle, and one maximum channel.', '👑', 150000, 'Epic'),
('pastel_soft', 'Pastel Bloom', 'Roll a bright, soft pastel color.', '🌸', 50000, 'Rare'),
('neon_bright', 'Neon Voltage', 'Roll a vivid high-contrast color.', '💡', 50000, 'Rare'),
('roll_black', 'The Void', 'Roll Pure Black (#000000).', '🌑', 500000, 'Mythic'),
('roll_white', 'The Light', 'Roll Pure White (#FFFFFF).', '☀️', 500000, 'Mythic'),
('roll_gold', 'Midas', 'Roll Pure Gold (#FFD700).', '🥇', 500000, 'Mythic'),
('pure_red', 'Maximum Red', 'Roll Pure Red (#FF0000).', '🟥', 250000, 'Epic'),
('pure_green', 'Maximum Green', 'Roll Pure Green (#00FF00).', '🟩', 250000, 'Epic'),
('pure_blue', 'Maximum Blue', 'Roll Pure Blue (#0000FF).', '🟦', 250000, 'Epic'),
('streamer_purple', 'Streamer Purple', 'Roll Streamer Purple.', '🟣', 350000, 'Mythic'),
('audio_stream_green', 'Audio Stream Green', 'Roll Audio Stream Green.', '🟢', 350000, 'Mythic'),
('classic_cola_red', 'Classic Cola Red', 'Roll Classic Cola Red.', '🥤', 350000, 'Mythic')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.shop_items (item_key, name, slot, cost, css_type, css_value, available_from, available_until, rarity, description, collection, stackable) VALUES
('border_celestial', 'Celestial Border', 'profile_border', 600000, 'renderer', 'celestial', NULL, NULL, 'Mythic', 'A precise celestial edge with a restrained star-like pulse.', 'Prism', false),
('border_chroma', 'Chroma Border', 'profile_border', 450000, 'renderer', 'chroma', NULL, NULL, 'Mythic', 'A spectrum edge that moves through the profile without overwhelming it.', 'Prism', false),
('border_crystal', 'Crystal Border', 'profile_border', 450000, 'renderer', 'crystal', NULL, NULL, 'Mythic', 'A cool faceted edge with a clean crystalline glint.', 'Prism', false),
('border_glitch', 'Glitch Border', 'profile_border', 500000, 'renderer', 'glitch', NULL, NULL, 'Mythic', 'A clipped signal edge with brief cyan and rose interruptions.', 'Static Bloom', false),
('border_gold', 'Gold Border', 'profile_border', 350000, 'renderer', 'gold', NULL, NULL, 'Mythic', 'A warm archival metal edge with a measured glint.', 'Archive', false),
('border_neon', 'Neon Border', 'profile_border', 180000, 'renderer', 'neon', NULL, NULL, 'Epic', 'A clean electric edge that breathes between cyan and mint.', 'Signal', false),
('border_prism', 'Prism Border', 'profile_border', 300000, 'renderer', 'prism', NULL, NULL, 'Epic', 'Refracted light travels around the profile edge in a compact spectrum.', 'Prism', false),
('border_void', 'Void Border', 'profile_border', 550000, 'renderer', 'void', NULL, NULL, 'Mythic', 'A dark violet edge that absorbs light around the card.', 'Nocturne', false),
('border_signal', 'Signal Border', 'profile_border', 160000, 'renderer', 'signal', NULL, NULL, 'Rare', 'A quiet lime edge with a bounded signal pulse.', 'Signal', false),
('streak_freeze', 'Streak Freeze', 'consumable', 50000, 'text', 'Protects your streak if you miss a day.', NULL, NULL, 'Rare', 'Protects your streak if you miss a day.', NULL, true),
('title_founder', 'Founder Title', 'title', 0, 'text', '✦ FOUNDER ✦', NULL, '2026-07-10', 'Mythic', 'Reserved for people whose early contributions helped shape ChromaDie.', 'Project Legacy', false)
ON CONFLICT (item_key) DO NOTHING;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_font_industrial_stencil', 'Black Ops One', 'name_font', 0, 'renderer', 'industrial-stencil', NULL, NULL, 'Epic', 'A cut stencil face with utilitarian, engineered lettering.', 'Signal', false, 'free', NULL, 'active'),
  ('name_font_marker_tag', 'Permanent Marker', 'name_font', 0, 'renderer', 'marker-tag', NULL, NULL, 'Epic', 'A hand-marked face that gives the name a quick, personal gesture.', 'Ember', false, 'free', NULL, 'active'),
  ('name_font_satoshi', 'Satoshi', 'name_font', 0, 'renderer', 'satoshi', NULL, NULL, 'Uncommon', 'A clean contemporary sans with a calm, balanced identity voice.', 'Nocturne', false, 'free', NULL, 'active'),
  ('name_font_fira_code', 'Fira Code', 'name_font', 0, 'renderer', 'fira-code', NULL, NULL, 'Rare', 'A coding-oriented monospace with a crisp, deliberate rhythm.', 'Signal', false, 'free', NULL, 'active'),
  ('name_font_poppins', 'Poppins', 'name_font', 0, 'renderer', 'poppins', NULL, NULL, 'Uncommon', 'A geometric sans with open counters and a polished everyday profile.', 'Prism', false, 'free', NULL, 'active'),
  ('name_font_jetbrains_mono', 'JetBrains Mono', 'name_font', 0, 'renderer', 'jetbrains-mono', NULL, NULL, 'Rare', 'A technical monospace with distinctive shapes and focused spacing.', 'Signal', false, 'free', NULL, 'active'),
  ('name_font_array', 'Array', 'name_font', 0, 'renderer', 'array', NULL, NULL, 'Epic', 'A dot-grid display face that turns the name into a compact signal.', 'Static Bloom', false, 'free', NULL, 'active'),
  ('name_font_velocity', 'Velocity', 'name_font', 0, 'renderer', 'velocity', NULL, NULL, 'Rare', 'A sharp display face with forward motion and an unmistakable silhouette.', 'Signal', false, 'free', NULL, 'active'),
  ('name_font_outfit', 'Outfit', 'name_font', 0, 'renderer', 'outfit', NULL, NULL, 'Uncommon', 'A modern rounded sans with a confident, approachable profile.', 'Nocturne', false, 'free', NULL, 'active'),
  ('name_material_glass_emboss', 'Raised Glass', 'name_material', 350000, 'renderer', 'glass-emboss', NULL, NULL, 'Epic', 'A translucent embossed surface with a raised, refracted edge.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_carbon_cut', 'Carbon Vein', 'name_material', 230000, 'renderer', 'carbon-cut', NULL, NULL, 'Rare', 'A dark carbon surface scored with restrained silver facets.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_neon_tube', 'Afterglow', 'name_material', 380000, 'renderer', 'neon-tube', NULL, NULL, 'Epic', 'A bounded neon-tube face with a bright inner core and colored rim.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_material_velvet_ink', 'Soft Black', 'name_material', 250000, 'renderer', 'velvet-ink', NULL, NULL, 'Rare', 'A plush velvet surface with a saturated pile and soft highlight.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_material_engraved_stone', 'Quarry Mark', 'name_material', 260000, 'renderer', 'engraved-stone', NULL, NULL, 'Rare', 'A carved stone face with durable shadowed grooves and pale edges.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_crt_phosphor', 'Cathode Bloom', 'name_material', 350000, 'renderer', 'crt-phosphor', NULL, NULL, 'Epic', 'A green phosphor face with a controlled screen glow and scan texture.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_material_blueprint_ink', 'Draftline', 'name_material', 240000, 'renderer', 'blueprint-ink', NULL, NULL, 'Rare', 'A technical blue ink face with pale drafting-line highlights.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_glow', 'Glow', 'name_motion', 280000, 'renderer', 'haunt-glow', NULL, NULL, 'Rare', 'A concentrated halo breathes around the name without washing out its edge.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_letter_shuffle', 'Scramble', 'name_motion', 520000, 'renderer', 'letter-shuffle', NULL, NULL, 'Anomaly', 'Characters rearrange before locking into place.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_typewriter_name', 'Type In', 'name_motion', 230000, 'renderer', 'typewriter-name', NULL, NULL, 'Rare', 'Characters arrive one by one with a precise editorial cursor.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_particles', 'Particles', 'name_motion', 420000, 'renderer', 'haunt-particles', NULL, NULL, 'Epic', 'A bright particle field lifts from the name and dissolves into the surrounding color.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_rainbow', 'Rainbow', 'name_motion', 620000, 'renderer', 'haunt-rainbow', NULL, NULL, 'Anomaly', 'A saturated spectrum travels across the letterforms with a polished light pass.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_gradient', 'Gradient', 'name_motion', 360000, 'renderer', 'haunt-gradient', NULL, NULL, 'Rare', 'A deep three-color gradient shifts slowly through the name with a crisp specular edge.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_fuzzy', 'Fuzzy', 'name_motion', 460000, 'renderer', 'haunt-fuzzy', NULL, NULL, 'Anomaly', 'The name resolves through soft signal noise and brief chromatic separation.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_reveal', 'Reveal', 'name_motion', 300000, 'renderer', 'haunt-reveal', NULL, NULL, 'Rare', 'A clean light curtain unveils the name from left to right.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_split', 'Split Reveal', 'name_motion', 540000, 'renderer', 'haunt-split', NULL, NULL, 'Epic', 'Two halves of the name enter on separate planes and meet on the centerline.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_flash', 'Flash', 'name_motion', 330000, 'renderer', 'haunt-flash', NULL, NULL, 'Rare', 'A sharp white exposure rolls over the name before the color settles.', 'Signal', false, 'earned', NULL, 'active')
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name,
  slot = EXCLUDED.slot,
  cost = EXCLUDED.cost,
  css_type = EXCLUDED.css_type,
  css_value = EXCLUDED.css_value,
  rarity = EXCLUDED.rarity,
  description = EXCLUDED.description,
  collection = EXCLUDED.collection,
  stackable = EXCLUDED.stackable,
  access_tier = EXCLUDED.access_tier,
  entitlement_key = EXCLUDED.entitlement_key,
  catalog_status = EXCLUDED.catalog_status;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('cursor_trail_signal_trace', 'Signal Trace', 'cursor_trail', 160000, 'renderer', 'signal-trace', NULL, NULL, 'Rare', 'A thin cyan/lime line joining recent pointer positions with a fast clean fade.', 'Signal', false, 'earned', NULL, 'active'),
  ('cursor_trail_pixel_wake', 'Pixel Wake', 'cursor_trail', 180000, 'renderer', 'pixel-wake', NULL, NULL, 'Rare', 'Crisp square pixels shed from movement and dissolve without blur.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('cursor_trail_chroma_ribbon', 'Chroma Ribbon', 'cursor_trail', 340000, 'renderer', 'chroma-ribbon', NULL, NULL, 'Epic', 'A narrow three-band ribbon follows pointer curvature without covering links.', 'Prism', false, 'earned', NULL, 'active'),
  ('cursor_trail_glass_shards', 'Glass Shards', 'cursor_trail', 360000, 'renderer', 'glass-shards', NULL, NULL, 'Epic', 'Sparse translucent facets rotate with controlled refracted highlights.', 'Prism', false, 'earned', NULL, 'active'),
  ('cursor_trail_ember_ash', 'Ember Ash', 'cursor_trail', 210000, 'renderer', 'ember-ash', NULL, NULL, 'Rare', 'Small warm embers drift upward from the pointer path and cool quickly.', 'Ember', false, 'earned', NULL, 'active'),
  ('cursor_trail_comet_thread', 'Comet Thread', 'cursor_trail', 330000, 'renderer', 'comet-thread', NULL, NULL, 'Epic', 'A fine pale comet tail with a dark central thread and clean taper.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('cursor_trail_ink_drops', 'Ink Drops', 'cursor_trail', 220000, 'renderer', 'ink-drops', NULL, NULL, 'Rare', 'Small ink impressions appear along the path with restrained paper-like spread.', 'Archive', false, 'earned', NULL, 'active'),
  ('cursor_trail_orbit_dust', 'Orbit Dust', 'cursor_trail', 350000, 'renderer', 'orbit-dust', NULL, NULL, 'Epic', 'A few particles orbit the recent path before collapsing inward.', 'Prism', false, 'earned', NULL, 'active'),
  ('cursor_trail_static_echo', 'Static Echo', 'cursor_trail', 320000, 'renderer', 'static-echo', NULL, NULL, 'Epic', 'Brief offset pointer afterimages create crisp signal breakup without screen shake.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('cursor_trail_rain_trace', 'Rain Trace', 'cursor_trail', 230000, 'renderer', 'rain-trace', NULL, NULL, 'Rare', 'Short vertical dashes fall from recent pointer points and disappear quickly.', 'Signal', false, 'earned', NULL, 'active'),
  ('cursor_trail_gold_fleck', 'Gold Fleck', 'cursor_trail', 370000, 'renderer', 'gold-fleck', NULL, NULL, 'Epic', 'Sparse angular gold-leaf pieces catch light without becoming confetti.', 'Archive', false, 'earned', NULL, 'active'),
  ('cursor_trail_ghost_tail', 'Ghost Tail', 'cursor_trail', 320000, 'renderer', 'ghost-tail', NULL, NULL, 'Epic', 'Low-opacity pointer echoes compress into a soft dark tail.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('cursor_trail_color_memory', 'Color Memory', 'cursor_trail', 540000, 'renderer', 'color-memory', NULL, NULL, 'Anomaly', 'The trail moves through the user’s recent roll colors in chronological order.', 'Prism', false, 'earned', NULL, 'active'),
  ('cursor_trail_marker_stroke', 'Marker Stroke', 'cursor_trail', 360000, 'renderer', 'marker-stroke', NULL, NULL, 'Epic', 'A pressure-like hand-drawn stroke has a dry marker edge and bounded width.', 'Archive', false, 'earned', NULL, 'active'),
  ('cursor_trail_solar_sparks', 'Solar Sparks', 'cursor_trail', 520000, 'renderer', 'solar-sparks', NULL, NULL, 'Anomaly', 'Fine sparks and an occasional restrained flare respond to pointer speed.', 'Ember', false, 'earned', NULL, 'active'),
  ('cursor_trail_void_lensing', 'Void Lensing', 'cursor_trail', 700000, 'renderer', 'void-lensing', NULL, NULL, 'Mythic', 'A dark lens ring separates violet and cyan around a narrow spectral wake.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('avatar_effect_signal_ring', 'Signal Ring', 'avatar_effect', 180000, 'renderer', 'signal-ring', NULL, NULL, 'Rare', 'A precise ring with scanner ticks and a restrained rotating signal mark.', 'Signal', false, 'earned', NULL, 'active'),
  ('avatar_effect_neon_halo', 'Neon Halo', 'avatar_effect', 320000, 'renderer', 'neon-halo', NULL, NULL, 'Epic', 'A bright inner halo and soft breathing outer glow preserve the image.', 'Signal', false, 'earned', NULL, 'active'),
  ('avatar_effect_prism_orbit', 'Prism Orbit', 'avatar_effect', 350000, 'renderer', 'prism-orbit', NULL, NULL, 'Epic', 'Three small refractive facets orbit the avatar on separate paths.', 'Prism', false, 'earned', NULL, 'active'),
  ('avatar_effect_crystal_aperture', 'Crystal Aperture', 'avatar_effect', 360000, 'renderer', 'crystal-aperture', NULL, NULL, 'Epic', 'Faceted corner pieces form a camera-like crystal aperture around the avatar.', 'Prism', false, 'earned', NULL, 'active'),
  ('avatar_effect_chroma_arc', 'Chroma Arc', 'avatar_effect', 520000, 'renderer', 'chroma-arc', NULL, NULL, 'Anomaly', 'Segmented spectral arcs travel around the avatar with deliberate resting gaps.', 'Prism', false, 'earned', NULL, 'active'),
  ('avatar_effect_ember_crown', 'Ember Crown', 'avatar_effect', 380000, 'renderer', 'ember-crown', NULL, NULL, 'Epic', 'A compact crown of warm sparks and metal-like points sits above the avatar.', 'Ember', false, 'earned', NULL, 'active'),
  ('avatar_effect_ashfall', 'Ashfall', 'avatar_effect', 230000, 'renderer', 'ashfall', NULL, NULL, 'Rare', 'Sparse ash falls behind the avatar without crossing the face.', 'Ember', false, 'earned', NULL, 'active'),
  ('avatar_effect_gold_laurel', 'Gold Laurel', 'avatar_effect', 390000, 'renderer', 'gold-laurel', NULL, NULL, 'Epic', 'A clean angular laurel frames the lower sides with a measured metallic glint.', 'Archive', false, 'earned', NULL, 'active'),
  ('avatar_effect_ink_stamp', 'Ink Stamp', 'avatar_effect', 220000, 'renderer', 'ink-stamp', NULL, NULL, 'Rare', 'Misregistered print edges and halftone marks create a stamped portrait.', 'Archive', false, 'earned', NULL, 'active'),
  ('avatar_effect_paper_tear', 'Paper Tear', 'avatar_effect', 350000, 'renderer', 'paper-tear', NULL, NULL, 'Epic', 'A bounded torn-paper mask reveals a layered paper edge around the image.', 'Archive', false, 'earned', NULL, 'active'),
  ('avatar_effect_static_offset', 'Static Offset', 'avatar_effect', 340000, 'renderer', 'static-offset', NULL, NULL, 'Epic', 'Brief cyan and rose image offsets appear during a controlled interruption.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('avatar_effect_pixel_satellites', 'Pixel Satellites', 'avatar_effect', 240000, 'renderer', 'pixel-satellites', NULL, NULL, 'Rare', 'Small square satellites orbit in stepped pixel motion.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('avatar_effect_crt_scan', 'CRT Scan', 'avatar_effect', 330000, 'renderer', 'crt-scan', NULL, NULL, 'Epic', 'Phosphor edge light, corner marks, and a slow scan pass create a screen portrait.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('avatar_effect_void_eclipse', 'Void Eclipse', 'avatar_effect', 560000, 'renderer', 'void-eclipse', NULL, NULL, 'Anomaly', 'A near-black eclipse halo with violet lensing adds depth without hiding the face.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('avatar_effect_ghost_double', 'Ghost Double', 'avatar_effect', 350000, 'renderer', 'ghost-double', NULL, NULL, 'Epic', 'A subtle offset duplicate appears behind the avatar during a controlled pulse.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('avatar_effect_night_frame', 'Night Frame', 'avatar_effect', 220000, 'renderer', 'night-frame', NULL, NULL, 'Rare', 'A dark precision mount with pale corner cuts gives the avatar editorial weight.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('avatar_effect_daily_aura', 'Daily Aura', 'avatar_effect', 400000, 'renderer', 'daily-aura', NULL, NULL, 'Epic', 'A readable aura derived from the current daily color surrounds the avatar.', 'Prism', false, 'earned', NULL, 'active'),
  ('avatar_effect_color_archive', 'Color Archive', 'avatar_effect', 720000, 'renderer', 'color-archive', NULL, NULL, 'Mythic', 'Recent roll colors form four animated archival segments around the portrait.', 'Prism', false, 'earned', NULL, 'active'),
  ('profile_layout_compact', 'Compact', 'profile_layout', 0, 'renderer', 'compact', NULL, NULL, 'Uncommon', 'A small centered identity surface that leaves the user background in charge.', 'Layouts', false, 'free', NULL, 'active'),
  ('profile_layout_full_bleed', 'Immersive', 'profile_layout', 0, 'renderer', 'full-bleed', NULL, NULL, 'Uncommon', 'A full-viewport identity scene with a large avatar, bio, and icon links.', 'Layouts', false, 'free', NULL, 'active'),
  ('profile_motion_perspective_tilt', '3D Tilt', 'profile_motion', 0, 'renderer', 'perspective-tilt', NULL, NULL, 'Uncommon', 'A restrained perspective shift follows the pointer across the profile surface.', 'Layouts', false, 'free', NULL, 'active')
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name,
  slot = EXCLUDED.slot,
  cost = EXCLUDED.cost,
  css_type = EXCLUDED.css_type,
  css_value = EXCLUDED.css_value,
  rarity = EXCLUDED.rarity,
  description = EXCLUDED.description,
  collection = EXCLUDED.collection,
  stackable = EXCLUDED.stackable,
  access_tier = EXCLUDED.access_tier,
  entitlement_key = EXCLUDED.entitlement_key,
  catalog_status = EXCLUDED.catalog_status;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('profile_atmosphere_rain_window', 'Rain Window', 'profile_atmosphere', 260000, 'renderer', 'rain-window', NULL, NULL, 'Rare', 'A seamless fall of fine rain turns the profile into a quiet weather signal.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_droplets_glass', 'Droplets on Glass', 'profile_atmosphere', 240000, 'renderer', 'droplets-glass', NULL, NULL, 'Rare', 'Realistic beads and trails cling to a pane, catching the daily color without obscuring the profile.', 'Archive', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_dust_light', 'Dustlight', 'profile_atmosphere', 280000, 'renderer', 'dust-light', NULL, NULL, 'Rare', 'Fine particles drift through a single beam of light, revealing depth without filling the page.', 'Archive', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_ink_bloom', 'Ink Bloom', 'profile_atmosphere', 520000, 'renderer', 'ink-bloom', NULL, NULL, 'Epic', 'A slow plume of ink unfurls like a living cloud, turning the profile into a moving study in density.', 'Prism', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_snowfall', 'Snowfall', 'profile_atmosphere', 300000, 'renderer', 'snowfall', NULL, NULL, 'Rare', 'Quiet flakes cross a black winter field in a soft, unhurried descent.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_silk_folds', 'Silk Folds', 'profile_atmosphere', 320000, 'renderer', 'silk-folds', NULL, NULL, 'Rare', 'Moving folds of black silk carry a restrained sheen through the profile without adding a frame.', 'Prism', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_glass_caustics', 'Glass Caustics', 'profile_atmosphere', 460000, 'renderer', 'glass-caustics', NULL, NULL, 'Epic', 'Refracted water light breaks across the page like a quiet pane catching the daily color.', 'Archive', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_cinder_drift', 'Cinder Drift', 'profile_atmosphere', 430000, 'renderer', 'cinder-drift', NULL, NULL, 'Epic', 'Fine sparks lift through a dark field, adding a warm trace of motion behind the identity.', 'Ember', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_night_pollen', 'Starlight Tunnel', 'profile_atmosphere', 340000, 'renderer', 'night-pollen', NULL, NULL, 'Rare', 'A dense field of suspended lights folds through a deep nocturnal tunnel.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_paper_shadow', 'Chromatic Tangle', 'profile_atmosphere', 300000, 'renderer', 'paper-shadow', NULL, NULL, 'Rare', 'Bright colored trails knot and release across a black field like a living light study.', 'Prism', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_smoke_spiral', 'Smoke Spiral', 'profile_atmosphere', 580000, 'renderer', 'smoke-spiral', NULL, NULL, 'Anomaly', 'A slow, sculptural spiral of smoke turns the background into a living study of air and light.', 'Prism', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_lumen_flare', 'Lumen Flare', 'profile_atmosphere', 640000, 'renderer', 'lumen-flare', NULL, NULL, 'Mythic', 'A distant lens flare blooms and recedes like a signal arriving through the dark.', 'Signal', false, 'earned', NULL, 'active')
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name,
  slot = EXCLUDED.slot,
  cost = EXCLUDED.cost,
  css_type = EXCLUDED.css_type,
  css_value = EXCLUDED.css_value,
  rarity = EXCLUDED.rarity,
  description = EXCLUDED.description,
  collection = EXCLUDED.collection,
  stackable = EXCLUDED.stackable,
  access_tier = EXCLUDED.access_tier,
  entitlement_key = EXCLUDED.entitlement_key,
  catalog_status = EXCLUDED.catalog_status;

-- Original Atelier expression keys are retained as modern, structured Plus
-- cosmetics. They deliberately reuse finite renderer slots rather than the
-- retired raw-CSS name_effect/profile_bg contract.
INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_prism_atelier', 'Prism Atelier Name', 'name_motion', 0, 'renderer', 'haunt-rainbow', NULL, NULL, 'Mythic', 'The original Atelier name treatment: a restrained spectral pass across the identity.', 'Atelier Expression', false, 'premium', 'chromadie_plus', 'active'),
  ('bg_prism_atmosphere', 'Prism Atmosphere', 'profile_atmosphere', 0, 'renderer', 'silk-folds', NULL, NULL, 'Mythic', 'The original Atelier atmosphere: black silk folds with a quiet prismatic sheen behind the profile.', 'Atelier Expression', false, 'premium', 'chromadie_plus', 'active')
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name,
  slot = EXCLUDED.slot,
  cost = EXCLUDED.cost,
  css_type = EXCLUDED.css_type,
  css_value = EXCLUDED.css_value,
  rarity = EXCLUDED.rarity,
  description = EXCLUDED.description,
  collection = EXCLUDED.collection,
  stackable = EXCLUDED.stackable,
  access_tier = EXCLUDED.access_tier,
  entitlement_key = EXCLUDED.entitlement_key,
  catalog_status = EXCLUDED.catalog_status;

INSERT INTO public.meta (key, value) VALUES
('shop_version', '2026-08-14T05:00:00Z'),
('cotw_target', '73,114,201'),
('official_launch_at', '2026-07-11T00:00:00Z'),
('founder_window_ends_at', '2026-08-11T00:00:00Z')
ON CONFLICT (key) DO NOTHING;

-- Customize is the only active profile-expression surface for this phase.
-- Keep the reset seed aligned with the deployed catalog migration: every
-- active expression is available directly in Profile Studio, while utility
-- rows retain their separate progression semantics.
UPDATE public.shop_items
SET access_tier = 'free',
    cost = 0,
    entitlement_key = NULL
WHERE catalog_status = 'active'
  AND slot IN (
    'name_font',
    'name_material',
    'name_motion',
    'profile_border',
    'cursor_trail',
    'avatar_effect',
    'profile_layout',
    'profile_atmosphere',
    'profile_motion'
  );

UPDATE public.shop_items
SET description = 'A centered glass profile card that leaves the user background in charge.'
WHERE item_key = 'profile_layout_compact';
