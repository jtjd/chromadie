-- Fifteen new free motions and five authored replacements. Stable owned IDs.
BEGIN;
-- Extend the existing expression rather than reconstructing unrelated slots.
DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO STRICT definition
    FROM pg_constraint WHERE conrelid = 'public.shop_items'::regclass
      AND conname = 'shop_items_shape_check';
  IF position('''letterpress''' in definition) = 0 THEN
    RAISE EXCEPTION 'Expected existing letterpress allowlist anchor';
  END IF;
  definition := replace(definition, '''letterpress''', '''letterpress'', ''cherry-blossom'', ''butterfly-kiss'', ''bubble-bath'', ''kitten-paws'', ''dandelion-wish'', ''rose-romance'', ''raven-feather'', ''falling-ace'', ''crown-glint'', ''meteor-skip'', ''laurel-grow'', ''paper-plane'', ''tide-pool'', ''firefly-dance'', ''confetti-parade''');
  ALTER TABLE public.shop_items DROP CONSTRAINT shop_items_shape_check;
  EXECUTE 'ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check ' || definition;
END $migration$;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_motion_kinetic_echo', 'Ribbon Waltz', 'name_motion', 0, 'renderer', 'kinetic-echo', NULL, NULL, 'Epic', 'Satin ribbon loops beneath the name.', 'Prism', false, 'free', NULL, 'active'),
  ('name_motion_neon_particle', 'Firebrand', 'name_motion', 0, 'renderer', 'neon-particle', NULL, NULL, 'Anomaly', 'Amber flames release rising embers.', 'Signal', false, 'free', NULL, 'active'),
  ('name_motion_ion_sweep', 'Sword Flourish', 'name_motion', 0, 'renderer', 'ion-sweep', NULL, NULL, 'Epic', 'A sword sweeps a golden arc.', 'Signal', false, 'free', NULL, 'active'),
  ('name_motion_phase_fracture', 'Ink Impact', 'name_motion', 0, 'renderer', 'phase-fracture', NULL, NULL, 'Epic', 'A scarlet brush scatters wet ink.', 'Static Bloom', false, 'free', NULL, 'active'),
  ('name_motion_letterpress', 'Wax Seal', 'name_motion', 0, 'renderer', 'letterpress', NULL, NULL, 'Rare', 'A wax seal reveals a gold star.', 'Archive', false, 'free', NULL, 'active'),
  ('name_motion_cherry_blossom', 'Cherry Blossom', 'name_motion', 0, 'renderer', 'cherry-blossom', NULL, NULL, 'Rare', 'A blossom releases tumbling petals.', 'Prism', false, 'free', NULL, 'active'),
  ('name_motion_butterfly_kiss', 'Butterfly Kiss', 'name_motion', 0, 'renderer', 'butterfly-kiss', NULL, NULL, 'Rare', 'A butterfly lands and takes flight.', 'Prism', false, 'free', NULL, 'active'),
  ('name_motion_bubble_bath', 'Bubble Bath', 'name_motion', 0, 'renderer', 'bubble-bath', NULL, NULL, 'Rare', 'Soap bubbles wobble and pop.', 'Prism', false, 'free', NULL, 'active'),
  ('name_motion_kitten_paws', 'Kitten Paws', 'name_motion', 0, 'renderer', 'kitten-paws', NULL, NULL, 'Rare', 'Rosy paw prints tiptoe across letters.', 'Prism', false, 'free', NULL, 'active'),
  ('name_motion_dandelion_wish', 'Dandelion Wish', 'name_motion', 0, 'renderer', 'dandelion-wish', NULL, NULL, 'Rare', 'Dandelion seeds sail on a breeze.', 'Archive', false, 'free', NULL, 'active'),
  ('name_motion_rose_romance', 'Rose Romance', 'name_motion', 0, 'renderer', 'rose-romance', NULL, NULL, 'Epic', 'A leafy stem blooms into a rose.', 'Prism', false, 'free', NULL, 'active'),
  ('name_motion_raven_feather', 'Raven Feather', 'name_motion', 0, 'renderer', 'raven-feather', NULL, NULL, 'Epic', 'A raven feather drifts through the air.', 'Static Bloom', false, 'free', NULL, 'active'),
  ('name_motion_falling_ace', 'Falling Ace', 'name_motion', 0, 'renderer', 'falling-ace', NULL, NULL, 'Epic', 'An ace tumbles in, flips, and flicks away.', 'Archive', false, 'free', NULL, 'active'),
  ('name_motion_crown_glint', 'Crown Glint', 'name_motion', 0, 'renderer', 'crown-glint', NULL, NULL, 'Epic', 'A gold crown catches glints.', 'Signal', false, 'free', NULL, 'active'),
  ('name_motion_meteor_skip', 'Meteor Skip', 'name_motion', 0, 'renderer', 'meteor-skip', NULL, NULL, 'Epic', 'A comet skips with golden rings.', 'Signal', false, 'free', NULL, 'active'),
  ('name_motion_laurel_grow', 'Laurel Grow', 'name_motion', 0, 'renderer', 'laurel-grow', NULL, NULL, 'Epic', 'Laurels grow and turn gold.', 'Archive', false, 'free', NULL, 'active'),
  ('name_motion_paper_plane', 'Paper Plane', 'name_motion', 0, 'renderer', 'paper-plane', NULL, NULL, 'Rare', 'A paper plane loops past the name.', 'Archive', false, 'free', NULL, 'active'),
  ('name_motion_tide_pool', 'Tide Pool', 'name_motion', 0, 'renderer', 'tide-pool', NULL, NULL, 'Rare', 'A turquoise wave lifts the letters.', 'Prism', false, 'free', NULL, 'active'),
  ('name_motion_firefly_dance', 'Firefly Dance', 'name_motion', 0, 'renderer', 'firefly-dance', NULL, NULL, 'Rare', 'Fireflies dance with warm pulses.', 'Prism', false, 'free', NULL, 'active'),
  ('name_motion_confetti_parade', 'Confetti Parade', 'name_motion', 0, 'renderer', 'confetti-parade', NULL, NULL, 'Rare', 'Confetti tumbles as the letters bounce.', 'Prism', false, 'free', NULL, 'active')
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  rarity = EXCLUDED.rarity, collection = EXCLUDED.collection;

INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-09-22T12:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
COMMIT;
