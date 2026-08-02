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

INSERT INTO public.shop_items (item_key, name, slot, cost, css_type, css_value, available_from, available_until, rarity, description, collection) VALUES
('bg_aurora', 'Aurora Background', 'profile_bg', '1500000', 'style', 'background-color: #061525; background-image: radial-gradient(ellipse at 15% 20%, rgba(47,255,203,0.72), transparent 46%), radial-gradient(ellipse at 85% 75%, rgba(66,110,255,0.78), transparent 52%), linear-gradient(135deg, #07111f, #123466); background-size: 180% 180%, 170% 170%, 100% 100%; animation: auroraDrift 9s ease-in-out infinite;', NULL, NULL, 'Epic', 'Layered aurora bands drift across a deep blue profile card.', NULL),
('bg_blood_void', 'Blood Void', 'profile_bg', '3000000', 'style', 'background-color: #000; background-image: radial-gradient(circle at 48% 45%, #060000 0 20%, #260006 38%, #5c0715 46%, #110006 60%, #000 78%); background-size: 130% 130%; animation: voidFieldDrift 7s ease-in-out infinite;', NULL, NULL, 'Epic', 'A dark core pulses behind a blood-red event horizon.', 'Voidwalker'),
('bg_deep_space', 'Deep Space', 'profile_bg', '8000000', 'style', 'background-color: #010208; background-image: radial-gradient(circle at 7% 14%, #fff 0 1px, transparent 1.8px), radial-gradient(circle at 18% 68%, rgba(151,210,255,0.9) 0 1.3px, transparent 2.2px), radial-gradient(circle at 29% 31%, rgba(255,255,255,0.72) 0 0.7px, transparent 1.5px), radial-gradient(circle at 41% 83%, rgba(190,166,255,0.82) 0 1px, transparent 2px), radial-gradient(circle at 52% 11%, rgba(255,255,255,0.88) 0 1.2px, transparent 2.1px), radial-gradient(circle at 61% 57%, rgba(112,191,255,0.78) 0 0.8px, transparent 1.7px), radial-gradient(circle at 73% 26%, #fff 0 1.4px, transparent 2.4px), radial-gradient(circle at 84% 76%, rgba(208,226,255,0.76) 0 0.9px, transparent 1.8px), radial-gradient(circle at 94% 43%, rgba(164,129,255,0.86) 0 1.2px, transparent 2.2px), radial-gradient(circle at 12% 91%, rgba(255,255,255,0.62) 0 0.7px, transparent 1.4px), radial-gradient(circle at 36% 54%, rgba(135,215,255,0.7) 0 0.6px, transparent 1.4px), radial-gradient(circle at 67% 92%, rgba(255,255,255,0.7) 0 0.8px, transparent 1.6px), radial-gradient(ellipse at 62% 38%, rgba(38,55,112,0.42), transparent 48%), radial-gradient(ellipse at center, #101634 0%, #03040d 56%, #000 100%); background-size: 100% 100%; background-repeat: no-repeat; animation: deepSpaceTwinkle 6.2s ease-in-out infinite;', NULL, NULL, 'Mythic', 'An irregular field of varied stars visibly drifts and glimmers through deep space.', 'Digital Landscape'),
('bg_geo_grid', 'Geometric Grid', 'profile_bg', '1000000', 'style', 'background-color: #050505; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 20px 20px;', NULL, NULL, 'Epic', 'A subtle geometric grid.', 'Digital Landscape'),
('bg_god_rays', 'God Rays', 'profile_bg', '50000000', 'style', 'background-color: #271500; background-image: radial-gradient(ellipse at 50% 42%, rgba(255,255,220,0.95) 0%, rgba(255,213,74,0.52) 18%, transparent 52%), repeating-conic-gradient(from -18deg at 50% 28%, rgba(255,244,174,0.72) 0deg 7deg, rgba(255,162,0,0.08) 9deg 18deg), linear-gradient(120deg, #4a1e00, #d68a00, #4a1e00); background-size: 140% 140%, 160% 160%, 220% 100%; background-position: 50% 50%, 50% 42%, 0% 50%; background-repeat: no-repeat; animation: godRaysTurn 7s ease-in-out infinite;', NULL, NULL, 'Mythic', 'Sweeping golden beams and radiant dust announce a prestige profile.', 'Royal Metals'),
('bg_matrix', 'Matrix Background', 'profile_bg', '2500000', 'style', 'background-color: #001006; background-image: linear-gradient(rgba(0,255,91,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,91,0.12) 1px, transparent 1px), radial-gradient(ellipse at top, rgba(0,255,91,0.18), transparent 62%); background-size: 32px 32px, 32px 32px, 100% 100%; animation: digitalGridScroll 5s linear infinite;', NULL, NULL, 'Epic', 'A scrolling green data grid with a digital core glow.', 'Digital Landscape'),
('bg_mesh_cyan', 'Cyan Mesh', 'profile_bg', '750000', 'style', 'background-image: radial-gradient(at 0% 0%, #00c6ff 0px, transparent 50%), radial-gradient(at 100% 100%, #0072ff 0px, transparent 50%);', NULL, NULL, 'Rare', 'A soft cyan mesh gradient.', 'Digital Landscape'),
('bg_neon_grid', 'Neon Grid', 'profile_bg', '12000000', 'style', 'background-color: #07070d; background-image: linear-gradient(rgba(255,0,193,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,249,0.28) 1px, transparent 1px), radial-gradient(ellipse at bottom, rgba(145,70,255,0.3), transparent 65%); background-size: 40px 40px, 40px 40px, 100% 100%; animation: neonGridFlow 7s linear infinite;', NULL, NULL, 'Mythic', 'An animated cyan-magenta grid shifts across a neon horizon.', 'Digital Landscape'),
('bg_ocean_void', 'Ocean Void', 'profile_bg', '3000000', 'style', 'background-color: #000; background-image: radial-gradient(circle at 52% 46%, #00060a 0 20%, #001827 38%, #00618a 46%, #00111d 60%, #000 78%); background-size: 130% 130%; animation: voidFieldDrift 7.8s ease-in-out infinite reverse;', NULL, NULL, 'Epic', 'A dark core bends a cold blue oceanic horizon.', 'Voidwalker'),
    ('bg_sunset', 'Sunset Background', 'profile_bg', '1500000', 'style', 'background-color: #351242; background-image: radial-gradient(ellipse at 75% 25%, rgba(255,210,133,0.76), transparent 42%), linear-gradient(125deg, #592b84, #e64f74, #ff9b68, #592b84); background-size: 170% 170%, 240% 100%; animation: sunsetDrift 10s ease-in-out infinite;', NULL, NULL, 'Epic', 'Layered sunset light drifts across warm violet and coral bands.', NULL),
    ('bg_void', 'Void Background', 'profile_bg', '4500000', 'style', 'background-color: #000; background-image: radial-gradient(circle at 50% 48%, #000 0 25%, #080612 34%, #4d287d 43%, #11091d 50%, #000 72%); background-size: 145% 145%; box-shadow: inset 0 0 50px #000; animation: voidFieldDrift 8.5s ease-in-out infinite;', NULL, NULL, 'Mythic', 'A black center bends a visible violet event horizon across the card.', 'Voidwalker'),
    ('bg_prism_atmosphere', 'Prism Atmosphere', 'profile_bg', '0', 'style', 'background-color: #0b0b16; background-image: radial-gradient(circle at 18% 22%, rgba(110,231,249,0.42), transparent 38%), radial-gradient(circle at 82% 72%, rgba(249,168,212,0.35), transparent 42%), linear-gradient(135deg, #10102a, #17112b 54%, #0a1d2a); background-size: 140% 140%, 140% 140%, 100% 100%; background-position: 0% 0%, 100% 100%, 0% 0%;', NULL, NULL, 'Mythic', 'A calm prismatic atmosphere reserved for the Atelier expression pass.', 'Atelier Expression'),
('border_celestial', 'Celestial Border', 'profile_border', '20000000', 'class', 'border-celestial-anim', NULL, NULL, 'Mythic', 'A border fit for the stars.', 'Royal Metals'),
('border_chroma', 'Chroma Border', 'profile_border', '5000000', 'class', 'border-chroma-anim', NULL, NULL, 'Mythic', 'A full card border pulsing with chroma.', 'Chroma'),
('border_crystal', 'Crystal Border', 'profile_border', '6000000', 'class', 'border-crystal-anim', NULL, NULL, 'Mythic', 'A shimmering crystal border.', 'Royal Metals'),
('border_glitch', 'Glitch Border', 'profile_border', '12000000', 'class', 'border-glitch-anim', NULL, NULL, 'Mythic', 'A chaotic RGB glitch border.', 'Digital Landscape'),
('border_gold', 'Gold Border', 'profile_border', '4000000', 'class', 'border-gold-anim', NULL, NULL, 'Mythic', 'A rich metallic edge cycles from antique gold to a brilliant glint.', 'Royal Metals'),
('border_neon', 'Neon Border', 'profile_border', '1000000', 'class', 'border-neon-anim', NULL, NULL, 'Epic', 'Cyan and magenta electric currents trade places around your card.', 'Digital Landscape'),
('border_prism', 'Prism Border', 'profile_border', '2000000', 'class', 'border-prism-anim', NULL, NULL, 'Epic', 'Refracted cyan, pink, violet, and gold light travels around the edge.', 'Chroma'),
('border_void', 'Void Border', 'profile_border', '8000000', 'class', 'border-void-anim', NULL, NULL, 'Mythic', 'A border that absorbs light.', 'Voidwalker'),
('frame_100_day', 'Iron Will Frame', 'frame', '0', 'class', 'frame-streak-100', NULL, NULL, 'Mythic', 'Unlocked at a 100-day streak. A bright gold frame with a constant shine.', NULL),
('frame_30_day', 'Monthly Grinder Frame', 'frame', '0', 'class', 'frame-streak-30', NULL, NULL, 'Mythic', 'Unlocked at a 30-day streak. A breathing emerald milestone frame.', NULL),
('frame_365_day', 'Annual Frame', 'frame', '0', 'class', 'frame-streak-365', NULL, NULL, 'Mythic', 'Unlocked at a 365-day streak. A prismatic anniversary frame with a full aura.', NULL),
('frame_chroma', 'Chroma Frame', 'frame', '4000000', 'class', 'frame-chroma-anim', NULL, NULL, 'Epic', 'A saturated spectrum edge racing around a dark core.', 'Chroma'),
('frame_corner', 'Corner Accents', 'frame', '250000', 'class', 'frame-corner-accents', NULL, NULL, 'Rare', 'Four luminous corner brackets around your name frame.', 'Geometric'),
('frame_diamond', 'Diamond Frame', 'frame', '10000000', 'class', 'frame-diamond-anim', NULL, NULL, 'Mythic', 'An icy crystal frame with a fast white-blue shimmer.', 'Royal Metals'),
('frame_double', 'Holo Frame', 'frame', '1000000', 'class', 'frame_holo', NULL, NULL, 'Epic', 'An iridescent cyan-magenta frame with a moving holo sweep.', 'Geometric'),
('frame_gold_ring', 'Gold Ring', 'frame', '600000', 'style', 'border: 1px solid #f1c40f; box-shadow: 0 0 16px rgba(241,196,15,0.45);', NULL, NULL, 'Epic', 'A slim gold frame with a warm halo.', 'Royal Metals'),
('frame_neon_cyan', 'Cyan Frame', 'frame', '150000', 'style', 'border: 1px solid #22d3ee; box-shadow: 0 0 12px rgba(34,211,238,0.5);', NULL, NULL, 'Rare', 'A bright cyan frame with a soft electric glow.', NULL),
('frame_neon_pink', 'Pink Frame', 'frame', '150000', 'style', 'border: 1px solid #ff4fd8; box-shadow: 0 0 12px rgba(255,79,216,0.5);', NULL, NULL, 'Rare', 'A hot pink frame with a neon edge light.', NULL),
('frame_platinum', 'Platinum Frame', 'frame', '5000000', 'class', 'frame-platinum-shine', NULL, NULL, 'Mythic', 'A polished silver frame with a cold metallic shimmer.', 'Royal Metals'),
('frame_thin_white', 'Hairline Frame', 'frame', '40000', 'style', 'border: 1px solid rgba(255,255,255,0.35);', NULL, NULL, 'Uncommon', 'A thin white frame for a clean, minimal profile header.', NULL),
('lb_chroma', 'Chroma Row', 'lb_theme', '25000000', 'class', 'lb-chroma-theme', NULL, NULL, 'Mythic', 'A row of pure chroma.', 'Chroma'),
('lb_frosted', 'Frosted Glass', 'lb_theme', '2500000', 'style', 'background: linear-gradient(90deg, rgba(195, 226, 255, 0.28), rgba(255,255,255,0.16), rgba(195, 226, 255, 0.28)); border: 1px solid rgba(230,245,255,0.58); box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), inset 0 0 18px rgba(190,220,255,0.18), 0 12px 28px rgba(120,150,190,0.2), 0 0 0 1px rgba(210,235,255,0.18); backdrop-filter: blur(14px);', NULL, NULL, 'Epic', 'A bright frosted glass row with icy highlights and soft blur.', 'Geometric'),
('lb_glow', 'Glowing Row', 'lb_theme', '1000000', 'class', 'lb-glow-theme', NULL, NULL, 'Rare', 'Applies a custom background and border to your row on the global leaderboard.', NULL),
('lb_gold', 'Golden Row', 'lb_theme', '7500000', 'class', 'lb-gold-theme', NULL, NULL, 'Mythic', 'A premium golden leaderboard row with a bright shine.', NULL),
('lb_magma', 'Magma Row', 'lb_theme', '4000000', 'style', 'background-color: #3a0800; background-image: radial-gradient(circle at 20% 50%, rgba(255,232,120,0.9) 0 2%, transparent 14%), linear-gradient(105deg, #4b0800, #f12711, #ffcf4a, #7a1000, #ff6b00, #4b0800); background-size: 140% 140%, 260% 100%; border: 1px solid #ff6b1a; box-shadow: inset 0 0 18px rgba(80,0,0,0.72), 0 0 12px rgba(255,72,0,0.34); color: #fff !important; animation: magmaFlow 5s linear infinite;', NULL, NULL, 'Mythic', 'Molten veins and ember light flow through your leaderboard row.', 'Elemental'),
('lb_neon_outline', 'Neon Outline', 'lb_theme', '1000000', 'style', 'border: 2px solid #9146ff; box-shadow: -8px 0 18px rgba(145,70,255,0.32), 8px 0 12px rgba(0,255,249,0.12); animation: neonOutlineTravel 4s ease-in-out infinite;', NULL, NULL, 'Epic', 'Cyan and violet edge light travels around your row.', 'Digital Landscape'),
('lb_void', 'Void Row', 'lb_theme', '15000000', 'style', 'background-color: #000; background-image: radial-gradient(ellipse at 50% 50%, #000 0 22%, #080511 38%, #482775 47%, #090511 54%, #000 75%); background-size: 145% 190%; border: 1px solid rgba(186,151,255,0.58); color: #fff !important; animation: voidRowPulse 4.2s ease-in-out infinite;', NULL, NULL, 'Mythic', 'A black center bends cold light across your leaderboard row.', 'Voidwalker'),
('name_chroma', 'Chroma Name', 'name_effect', '25000000', 'class', 'chroma-name-anim', NULL, NULL, 'Mythic', 'A high-energy chroma sweep with the brightest spectral edge.', 'Chroma'),
('name_diamond_shimmer', 'Diamond Shimmer', 'name_effect', '6500000', 'class', 'diamond-shimmer-anim', NULL, NULL, 'Mythic', 'A diamond-white shimmer that slides across the text.', NULL),
('name_drop_shadow', 'Drop Shadow', 'name_effect', '50000', 'class', 'name_drop_shadow', NULL, NULL, 'Uncommon', 'A white name with a deep shadow for stronger contrast.', NULL),
('name_flicker_neon', 'Flickering Neon', 'name_effect', '1800000', 'class', 'flicker-neon-anim', NULL, NULL, 'Epic', 'A teal neon sign effect with intermittent flicker.', NULL),
('name_glitch_effect', 'Glitch Effect', 'name_effect', '9500000', 'class', 'glitch-anim', NULL, NULL, 'Mythic', 'A clean cyan-magenta glitch jitter across your name.', 'Voidwalker'),
('name_glow_blue', 'Blue Glow', 'name_effect', '100000', 'style', 'text-shadow: 0 0 10px #3498db; color: #fff;', NULL, NULL, 'Rare', 'Blue glow text that reads clearly on dark surfaces.', NULL),
('name_glow_gold', 'Gold Glow', 'name_effect', '500000', 'style', 'text-shadow: 0 0 15px #f1c40f; color: #fff;', NULL, NULL, 'Epic', 'A gold glow effect with a premium shine.', NULL),
('name_glow_green', 'Green Glow', 'name_effect', '100000', 'style', 'text-shadow: 0 0 10px #2ecc71; color: #fff;', NULL, NULL, 'Rare', 'Green glow text with a vivid neon edge.', NULL),
('name_glow_pink_neon', 'Neon Pink Glow', 'name_effect', '250000', 'style', 'text-shadow: 0 0 5px #ff00de, 0 0 10px #ff00de; color: #fff;', NULL, NULL, 'Rare', 'A bright neon pink text glow.', NULL),
('name_glow_purple', 'Purple Glow', 'name_effect', '100000', 'style', 'text-shadow: 0 0 10px #9b59b6; color: #fff;', NULL, NULL, 'Rare', 'Purple glow text with a softer magenta tint.', NULL),
('name_glow_red', 'Red Glow', 'name_effect', '100000', 'style', 'text-shadow: 0 0 10px #ff4c4c; color: #fff;', NULL, NULL, 'Rare', 'Red glow text with a hot, alert-style edge.', NULL),
('name_gradient_fire', 'Fire Gradient', 'name_effect', '750000', 'style', 'background: linear-gradient(45deg, #f12711, #f5af19); -webkit-background-clip: text; background-clip: text; color: transparent;', NULL, NULL, 'Epic', 'A warm fire gradient for a hotter username look.', NULL),
('name_gradient_purple', 'Purple Gradient', 'name_effect', '500000', 'style', 'background: linear-gradient(45deg, #8E2DE2, #4A00E0); -webkit-background-clip: text; background-clip: text; color: transparent;', NULL, NULL, 'Epic', 'A purple gradient that clips directly to your name.', NULL),
('name_holographic', 'Holographic', 'name_effect', '6000000', 'class', 'name_holographic', NULL, NULL, 'Mythic', 'A silver-cyan holographic sweep with a glossy shine.', 'Spectrum'),
('name_ice', 'Ice Gradient', 'name_effect', '750000', 'style', 'background: linear-gradient(45deg, #a1c4fd, #c2e9fb); -webkit-background-clip: text; background-clip: text; color: transparent;', NULL, NULL, 'Epic', 'A pale blue gradient with a cold glassy finish.', 'Elemental'),
('name_inferno', 'Inferno Name', 'name_effect', '13500000', 'class', 'inferno-name-anim', NULL, NULL, 'Mythic', 'A flame-like name effect with hot highlights.', NULL),
('name_italic', 'Italic Font', 'name_effect', '50000', 'style', 'font-style: italic; color: #fff;', NULL, NULL, 'Uncommon', 'An italic username with a sharp, clean slant.', NULL),
('name_matrix_rain', 'Matrix Rain', 'name_effect', '4500000', 'class', 'matrix-rain-anim', NULL, NULL, 'Mythic', 'Green matrix-style text rain for a cyber look.', NULL),
('name_ocean_wave', 'Ocean Wave', 'name_effect', '11500000', 'class', 'ocean-wave-anim', NULL, NULL, 'Mythic', 'A blue wave gradient that moves across your name.', NULL),
('name_pulsing_glow', 'Pulsing Glow', 'name_effect', '2500000', 'class', 'pulsing-glow-anim', NULL, NULL, 'Epic', 'A soft pulsing glow around your username.', NULL),
('name_rainbow', 'Rainbow Shift', 'name_effect', '1800000', 'class', 'rainbow-text-anim', NULL, NULL, 'Epic', 'Animated rainbow text that cycles through the spectrum.', 'Spectrum'),
('name_shining_gold', 'Shining Gold Name', 'name_effect', '2500000', 'class', 'shining-gold-anim', NULL, NULL, 'Epic', 'An animated gold gradient that shimmers across the text.', 'Royal Metals'),
('name_slow_pulse', 'Slow Pulse', 'name_effect', '1000000', 'class', 'slow-pulse-name-anim', NULL, NULL, 'Epic', 'A soft white name that pulses with a slow blue glow.', 'Elemental'),
('name_smallcaps', 'Small Caps', 'name_effect', '75000', 'style', 'font-variant: small-caps; color: #fff; letter-spacing: 1px;', NULL, NULL, 'Uncommon', 'A small-caps username with a refined look.', NULL),
('name_sunset_blur', 'Sunset Blur', 'name_effect', '13500000', 'class', 'sunset-blur-anim', NULL, NULL, 'Mythic', 'A warm sunset gradient with a blurred glow.', NULL),
    ('name_toxic', 'Toxic Gradient', 'name_effect', '750000', 'style', 'background: linear-gradient(45deg, #43e97b, #38f9d7); -webkit-background-clip: text; background-clip: text; color: transparent;', NULL, NULL, 'Epic', 'A bright acid-green gradient with a chemical glow.', 'Elemental'),
    ('name_void', 'Void Name', 'name_effect', '20000000', 'class', 'name_void', NULL, NULL, 'Mythic', 'A near-black name bends cold cyan-violet light around its edge.', 'Voidwalker'),
    ('name_prism_atelier', 'Prism Atelier Name', 'name_effect', '0', 'style', 'color: transparent; background: linear-gradient(90deg, #6ee7f9, #c4b5fd, #f9a8d4); -webkit-background-clip: text; background-clip: text; text-shadow: 0 0 18px rgba(196,181,253,0.65);', NULL, NULL, 'Mythic', 'A restrained spectrum signature for players who want the name to carry the atmosphere.', 'Atelier Expression'),
('orb_diamond', 'Diamond Orb', 'orb_shape', '1000000', 'class', 'orb-shape-diamond', NULL, NULL, 'Epic', 'A cut crystal orb with shifting facets and an icy flare.', 'Geometric'),
('orb_hexagon', 'Hexagon Orb', 'orb_shape', '500000', 'class', 'orb-shape-hexagon', NULL, NULL, 'Rare', 'A beveled hex core with layered facets and a cool pulse.', 'Geometric'),
('orb_square', 'Holo Cube', 'orb_shape', '2000000', 'class', 'orb-shape-square', NULL, NULL, 'Epic', 'An isometric cube with dimensional faces and drifting holographic light.', 'Geometric'),
('orb_star', 'Radiant Star', 'orb_shape', '8000000', 'class', 'orb-shape-star', NULL, NULL, 'Mythic', 'An eight-point stellar core that blooms with prismatic light.', 'Geometric'),
('orb_triangle', 'Prism Shard', 'orb_shape', '4000000', 'class', 'orb-shape-triangle', NULL, NULL, 'Mythic', 'A floating prism shard split into light and shadow facets.', 'Geometric'),
('roll_black_hole', 'Black Hole', 'roll_effect', '20000000', 'class', 'roll-black-hole-anim', NULL, NULL, 'Mythic', 'A gravitational pull effect.', 'Voidwalker'),
('roll_chroma', 'Chroma Aura', 'roll_effect', '15000000', 'class', 'roll-chroma-anim', NULL, NULL, 'Mythic', 'A blinding display of wealth and power.', 'Chroma'),
('roll_chromatic', 'Cyber Pulse', 'roll_effect', '4000000', 'class', 'roll-cyber-pulse-anim', NULL, NULL, 'Mythic', 'A pulsing ring of cyan and magenta.', 'Spectrum'),
('roll_inferno', 'Inferno Aura', 'roll_effect', '4500000', 'class', 'roll-inferno-anim', NULL, NULL, 'Mythic', 'A hot orange-red aura around your roll orb.', NULL),
('roll_neon_rings', 'Neon Rings', 'roll_effect', '2000000', 'class', 'roll-neon-rings-anim', NULL, NULL, 'Epic', 'Pulsing neon rings around your orb.', 'Digital Landscape'),
('roll_pixelate', 'Nova Bloom', 'roll_effect', '8000000', 'class', 'roll-pixelate-anim', NULL, NULL, 'Mythic', 'A brilliant stellar core erupts into a repeating shockwave.', 'Digital Landscape'),
('roll_smoke', 'Nebula Veil', 'roll_effect', '500000', 'class', 'roll-smoke-anim', NULL, NULL, 'Epic', 'Layered cyan-violet nebula clouds drift around your roll orb.', 'Elemental'),
('roll_sparkles', 'Starlight Aura', 'roll_effect', '1000000', 'class', 'roll-sparkles-anim', NULL, NULL, 'Epic', 'A crisp orbit of varied stars twinkles around your roll orb.', NULL),
('streak_freeze', 'Streak Freeze', 'consumable', '100000', 'text', 'Protects your streak if you miss a day.', NULL, NULL, 'Rare', 'Protects your streak if you miss a day.', NULL),
('title_founder', 'Founder Title', 'title', '0', 'text', '✦ FOUNDER ✦', NULL, '2026-07-10', 'Mythic', 'Reserved for people whose early contributions helped shape ChromaDie.', 'Project Legacy')
ON CONFLICT (item_key) DO NOTHING;

UPDATE public.shop_items
SET cost = CASE item_key
  WHEN 'bg_aurora' THEN 200000
  WHEN 'bg_blood_void' THEN 300000
  WHEN 'bg_deep_space' THEN 325000
  WHEN 'bg_geo_grid' THEN 130000
  WHEN 'bg_god_rays' THEN 1250000
  WHEN 'bg_matrix' THEN 300000
  WHEN 'bg_mesh_cyan' THEN 90000
  WHEN 'bg_neon_grid' THEN 475000
  WHEN 'bg_ocean_void' THEN 300000
  WHEN 'bg_sunset' THEN 210000
  WHEN 'bg_void' THEN 225000
  WHEN 'bg_prism_atmosphere' THEN 0
  WHEN 'border_celestial' THEN 800000
  WHEN 'border_chroma' THEN 250000
  WHEN 'border_crystal' THEN 275000
  WHEN 'border_glitch' THEN 500000
  WHEN 'border_gold' THEN 175000
  WHEN 'border_neon' THEN 140000
  WHEN 'border_prism' THEN 250000
  WHEN 'border_void' THEN 350000
  WHEN 'frame_100_day' THEN 0
  WHEN 'frame_30_day' THEN 0
  WHEN 'frame_365_day' THEN 0
  WHEN 'frame_chroma' THEN 300000
  WHEN 'frame_corner' THEN 60000
  WHEN 'frame_diamond' THEN 425000
  WHEN 'frame_double' THEN 150000
  WHEN 'frame_gold_ring' THEN 90000
  WHEN 'frame_neon_cyan' THEN 50000
  WHEN 'frame_neon_pink' THEN 55000
  WHEN 'frame_platinum' THEN 275000
  WHEN 'frame_thin_white' THEN 15000
  WHEN 'lb_chroma' THEN 1250000
  WHEN 'lb_frosted' THEN 300000
  WHEN 'lb_glow' THEN 100000
  WHEN 'lb_gold' THEN 325000
  WHEN 'lb_magma' THEN 175000
  WHEN 'lb_neon_outline' THEN 160000
  WHEN 'lb_void' THEN 650000
  WHEN 'name_chroma' THEN 1250000
  WHEN 'name_diamond_shimmer' THEN 300000
  WHEN 'name_drop_shadow' THEN 20000
  WHEN 'name_flicker_neon' THEN 225000
  WHEN 'name_glitch_effect' THEN 400000
  WHEN 'name_glow_blue' THEN 30000
  WHEN 'name_glow_gold' THEN 75000
  WHEN 'name_glow_green' THEN 35000
  WHEN 'name_glow_pink_neon' THEN 70000
  WHEN 'name_glow_purple' THEN 40000
  WHEN 'name_glow_red' THEN 45000
  WHEN 'name_gradient_fire' THEN 100000
  WHEN 'name_gradient_purple' THEN 80000
  WHEN 'name_holographic' THEN 300000
  WHEN 'name_ice' THEN 110000
  WHEN 'name_inferno' THEN 550000
  WHEN 'name_italic' THEN 25000
  WHEN 'name_matrix_rain' THEN 225000
  WHEN 'name_ocean_wave' THEN 450000
  WHEN 'name_pulsing_glow' THEN 300000
  WHEN 'name_rainbow' THEN 240000
  WHEN 'name_shining_gold' THEN 300000
  WHEN 'name_slow_pulse' THEN 170000
  WHEN 'name_smallcaps' THEN 35000
  WHEN 'name_sunset_blur' THEN 600000
  WHEN 'name_toxic' THEN 120000
  WHEN 'name_void' THEN 900000
  WHEN 'name_prism_atelier' THEN 0
  WHEN 'orb_diamond' THEN 180000
  WHEN 'orb_hexagon' THEN 80000
  WHEN 'orb_square' THEN 260000
  WHEN 'orb_star' THEN 350000
  WHEN 'orb_triangle' THEN 200000
  WHEN 'roll_black_hole' THEN 1000000
  WHEN 'roll_chroma' THEN 700000
  WHEN 'roll_chromatic' THEN 200000
  WHEN 'roll_inferno' THEN 250000
  WHEN 'roll_neon_rings' THEN 275000
  WHEN 'roll_pixelate' THEN 375000
  WHEN 'roll_smoke' THEN 85000
  WHEN 'roll_sparkles' THEN 190000
  WHEN 'streak_freeze' THEN 50000
  WHEN 'title_founder' THEN 0
  ELSE cost
END;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key
) VALUES
  ('bg_rain', 'Rainfall', 'profile_atmosphere', 1200000, 'class', 'profile-effect-rain', NULL, NULL, 'Epic', 'Animated rain overlay across the full profile page.', 'Weather', false, 'earned', NULL),
  ('bg_snow', 'Soft Snow', 'profile_atmosphere', 1800000, 'class', 'profile-effect-snow', NULL, NULL, 'Epic', 'Animated snow overlay across the full profile page.', 'Weather', false, 'earned', NULL),
  ('bg_fireflies', 'Fireflies', 'profile_atmosphere', 2400000, 'class', 'profile-effect-fireflies', NULL, NULL, 'Mythic', 'Animated firefly lights across the full profile page.', 'Weather', false, 'earned', NULL),
  ('bg_scanlines', 'Signal Scanlines', 'profile_atmosphere', 900000, 'class', 'profile-effect-scanlines', NULL, NULL, 'Rare', 'Animated scanlines across the full profile page.', 'Digital Landscape', false, 'earned', NULL)
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
  entitlement_key = EXCLUDED.entitlement_key;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key
) VALUES
  ('bg_signal_garden', 'Signal Garden', 'profile_bg', 260000, 'class', 'bg-signal-garden', NULL, NULL, 'Rare', 'A warm black field with restrained lime and amber signal lights.', 'Signal Garden', false, 'earned', NULL),
  ('border_signal', 'Signal Border', 'profile_border', 190000, 'class', 'border-signal-anim', NULL, NULL, 'Rare', 'A quiet lime-to-amber edge with a slow pulse.', 'Signal Garden', false, 'earned', NULL),
  ('frame_signal', 'Signal Frame', 'frame', 140000, 'class', 'frame-signal-anim', NULL, NULL, 'Rare', 'A thin frame with lime and amber edge light.', 'Signal Garden', false, 'earned', NULL),
  ('name_signal', 'Signal Name', 'name_effect', 220000, 'class', 'name-signal-anim', NULL, NULL, 'Rare', 'A lime and amber name treatment with a slow light pass.', 'Signal Garden', false, 'earned', NULL),
  ('orb_signal', 'Signal Core', 'orb_shape', 110000, 'class', 'orb-shape-signal', NULL, NULL, 'Rare', 'A faceted lime core with a warm amber highlight.', 'Signal Garden', false, 'earned', NULL),
  ('roll_signal', 'Signal Pulse', 'roll_effect', 240000, 'class', 'roll-signal-anim', NULL, NULL, 'Rare', 'A restrained lime and amber pulse around your roll orb.', 'Signal Garden', false, 'earned', NULL)
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
  entitlement_key = EXCLUDED.entitlement_key;

UPDATE public.shop_items
SET catalog_status = 'legacy'
WHERE item_key IN (
  'name_prism_atelier', 'name_drop_shadow', 'name_italic', 'name_glow_blue',
  'name_glow_green', 'name_smallcaps', 'name_glow_purple', 'name_glow_red',
  'name_glow_pink_neon', 'name_glow_gold', 'name_gradient_purple',
  'name_gradient_fire', 'name_ice', 'name_toxic', 'name_slow_pulse',
  'name_signal', 'name_flicker_neon', 'name_matrix_rain', 'name_rainbow',
  'name_diamond_shimmer', 'name_holographic', 'name_pulsing_glow',
  'name_shining_gold', 'name_glitch_effect', 'name_ocean_wave', 'name_inferno',
  'name_sunset_blur', 'name_void', 'name_chroma'
);

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_font_editorial_serif', 'Editorial Serif', 'name_font', 180000, 'renderer', 'editorial-serif', NULL, NULL, 'Rare', 'A measured serif with high-contrast strokes for an archival signature.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_font_condensed_sans', 'Condensed Sans', 'name_font', 180000, 'renderer', 'condensed-sans', NULL, NULL, 'Rare', 'A narrow sans-serif that gives the name a compact editorial profile.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_font_wide_geometric', 'Wide Geometric', 'name_font', 180000, 'renderer', 'wide-geometric', NULL, NULL, 'Rare', 'A broad geometric display face with open, architectural forms.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_font_mono_compact', 'Mono Compact', 'name_font', 120000, 'renderer', 'mono-compact', NULL, NULL, 'Uncommon', 'A precise bundled monospace with compact technical rhythm.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_font_rounded_mono', 'Rounded Mono', 'name_font', 170000, 'renderer', 'rounded-mono', NULL, NULL, 'Rare', 'A softened monospace with rounded terminals and steady spacing.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_font_soft_grotesk', 'Soft Grotesk', 'name_font', 130000, 'renderer', 'soft-grotesk', NULL, NULL, 'Uncommon', 'A calm modern sans with balanced proportions for everyday identity.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_font_humanist_display', 'Humanist Display', 'name_font', 190000, 'renderer', 'humanist-display', NULL, NULL, 'Rare', 'A warm humanist display face with readable, lifted curves.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_font_modern_fraktur', 'Modern Fraktur', 'name_font', 320000, 'renderer', 'modern-fraktur', NULL, NULL, 'Epic', 'A dramatic blackletter-inspired face with carved historical character.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_font_pixel_display', 'Pixel Display', 'name_font', 190000, 'renderer', 'pixel-display', NULL, NULL, 'Rare', 'A squared display face that gives the name a deliberate digital edge.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_font_high_contrast_italic', 'High-Contrast Italic', 'name_font', 310000, 'renderer', 'high-contrast-italic', NULL, NULL, 'Epic', 'A sharp italic display face with a fashion-editorial slant.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_font_neo_slab', 'Neo Slab', 'name_font', 210000, 'renderer', 'neo-slab', NULL, NULL, 'Rare', 'A sturdy slab serif that gives the name a printed, grounded weight.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_font_reverse_contrast', 'Reverse Contrast', 'name_font', 330000, 'renderer', 'reverse-contrast', NULL, NULL, 'Epic', 'A sculptural display face with unexpected thick-and-thin contrast.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_font_industrial_stencil', 'Industrial Stencil', 'name_font', 340000, 'renderer', 'industrial-stencil', NULL, NULL, 'Epic', 'A cut stencil face with utilitarian, engineered lettering.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_font_futurist_extended', 'Futurist Extended', 'name_font', 230000, 'renderer', 'futurist-extended', NULL, NULL, 'Rare', 'An extended geometric face that stretches the name into a horizon.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_font_terminal_bitmap', 'Terminal Bitmap', 'name_font', 190000, 'renderer', 'terminal-bitmap', NULL, NULL, 'Rare', 'A low-resolution terminal face with unmistakable screen-era texture.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_font_rounded_display', 'Rounded Display', 'name_font', 210000, 'renderer', 'rounded-display', NULL, NULL, 'Rare', 'A friendly rounded display face with soft, confident volume.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_font_marker_tag', 'Marker Tag', 'name_font', 350000, 'renderer', 'marker-tag', NULL, NULL, 'Epic', 'A hand-marked face that gives the name a quick, personal gesture.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_font_newspaper_black', 'Newspaper Black', 'name_font', 320000, 'renderer', 'newspaper-black', NULL, NULL, 'Epic', 'A dense headline face with the authority of a printed front page.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_polished_chrome', 'Polished Chrome', 'name_material', 340000, 'renderer', 'polished-chrome', NULL, NULL, 'Epic', 'A cool reflective metal finish with crisp silver highlights across the letters.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_copper_press', 'Copper Press', 'name_material', 220000, 'renderer', 'copper-press', NULL, NULL, 'Rare', 'A warm pressed-copper surface with dark edges and burnished light.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_material_glass_emboss', 'Glass Emboss', 'name_material', 350000, 'renderer', 'glass-emboss', NULL, NULL, 'Epic', 'A translucent embossed surface with a raised, refracted edge.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_fine_outline', 'Fine Outline', 'name_material', 140000, 'renderer', 'fine-outline', NULL, NULL, 'Uncommon', 'A precise hairline contour that lets the daily color breathe through.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_ink_bleed', 'Ink Bleed', 'name_material', 210000, 'renderer', 'ink-bleed', NULL, NULL, 'Rare', 'A soft paper-and-ink edge that blooms gently beyond the glyphs.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_pearl_foil', 'Pearl Foil', 'name_material', 360000, 'renderer', 'pearl-foil', NULL, NULL, 'Epic', 'A pearlescent foil with quiet pastel reflections and a polished face.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_carbon_cut', 'Carbon Cut', 'name_material', 230000, 'renderer', 'carbon-cut', NULL, NULL, 'Rare', 'A dark carbon surface scored with restrained silver facets.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_frosted_edge', 'Frosted Edge', 'name_material', 210000, 'renderer', 'frosted-edge', NULL, NULL, 'Rare', 'An icy face with a clean frosted rim and high readability.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_material_holographic_film', 'Holographic Film', 'name_material', 540000, 'renderer', 'holographic-film', NULL, NULL, 'Anomaly', 'A thin holographic film that shifts through restrained spectral bands.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_cut_paper', 'Cut Paper', 'name_material', 200000, 'renderer', 'cut-paper', NULL, NULL, 'Rare', 'Layered paper edges give the name a tactile handmade profile.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_neon_tube', 'Neon Tube', 'name_material', 380000, 'renderer', 'neon-tube', NULL, NULL, 'Epic', 'A bounded neon-tube face with a bright inner core and colored rim.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_material_liquid_mercury', 'Liquid Mercury', 'name_material', 560000, 'renderer', 'liquid-mercury', NULL, NULL, 'Anomaly', 'A fluid mercury surface with bright specular bands and dark weight.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_oil_slick', 'Oil Slick', 'name_material', 390000, 'renderer', 'oil-slick', NULL, NULL, 'Epic', 'An oil-slick surface blends deep violet, teal, and amber reflections.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_thermal_ink', 'Thermal Ink', 'name_material', 380000, 'renderer', 'thermal-ink', NULL, NULL, 'Epic', 'Heat-responsive ink shifts from cool violet through cyan, gold, and rose.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_material_velvet_ink', 'Velvet Ink', 'name_material', 250000, 'renderer', 'velvet-ink', NULL, NULL, 'Rare', 'A plush velvet surface with a saturated pile and soft highlight.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_material_embroidered_thread', 'Embroidered Thread', 'name_material', 370000, 'renderer', 'embroidered-thread', NULL, NULL, 'Epic', 'Thread-like ridges give the letters a tactile stitched surface.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_engraved_stone', 'Engraved Stone', 'name_material', 260000, 'renderer', 'engraved-stone', NULL, NULL, 'Rare', 'A carved stone face with durable shadowed grooves and pale edges.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_crt_phosphor', 'CRT Phosphor', 'name_material', 350000, 'renderer', 'crt-phosphor', NULL, NULL, 'Epic', 'A green phosphor face with a controlled screen glow and scan texture.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_material_gold_leaf', 'Gold Leaf', 'name_material', 570000, 'renderer', 'gold-leaf', NULL, NULL, 'Anomaly', 'Layered gold leaf catches warm highlights across the letterforms.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_chroma_glass', 'Chroma Glass', 'name_material', 400000, 'renderer', 'chroma-glass', NULL, NULL, 'Epic', 'A translucent glass face carries a bounded spectrum around the daily color.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_ceramic_glaze', 'Ceramic Glaze', 'name_material', 390000, 'renderer', 'ceramic-glaze', NULL, NULL, 'Epic', 'A fired ceramic glaze adds a smooth warm coat and deep edge.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_material_blueprint_ink', 'Blueprint Ink', 'name_material', 240000, 'renderer', 'blueprint-ink', NULL, NULL, 'Rare', 'A technical blue ink face with pale drafting-line highlights.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_velvet_sweep', 'Velvet Sweep', 'name_motion', 360000, 'renderer', 'velvet-sweep', NULL, NULL, 'Epic', 'A soft satin highlight travels across the name.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_motion_refraction_sweep', 'Refraction Sweep', 'name_motion', 350000, 'renderer', 'refraction-sweep', NULL, NULL, 'Epic', 'Cyan and rose refraction bands cross the letters.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_ghost_offset', 'Ghost Offset', 'name_motion', 320000, 'renderer', 'ghost-offset', NULL, NULL, 'Epic', 'Slow chromatic echoes drift behind the name.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_focus_resolve', 'Focus Resolve', 'name_motion', 230000, 'renderer', 'focus-resolve', NULL, NULL, 'Rare', 'The name resolves from controlled blur.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_motion_mask_reveal', 'Mask Reveal', 'name_motion', 210000, 'renderer', 'mask-reveal', NULL, NULL, 'Rare', 'A clean horizontal reveal.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_quiet_afterimage', 'Quiet Afterimage', 'name_motion', 240000, 'renderer', 'quiet-afterimage', NULL, NULL, 'Rare', 'A restrained delayed copy trails the text.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_soft_rise', 'Soft Rise', 'name_motion', 150000, 'renderer', 'soft-rise', NULL, NULL, 'Uncommon', 'A subtle entrance from below.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_motion_scanline_reveal', 'Scanline Reveal', 'name_motion', 330000, 'renderer', 'scanline-reveal', NULL, NULL, 'Epic', 'A scanning line reveals the name.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_particle_drift', 'Particle Drift', 'name_motion', 370000, 'renderer', 'particle-drift', NULL, NULL, 'Epic', 'Small particles lift from the letterforms.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_letter_shuffle', 'Letter Shuffle', 'name_motion', 520000, 'renderer', 'letter-shuffle', NULL, NULL, 'Anomaly', 'Characters rearrange before locking into place.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_fuzzy_signal', 'Fuzzy Signal', 'name_motion', 340000, 'renderer', 'fuzzy-signal', NULL, NULL, 'Epic', 'Controlled horizontal signal slices distort the name.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_typewriter_name', 'Typewriter Name', 'name_motion', 230000, 'renderer', 'typewriter-name', NULL, NULL, 'Rare', 'Characters appear one by one.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_chromatic_ripple', 'Chromatic Ripple', 'name_motion', 410000, 'renderer', 'chromatic-ripple', NULL, NULL, 'Epic', 'A colored wave bends vertical sections of the letters.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_liquid_fill', 'Liquid Fill', 'name_motion', 580000, 'renderer', 'liquid-fill', NULL, NULL, 'Anomaly', 'Today’s color rises inside the name and settles.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_pixel_dissolve', 'Pixel Dissolve', 'name_motion', 390000, 'renderer', 'pixel-dissolve', NULL, NULL, 'Epic', 'The name assembles from a field of square fragments.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_echo_collapse', 'Echo Collapse', 'name_motion', 380000, 'renderer', 'echo-collapse', NULL, NULL, 'Epic', 'Distant copies converge into the final name.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_motion_heat_shimmer', 'Heat Shimmer', 'name_motion', 270000, 'renderer', 'heat-shimmer', NULL, NULL, 'Rare', 'Thin horizontal bands refract like rising heat.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_motion_signal_lock', 'Signal Lock', 'name_motion', 370000, 'renderer', 'signal-lock', NULL, NULL, 'Epic', 'Misaligned signal slices snap cleanly into place.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_letter_cascade', 'Letter Cascade', 'name_motion', 380000, 'renderer', 'letter-cascade', NULL, NULL, 'Epic', 'Characters fall individually into their final positions.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_orbiting_spark', 'Orbiting Spark', 'name_motion', 400000, 'renderer', 'orbiting-spark', NULL, NULL, 'Epic', 'A bright spark traces around the name.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_color_memory', 'Color Memory', 'name_motion', 600000, 'renderer', 'color-memory', NULL, NULL, 'Anomaly', 'Recent rolled colors pass through the lettering in sequence.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_daily_pulse', 'Daily Pulse', 'name_motion', 410000, 'renderer', 'daily-pulse', NULL, NULL, 'Epic', 'Today’s color blooms outward from the center.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_motion_prism_shatter', 'Prism Shatter', 'name_motion', 760000, 'renderer', 'prism-shatter', NULL, NULL, 'Mythic', 'Faceted fragments separate and reassemble.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_ink_spread', 'Ink Spread', 'name_motion', 390000, 'renderer', 'ink-spread', NULL, NULL, 'Epic', 'Soft ink expands into crisp finished letterforms.', 'Archive', false, 'earned', NULL, 'active')
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
('shop_version', '2026-08-02T18:00:00Z'),
('cotw_target', '73,114,201'),
('official_launch_at', '2026-07-11T00:00:00Z'),
('founder_window_ends_at', '2026-08-11T00:00:00Z')
ON CONFLICT (key) DO NOTHING;
