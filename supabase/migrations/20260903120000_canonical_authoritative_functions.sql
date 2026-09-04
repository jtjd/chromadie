-- Canonical authoritative function definitions.
--
-- This migration intentionally freezes complete final bodies instead of
-- deriving functions from pg_get_functiondef() and textual replacement. Older
-- migrations remain immutable production history; future changes must edit a
-- complete definition in a new migration.

BEGIN;

-- The v6 scorer is generated from the canonical JavaScript scoring spec and
-- is reproduced here verbatim as the final database authority.
CREATE OR REPLACE FUNCTION public.calculate_roll_v6(p_r integer, p_g integer, p_b integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_catalog jsonb := '[{"id":"spectrum_presence","name":"Spectrum Presence","category":"identity","predicate":{"type":"always"},"semanticTags":[],"symbol":"🌈","description":"Every valid RGB color belongs to the spectrum.","active":true,"matchCount":16777216,"probability":1,"expectedRolls":1,"rarity":"Common","probabilityReward":500,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_even","name":"Even Pulse","category":"mathematical","predicate":{"type":"sumModulo","divisor":2,"remainder":0},"semanticTags":[],"symbol":"⚖️","description":"The RGB channel sum is even.","active":true,"matchCount":8388608,"probability":0.5,"expectedRolls":2,"rarity":"Common","probabilityReward":1540.9705810057565,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_odd","name":"Odd Pulse","category":"mathematical","predicate":{"type":"sumModulo","divisor":2,"remainder":1},"semanticTags":[],"symbol":"🎲","description":"The RGB channel sum is odd.","active":true,"matchCount":8388608,"probability":0.5,"expectedRolls":2,"rarity":"Common","probabilityReward":1540.9705810057565,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_divisible_3","name":"Rule of Three","category":"mathematical","predicate":{"type":"sumModulo","divisor":3,"remainder":0},"semanticTags":[],"symbol":"3️⃣","description":"The RGB channel sum leaves remainder 0 when divided by 3.","active":true,"matchCount":5592406,"probability":0.3333333730697632,"expectedRolls":3,"rarity":"Common","probabilityReward":2149.8991562191695,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_divisible_5","name":"Fivefold Sum","category":"mathematical","predicate":{"type":"sumModulo","divisor":5,"remainder":0},"semanticTags":[],"symbol":"5️⃣","description":"The RGB channel sum leaves remainder 0 when divided by 5.","active":true,"matchCount":3355444,"probability":0.20000004768371582,"expectedRolls":5,"rarity":"Common","probabilityReward":2917.0584799307694,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_divisible_7","name":"Lucky Sum","category":"mathematical","predicate":{"type":"sumModulo","divisor":7,"remainder":0},"semanticTags":["named"],"symbol":"7️⃣","description":"The RGB channel sum leaves remainder 0 when divided by 7.","active":true,"matchCount":2396743,"probability":0.14285701513290405,"expectedRolls":8,"rarity":"Common","probabilityReward":3422.3752270208747,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_divisible_9","name":"Triple Triple","category":"mathematical","predicate":{"type":"sumModulo","divisor":9,"remainder":0},"semanticTags":[],"symbol":"9️⃣","description":"The RGB channel sum leaves remainder 0 when divided by 9.","active":true,"matchCount":1864130,"probability":0.11111080646514893,"expectedRolls":10,"rarity":"Common","probabilityReward":3799.8027881659627,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_divisible_11","name":"Eleven Signal","category":"mathematical","predicate":{"type":"sumModulo","divisor":11,"remainder":0},"semanticTags":[],"symbol":"1️⃣1️⃣","description":"The RGB channel sum leaves remainder 0 when divided by 11.","active":true,"matchCount":1525200,"probability":0.09090900421142578,"expectedRolls":12,"rarity":"Common","probabilityReward":4101.167974234275,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_42","name":"Meaning of Life","category":"mathematical","predicate":{"type":"sumEquals","value":42},"semanticTags":["named"],"symbol":"🧬","description":"The RGB channel sum is exactly 42.","active":true,"matchCount":946,"probability":0.00005638599395751953,"expectedRolls":17735,"rarity":"Legendary","probabilityReward":28638731.906878054,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_69","name":"Nice Sum","category":"mathematical","predicate":{"type":"sumEquals","value":69},"semanticTags":["meme"],"symbol":"😏","description":"The RGB channel sum is exactly 69.","active":true,"matchCount":2485,"probability":0.0001481175422668457,"expectedRolls":6752,"rarity":"Epic","probabilityReward":4232269.933504387,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_100","name":"Perfect Century","category":"mathematical","predicate":{"type":"sumEquals","value":100},"semanticTags":["named"],"symbol":"💯","description":"The RGB channel sum is exactly 100.","active":true,"matchCount":5151,"probability":0.0003070235252380371,"expectedRolls":3258,"rarity":"Epic","probabilityReward":2807727.044419017,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_255","name":"Max Byte","category":"mathematical","predicate":{"type":"sumEquals","value":255},"semanticTags":["named"],"symbol":"💾","description":"The RGB channel sum is exactly 255.","active":true,"matchCount":32896,"probability":0.00196075439453125,"expectedRolls":511,"rarity":"Rare","probabilityReward":368408.85375357064,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_420","name":"Blaze Sum","category":"mathematical","predicate":{"type":"sumEquals","value":420},"semanticTags":["meme"],"symbol":"🌿","description":"The RGB channel sum is exactly 420.","active":true,"matchCount":47746,"probability":0.0028458833694458008,"expectedRolls":352,"rarity":"Rare","probabilityReward":295601.7602202606,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_666","name":"Sinister Shade","category":"mathematical","predicate":{"type":"sumEquals","value":666},"semanticTags":["meme"],"symbol":"😈","description":"The RGB channel sum is exactly 666.","active":true,"matchCount":5050,"probability":0.00030100345611572266,"expectedRolls":3323,"rarity":"Epic","probabilityReward":2846427.808747475,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_fibonacci","name":"Fibonacci Energy","category":"mathematical","predicate":{"type":"sumSet","values":[0,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584,4181,6765]},"semanticTags":["named"],"symbol":"🌀","description":"The RGB channel sum is a Fibonacci number.","active":true,"matchCount":106213,"probability":0.0063307881355285645,"expectedRolls":158,"rarity":"Rare","probabilityReward":139343.80055629663,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_square","name":"Perfect Square","category":"mathematical","predicate":{"type":"sumSet","values":[0,1,4,9,16,25,36,49,64,81,100,121,144,169,196,225,256,289,324,361,400,441,484,529,576,625,676,729]},"semanticTags":["named"],"symbol":"⏹️","description":"The RGB channel sum is a perfect square.","active":true,"matchCount":453595,"probability":0.02703636884689331,"expectedRolls":37,"rarity":"Uncommon","probabilityReward":22190.59012011876,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_triangular","name":"Triangular Sum","category":"mathematical","predicate":{"type":"sumSet","values":[0,1,3,6,10,15,21,28,36,45,55,66,78,91,105,120,136,153,171,190,210,231,253,276,300,325,351,378,406,435,465,496,528,561,595,630,666,703,741]},"semanticTags":["named"],"symbol":"🔺","description":"The RGB channel sum is triangular.","active":true,"matchCount":641336,"probability":0.03822660446166992,"expectedRolls":27,"rarity":"Uncommon","probabilityReward":12506.868721748237,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"sum_prime","name":"Prime Energy","category":"mathematical","predicate":{"type":"sumPrime"},"semanticTags":["named"],"symbol":"🔢","description":"The RGB channel sum is prime.","active":true,"matchCount":2760769,"probability":0.1645546555519104,"expectedRolls":7,"rarity":"Common","probabilityReward":3210.022474405082,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"balanced_sum_band","name":"Balanced Sum","category":"sum_shape","predicate":{"type":"sumBetween","min":300,"max":465},"semanticTags":[],"symbol":"⚖️","description":"The RGB channel sum sits in a balanced middle band.","active":true,"matchCount":7778096,"probability":0.4636106491088867,"expectedRolls":3,"rarity":"Common","probabilityReward":1654.451353426902,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"all_channels_even","name":"All Even Channels","category":"channel_identity","predicate":{"type":"channelsAll","operation":"parity","value":"even"},"semanticTags":[],"symbol":"2️⃣","description":"Every RGB channel is even.","active":true,"matchCount":2097152,"probability":0.125,"expectedRolls":8,"rarity":"Common","probabilityReward":3622.911743017269,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"all_channels_odd","name":"All Odd Channels","category":"channel_identity","predicate":{"type":"channelsAll","operation":"parity","value":"odd"},"semanticTags":[],"symbol":"1️⃣","description":"Every RGB channel is odd.","active":true,"matchCount":2097152,"probability":0.125,"expectedRolls":8,"rarity":"Common","probabilityReward":3622.911743017269,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"all_channels_div3","name":"Triple Threat","category":"channel_identity","predicate":{"type":"channelsAll","operation":"divisibleBy","value":3},"semanticTags":[],"symbol":"3️⃣","description":"Every RGB channel is divisible by three.","active":true,"matchCount":636056,"probability":0.03791189193725586,"expectedRolls":27,"rarity":"Uncommon","probabilityReward":12738.00644697228,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"all_channels_div5","name":"Five Channel Lock","category":"channel_identity","predicate":{"type":"channelsAll","operation":"divisibleBy","value":5},"semanticTags":[],"symbol":"5️⃣","description":"Every RGB channel is divisible by five.","active":true,"matchCount":140608,"probability":0.008380889892578125,"expectedRolls":120,"rarity":"Rare","probabilityReward":84519.36255415299,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"web_safe","name":"Web Safe","category":"channel_identity","predicate":{"type":"channelsAll","operation":"inSet","values":[0,51,102,153,204,255]},"semanticTags":["named"],"symbol":"🕸️","description":"Every channel lands on a classic web-safe value.","active":true,"matchCount":216,"probability":0.000012874603271484375,"expectedRolls":77673,"rarity":"Legendary","probabilityReward":89575282.86427253,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"channel_zero","name":"Zero Channel","category":"channel_identity","predicate":{"type":"channelsAny","operation":"equals","value":0},"semanticTags":[],"symbol":"0️⃣","description":"At least one channel is exactly zero.","active":true,"matchCount":195841,"probability":0.011673033237457275,"expectedRolls":86,"rarity":"Uncommon","probabilityReward":45673.77818354755,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"channel_maxed","name":"Maxed Channel","category":"channel_identity","predicate":{"type":"channelsAny","operation":"equals","value":255},"semanticTags":[],"symbol":"🔆","description":"At least one channel reaches 255.","active":true,"matchCount":195841,"probability":0.011673033237457275,"expectedRolls":86,"rarity":"Uncommon","probabilityReward":45673.77818354755,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"channel_one","name":"One Is the Loneliest","category":"channel_identity","predicate":{"type":"channelsAny","operation":"equals","value":1},"semanticTags":["named"],"symbol":"1️⃣","description":"At least one channel is exactly one.","active":true,"matchCount":195841,"probability":0.011673033237457275,"expectedRolls":86,"rarity":"Uncommon","probabilityReward":45673.77818354755,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"channel_edge","name":"Edge Channel","category":"edge_behavior","predicate":{"type":"any","checks":[{"type":"channelsAny","operation":"inRange","min":0,"max":8},{"type":"channelsAny","operation":"gte","value":247}]},"semanticTags":[],"symbol":"📐","description":"At least one channel is near an RGB edge.","active":true,"matchCount":3295944,"probability":0.19645357131958008,"expectedRolls":6,"rarity":"Common","probabilityReward":2943.927959738198,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"edge_pair","name":"Edge Pair","category":"edge_behavior","predicate":{"type":"channelCount","operation":"edge","op":"gte","value":2},"semanticTags":[],"symbol":"⚡","description":"At least two channels sit near an RGB edge.","active":true,"matchCount":237168,"probability":0.014136314392089844,"expectedRolls":71,"rarity":"Uncommon","probabilityReward":40320.50391051974,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"twin_channels","name":"Twin Channels","category":"symmetry","predicate":{"type":"channelRelation","relation":"hasEqualPair"},"semanticTags":[],"symbol":"👯","description":"Two channels share the exact same value.","active":true,"matchCount":196096,"probability":0.011688232421875,"expectedRolls":86,"rarity":"Uncommon","probabilityReward":45637.39651537303,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"greyscale","name":"Perfect Greyscale","category":"symmetry","predicate":{"type":"channelRelation","relation":"allEqual"},"semanticTags":[],"symbol":"⚫","description":"All three channels are identical.","active":true,"matchCount":256,"probability":0.0000152587890625,"expectedRolls":65536,"rarity":"Legendary","probabilityReward":82565592.59277149,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"all_channels_distinct","name":"Three-Way Split","category":"symmetry","predicate":{"type":"channelRelation","relation":"allDistinct"},"semanticTags":[],"symbol":"🔀","description":"All three channels have different values.","active":true,"matchCount":16581120,"probability":0.988311767578125,"expectedRolls":2,"rarity":"Common","probabilityReward":517.656814298761,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"red_green_equal","name":"Red Green Mirror","category":"symmetry","predicate":{"type":"channelRelation","relation":"redGreenEqual"},"semanticTags":[],"symbol":"🟥","description":"Red and green channels match.","active":true,"matchCount":65536,"probability":0.00390625,"expectedRolls":256,"rarity":"Rare","probabilityReward":233707.57615036698,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"green_blue_equal","name":"Green Blue Mirror","category":"symmetry","predicate":{"type":"channelRelation","relation":"greenBlueEqual"},"semanticTags":[],"symbol":"🟩","description":"Green and blue channels match.","active":true,"matchCount":65536,"probability":0.00390625,"expectedRolls":256,"rarity":"Rare","probabilityReward":233707.57615036698,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"red_blue_equal","name":"Mirror Channels","category":"symmetry","predicate":{"type":"channelRelation","relation":"redBlueEqual"},"semanticTags":[],"symbol":"🪞","description":"Red and blue channels mirror each other.","active":true,"matchCount":65536,"probability":0.00390625,"expectedRolls":256,"rarity":"Rare","probabilityReward":233707.57615036698,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"low_contrast","name":"Close Harmony","category":"color_relationship","predicate":{"type":"rangeCompare","op":"lte","value":20},"semanticTags":[],"symbol":"↔️","description":"The RGB channel range is lte 20.","active":true,"matchCount":305596,"probability":0.018214941024780273,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":33232.91687096811,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"gentle_contrast","name":"Gentle Contrast","category":"color_relationship","predicate":{"type":"rangeCompare","op":"gtLt","value":[20,80]},"semanticTags":[],"symbol":"🌫️","description":"The RGB channel range is gtLt 20,80.","active":true,"matchCount":3543540,"probability":0.2112114429473877,"expectedRolls":5,"rarity":"Common","probabilityReward":2835.1469462701093,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"layered_contrast","name":"Layered Contrast","category":"color_relationship","predicate":{"type":"rangeCompare","op":"gteLt","value":[80,205]},"semanticTags":[],"symbol":"🪜","description":"The RGB channel range is gteLt 80,205.","active":true,"matchCount":11164500,"probability":0.6654560565948486,"expectedRolls":2,"rarity":"Common","probabilityReward":1111.6583803065694,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"high_contrast","name":"Polarized Channels","category":"color_relationship","predicate":{"type":"rangeCompare","op":"gte","value":205},"semanticTags":[],"symbol":"🌓","description":"The RGB channel range is gte 205.","active":true,"matchCount":1763580,"probability":0.1051175594329834,"expectedRolls":10,"rarity":"Common","probabilityReward":3883.0757007808193,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"extreme_span","name":"Extreme Span","category":"color_relationship","predicate":{"type":"rangeCompare","op":"gte","value":230},"semanticTags":[],"symbol":"⚡","description":"The RGB channel range is gte 230.","active":true,"matchCount":501930,"probability":0.029917359352111816,"expectedRolls":34,"rarity":"Uncommon","probabilityReward":19359.529702735657,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"red_dominant","name":"Red Dominant","category":"composition","predicate":{"type":"channelDominant","channel":"r"},"semanticTags":[],"symbol":"🔴","description":"Red is the unique leading channel.","active":true,"matchCount":5559680,"probability":0.33138275146484375,"expectedRolls":4,"rarity":"Common","probabilityReward":2158.713318728861,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"green_dominant","name":"Green Dominant","category":"composition","predicate":{"type":"channelDominant","channel":"g"},"semanticTags":[],"symbol":"🟢","description":"Green is the unique leading channel.","active":true,"matchCount":5559680,"probability":0.33138275146484375,"expectedRolls":4,"rarity":"Common","probabilityReward":2158.713318728861,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"blue_dominant","name":"Blue Dominant","category":"composition","predicate":{"type":"channelDominant","channel":"b"},"semanticTags":[],"symbol":"🔵","description":"Blue is the unique leading channel.","active":true,"matchCount":5559680,"probability":0.33138275146484375,"expectedRolls":4,"rarity":"Common","probabilityReward":2158.713318728861,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"balanced_channels","name":"Balanced Channels","category":"composition","predicate":{"type":"channelRelation","relation":"noUniqueDominant"},"semanticTags":[],"symbol":"⚪","description":"No channel is a unique strong leader.","active":true,"matchCount":98176,"probability":0.00585174560546875,"expectedRolls":171,"rarity":"Rare","probabilityReward":154721.32033785238,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"ascending_channels","name":"Ascending Channels","category":"sequence","predicate":{"type":"channelOrder","order":["r","g","b"],"direction":"ascending"},"semanticTags":["sequence"],"symbol":"📈","description":"Red is below green, which is below blue.","active":true,"matchCount":2763520,"probability":0.1647186279296875,"expectedRolls":7,"rarity":"Common","probabilityReward":3208.5267305525567,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"descending_channels","name":"Descending Channels","category":"sequence","predicate":{"type":"channelOrder","order":["r","g","b"],"direction":"descending"},"semanticTags":["sequence"],"symbol":"📉","description":"Red is above green, which is above blue.","active":true,"matchCount":2763520,"probability":0.1647186279296875,"expectedRolls":7,"rarity":"Common","probabilityReward":3208.5267305525567,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"red_green_step","name":"Red-Green Step","category":"sequence","predicate":{"type":"channelOrder","order":["r","g"],"direction":"ascending"},"semanticTags":["sequence"],"symbol":"↗️","description":"Red is below green.","active":true,"matchCount":8355840,"probability":0.498046875,"expectedRolls":3,"rarity":"Common","probabilityReward":1546.8484871194769,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"green_blue_step","name":"Green-Blue Step","category":"sequence","predicate":{"type":"channelOrder","order":["g","b"],"direction":"ascending"},"semanticTags":["sequence"],"symbol":"↗️","description":"Green is below blue.","active":true,"matchCount":8355840,"probability":0.498046875,"expectedRolls":3,"rarity":"Common","probabilityReward":1546.8484871194769,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"blue_red_step","name":"Blue-Red Step","category":"sequence","predicate":{"type":"channelOrder","order":["b","r"],"direction":"ascending"},"semanticTags":["sequence"],"symbol":"↗️","description":"Blue is below red.","active":true,"matchCount":8355840,"probability":0.498046875,"expectedRolls":3,"rarity":"Common","probabilityReward":1546.8484871194769,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"channel_progression","name":"Channel Progression","category":"sequence","predicate":{"type":"arithmeticProgression","sorted":true},"semanticTags":["sequence"],"symbol":"📏","description":"Sorted channels share a constant step.","active":true,"matchCount":97792,"probability":0.005828857421875,"expectedRolls":172,"rarity":"Rare","probabilityReward":155487.22105382796,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"channel_complement_red_blue","name":"Red-Blue Complement","category":"relationship","predicate":{"type":"channelComplement","first":"r","second":"b","sum":255},"semanticTags":["named"],"symbol":"☯️","description":"Red and blue add to a complete byte.","active":true,"matchCount":65536,"probability":0.00390625,"expectedRolls":256,"rarity":"Rare","probabilityReward":233707.57615036698,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"channel_complement_red_green","name":"Red-Green Complement","category":"relationship","predicate":{"type":"channelComplement","first":"r","second":"g","sum":255},"semanticTags":["named"],"symbol":"☯️","description":"Red and green add to a complete byte.","active":true,"matchCount":65536,"probability":0.00390625,"expectedRolls":256,"rarity":"Rare","probabilityReward":233707.57615036698,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"channel_complement_green_blue","name":"Green-Blue Complement","category":"relationship","predicate":{"type":"channelComplement","first":"g","second":"b","sum":255},"semanticTags":["named"],"symbol":"☯️","description":"Green and blue add to a complete byte.","active":true,"matchCount":65536,"probability":0.00390625,"expectedRolls":256,"rarity":"Rare","probabilityReward":233707.57615036698,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"power_two_channels","name":"Power-of-Two Channels","category":"mathematical","predicate":{"type":"channelsAll","operation":"inSet","values":[1,2,4,8,16,32,64,128]},"semanticTags":["named"],"symbol":"⚡","description":"Every channel is a power of two.","active":true,"matchCount":512,"probability":0.000030517578125,"expectedRolls":32768,"rarity":"Legendary","probabilityReward":53967743.305723265,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"power_two_any","name":"Power-of-Two Spark","category":"mathematical","predicate":{"type":"channelsAny","operation":"inSet","values":[1,2,4,8,16,32,64,128]},"semanticTags":["named"],"symbol":"⚡","description":"At least one channel is a power of two.","active":true,"matchCount":1524224,"probability":0.090850830078125,"expectedRolls":12,"rarity":"Common","probabilityReward":4102.129309798434,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"parity_pattern_even_odd_even","name":"Even Odd Even","category":"channel_identity","predicate":{"type":"parityPattern","value":"EOE"},"semanticTags":[],"symbol":"🔢","description":"The channels follow an even-odd-even rhythm.","active":true,"matchCount":2097152,"probability":0.125,"expectedRolls":8,"rarity":"Common","probabilityReward":3622.911743017269,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"parity_pattern_odd_even_odd","name":"Odd Even Odd","category":"channel_identity","predicate":{"type":"parityPattern","value":"OEO"},"semanticTags":[],"symbol":"🔢","description":"The channels follow an odd-even-odd rhythm.","active":true,"matchCount":2097152,"probability":0.125,"expectedRolls":8,"rarity":"Common","probabilityReward":3622.911743017269,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_crimson","name":"Crimson Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Crimson"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Crimson hue family.","active":true,"matchCount":1389274,"probability":0.08280718326568604,"expectedRolls":13,"rarity":"Common","probabilityReward":4241.352643457189,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_amber","name":"Amber Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Amber"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Amber hue family.","active":true,"matchCount":1389276,"probability":0.08280730247497559,"expectedRolls":13,"rarity":"Common","probabilityReward":4241.350481461766,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_gold","name":"Gold Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Gold"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Gold hue family.","active":true,"matchCount":1389274,"probability":0.08280718326568604,"expectedRolls":13,"rarity":"Common","probabilityReward":4241.352643457189,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_lime","name":"Lime Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Lime"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Lime hue family.","active":true,"matchCount":1389276,"probability":0.08280730247497559,"expectedRolls":13,"rarity":"Common","probabilityReward":4241.350481461766,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_emerald","name":"Emerald Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Emerald"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Emerald hue family.","active":true,"matchCount":2778550,"probability":0.16561448574066162,"expectedRolls":7,"rarity":"Common","probabilityReward":3200.380981453331,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_cyan","name":"Cyan Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Cyan"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Cyan hue family.","active":true,"matchCount":1389274,"probability":0.08280718326568604,"expectedRolls":13,"rarity":"Common","probabilityReward":4241.352643457189,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_azure","name":"Azure Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Azure"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Azure hue family.","active":true,"matchCount":1389276,"probability":0.08280730247497559,"expectedRolls":13,"rarity":"Common","probabilityReward":4241.350481461766,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_blue","name":"Blue Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Blue"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Blue hue family.","active":true,"matchCount":1389274,"probability":0.08280718326568604,"expectedRolls":13,"rarity":"Common","probabilityReward":4241.352643457189,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_violet","name":"Violet Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Violet"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Violet hue family.","active":true,"matchCount":1389276,"probability":0.08280730247497559,"expectedRolls":13,"rarity":"Common","probabilityReward":4241.350481461766,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_magenta","name":"Magenta Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Magenta"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Magenta hue family.","active":true,"matchCount":1389274,"probability":0.08280718326568604,"expectedRolls":13,"rarity":"Common","probabilityReward":4241.352643457189,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_rose","name":"Rose Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Rose"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Rose hue family.","active":true,"matchCount":1389276,"probability":0.08280730247497559,"expectedRolls":13,"rarity":"Common","probabilityReward":4241.350481461766,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hue_family_neutral","name":"Neutral Hue","category":"color_identity","predicate":{"type":"hueFamily","value":"Neutral"},"semanticTags":[],"symbol":"🌈","description":"The color belongs to the Neutral hue family.","active":true,"matchCount":105916,"probability":0.0063130855560302734,"expectedRolls":159,"rarity":"Rare","probabilityReward":139891.04649105849,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"temperature_warm","name":"Warm Temperature","category":"color_identity","predicate":{"type":"temperature","value":"warm"},"semanticTags":[],"symbol":"🌡️","description":"Red leads the warm-cool axis.","active":true,"matchCount":8421120,"probability":0.5019378662109375,"expectedRolls":2,"rarity":"Common","probabilityReward":1535.1612445184319,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"temperature_cool","name":"Cool Temperature","category":"color_identity","predicate":{"type":"temperature","value":"cool"},"semanticTags":[],"symbol":"🌡️","description":"Blue leads the warm-cool axis.","active":true,"matchCount":8355840,"probability":0.498046875,"expectedRolls":3,"rarity":"Common","probabilityReward":1546.8484871194769,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"temperature_neutral","name":"Neutral Temperature","category":"color_identity","predicate":{"type":"temperature","value":"neutral"},"semanticTags":[],"symbol":"🌡️","description":"All channels share one neutral value.","active":true,"matchCount":256,"probability":0.0000152587890625,"expectedRolls":65536,"rarity":"Legendary","probabilityReward":82565592.59277149,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"saturation_soft","name":"Soft Saturation","category":"saturation","predicate":{"type":"hslCompare","field":"saturation","op":"lt","value":15},"semanticTags":[],"symbol":"🎨","description":"saturation is lt 15.","active":true,"matchCount":372574,"probability":0.022207140922546387,"expectedRolls":46,"rarity":"Uncommon","probabilityReward":27692.144777998594,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"saturation_muted","name":"Muted Saturation","category":"saturation","predicate":{"type":"hslCompare","field":"saturation","op":"gteLt","value":[15,40]},"semanticTags":[],"symbol":"🎨","description":"saturation is gteLt 15,40.","active":true,"matchCount":2272800,"probability":0.1354694366455078,"expectedRolls":8,"rarity":"Common","probabilityReward":3502.1182392681435,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"saturation_rich","name":"Rich Saturation","category":"saturation","predicate":{"type":"hslCompare","field":"saturation","op":"gteLt","value":[40,70]},"semanticTags":[],"symbol":"🎨","description":"saturation is gteLt 40,70.","active":true,"matchCount":5473140,"probability":0.32622456550598145,"expectedRolls":4,"rarity":"Common","probabilityReward":2182.2736968327686,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"saturation_vivid","name":"Vivid Saturation","category":"saturation","predicate":{"type":"hslCompare","field":"saturation","op":"gteLt","value":[70,95]},"semanticTags":[],"symbol":"🎨","description":"saturation is gteLt 70,95.","active":true,"matchCount":6837624,"probability":0.40755414962768555,"expectedRolls":3,"rarity":"Common","probabilityReward":1847.99063351209,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"saturation_electric","name":"Electric Saturation","category":"saturation","predicate":{"type":"hslCompare","field":"saturation","op":"gte","value":95},"semanticTags":["named"],"symbol":"🎨","description":"saturation is gte 95.","active":true,"matchCount":1821078,"probability":0.10854470729827881,"expectedRolls":10,"rarity":"Common","probabilityReward":3834.893653289796,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"saturation_high_chroma","name":"High Chroma","category":"saturation","predicate":{"type":"hslCompare","field":"saturation","op":"gte","value":80},"semanticTags":["named"],"symbol":"💎","description":"saturation is gte 80.","active":true,"matchCount":6181500,"probability":0.36844611167907715,"expectedRolls":3,"rarity":"Common","probabilityReward":1999.491542146011,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"lightness_shadow","name":"Shadow Tone","category":"tone","predicate":{"type":"hslCompare","field":"lightness","op":"lt","value":15},"semanticTags":[],"symbol":"🎨","description":"lightness is lt 15.","active":true,"matchCount":232713,"probability":0.013870775699615479,"expectedRolls":73,"rarity":"Uncommon","probabilityReward":40850.6938328383,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"lightness_deep","name":"Deep Tone","category":"tone","predicate":{"type":"hslCompare","field":"lightness","op":"gteLt","value":[15,35]},"semanticTags":[],"symbol":"🎨","description":"lightness is gteLt 15,35.","active":true,"matchCount":2658987,"probability":0.1584879755973816,"expectedRolls":7,"rarity":"Common","probabilityReward":3266.436267311251,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"lightness_balanced","name":"Balanced Tone","category":"tone","predicate":{"type":"hslCompare","field":"lightness","op":"gteLt","value":[35,65]},"semanticTags":[],"symbol":"🎨","description":"lightness is gteLt 35,65.","active":true,"matchCount":10993816,"probability":0.6552824974060059,"expectedRolls":2,"rarity":"Common","probabilityReward":1134.7954119748142,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"lightness_bright","name":"Bright Tone","category":"tone","predicate":{"type":"hslCompare","field":"lightness","op":"gteLt","value":[65,85]},"semanticTags":[],"symbol":"🎨","description":"lightness is gteLt 65,85.","active":true,"matchCount":2658987,"probability":0.1584879755973816,"expectedRolls":7,"rarity":"Common","probabilityReward":3266.436267311251,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"lightness_luminous","name":"Luminous Tone","category":"tone","predicate":{"type":"hslCompare","field":"lightness","op":"gte","value":85},"semanticTags":["named"],"symbol":"🎨","description":"lightness is gte 85.","active":true,"matchCount":232713,"probability":0.013870775699615479,"expectedRolls":73,"rarity":"Uncommon","probabilityReward":40850.6938328383,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"tone_edge","name":"Tone Edge","category":"tone","predicate":{"type":"hslAny","checks":[{"field":"lightness","op":"lt","value":10},{"field":"lightness","op":"gt","value":90}]},"semanticTags":["named"],"symbol":"🌗","description":"The color sits at a lightness extreme.","active":true,"matchCount":136552,"probability":0.00813913345336914,"expectedRolls":123,"rarity":"Rare","probabilityReward":90239.7343244495,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"pastel","name":"Pastel Bloom","category":"color_relationship","predicate":{"type":"all","checks":[{"type":"channelsAll","operation":"gte","value":120},{"type":"channelsAny","operation":"gte","value":210},{"type":"rangeCompare","op":"lt","value":75}]},"semanticTags":["named"],"symbol":"🌸","description":"Bright channels form a soft pastel balance.","active":true,"matchCount":765946,"probability":0.04565393924713135,"expectedRolls":22,"rarity":"Uncommon","probabilityReward":7542.439800348391,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"neon","name":"Neon Voltage","category":"color_relationship","predicate":{"type":"all","checks":[{"type":"channelsAny","operation":"gte","value":221},{"type":"channelsAny","operation":"lt","value":45}]},"semanticTags":["named"],"symbol":"💡","description":"A bright channel meets a near-dark channel.","active":true,"matchCount":2041200,"probability":0.12166500091552734,"expectedRolls":9,"rarity":"Common","probabilityReward":3663.5240483462494,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"luminous_core","name":"Luminous Core","category":"color_relationship","predicate":{"type":"all","checks":[{"type":"hslCompare","field":"lightness","op":"gte","value":90},{"type":"hslCompare","field":"saturation","op":"lte","value":20}]},"semanticTags":["named"],"symbol":"✨","description":"The color is unusually bright and pale.","active":true,"matchCount":2906,"probability":0.00017321109771728516,"expectedRolls":5774,"rarity":"Epic","probabilityReward":3926408.5254566707,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"warm_bias","name":"Warm Bias","category":"color_relationship","predicate":{"type":"channelOrder","order":["r","g","b"],"direction":"nonIncreasing"},"semanticTags":["named"],"symbol":"🔥","description":"The channels lean from warm red toward blue.","active":true,"matchCount":2829056,"probability":0.1686248779296875,"expectedRolls":6,"rarity":"Common","probabilityReward":3173.3276834105036,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"cool_bias","name":"Cool Bias","category":"color_relationship","predicate":{"type":"channelOrder","order":["b","g","r"],"direction":"nonIncreasing"},"semanticTags":["named"],"symbol":"❄️","description":"The channels lean from cool blue toward red.","active":true,"matchCount":2829056,"probability":0.1686248779296875,"expectedRolls":6,"rarity":"Common","probabilityReward":3173.3276834105036,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"monochromatic","name":"Monochromatic","category":"color_relationship","predicate":{"type":"rangeCompare","op":"lte","value":15},"semanticTags":["named"],"symbol":"🎛️","description":"All channels stay within fifteen values.","active":true,"matchCount":177136,"probability":0.010558128356933594,"expectedRolls":95,"rarity":"Uncommon","probabilityReward":48480.49621095822,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"palindrome","name":"Hex Palindrome","category":"hex_pattern","predicate":{"type":"hexPalindrome"},"semanticTags":["sequence","named"],"symbol":"🪞","description":"The six hexadecimal characters read the same backwards.","active":true,"matchCount":4096,"probability":0.000244140625,"expectedRolls":4096,"rarity":"Epic","probabilityReward":3255619.153495036,"semanticBonus":0.07500000000000001,"variationMinBps":-700,"variationMaxBps":700},{"id":"repeated_pair","name":"Repeated Pair","category":"hex_pattern","predicate":{"type":"hexByteEquality"},"semanticTags":["sequence","named"],"symbol":"🟰","description":"The same two-character byte repeats three times.","active":true,"matchCount":256,"probability":0.0000152587890625,"expectedRolls":65536,"rarity":"Legendary","probabilityReward":82565592.59277149,"semanticBonus":0.07500000000000001,"variationMinBps":-700,"variationMaxBps":700},{"id":"sixfold_digit","name":"Sixfold Digit","category":"hex_pattern","predicate":{"type":"hexAllSame"},"semanticTags":["sequence","named"],"symbol":"🔁","description":"One hexadecimal digit fills all six positions.","active":true,"matchCount":16,"probability":9.5367431640625e-7,"expectedRolls":1048576,"rarity":"Anomaly","probabilityReward":1048576000.0000001,"semanticBonus":0.07500000000000001,"variationMinBps":-700,"variationMaxBps":700},{"id":"triple_hex","name":"Triple Hex","category":"hex_pattern","predicate":{"type":"hexRun","length":3},"semanticTags":["sequence"],"symbol":"3️⃣","description":"Three matching hexadecimal characters appear in a row.","active":true,"matchCount":249616,"probability":0.014878273010253906,"expectedRolls":68,"rarity":"Uncommon","probabilityReward":38890.23859383231,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"double_hex","name":"Double Hex","category":"hex_pattern","predicate":{"type":"hexRun","length":2},"semanticTags":["sequence"],"symbol":"2️⃣","description":"Two matching hexadecimal characters appear in a row.","active":true,"matchCount":4627216,"probability":0.2758035659790039,"expectedRolls":4,"rarity":"Common","probabilityReward":2434.422082149752,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_letter_rich","name":"Letter-Rich Hex","category":"hex_structure","predicate":{"type":"hexCharacterCount","class":"letter","op":"gte","value":3},"semanticTags":[],"symbol":"🔤","description":"At least three hexadecimal characters are letters.","active":true,"matchCount":6777216,"probability":0.40395355224609375,"expectedRolls":3,"rarity":"Common","probabilityReward":1861.3174910711728,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_digit_rich","name":"Digit-Rich Hex","category":"hex_structure","predicate":{"type":"hexCharacterCount","class":"digit","op":"gte","value":4},"semanticTags":[],"symbol":"🔢","description":"At least four hexadecimal characters are digits.","active":true,"matchCount":10000000,"probability":0.5960464477539062,"expectedRolls":2,"rarity":"Common","probabilityReward":1277.0880111784522,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_digit_sum_prime","name":"Prime Hex Sum","category":"hex_structure","predicate":{"type":"hexDigitSumPrime"},"semanticTags":["named"],"symbol":"🧮","description":"The hexadecimal digit sum is prime.","active":true,"matchCount":3969263,"probability":0.23658651113510132,"expectedRolls":5,"rarity":"Common","probabilityReward":2664.7610660597397,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_digit_sum_square","name":"Square Hex Sum","category":"hex_structure","predicate":{"type":"hexDigitSumSquare"},"semanticTags":["named"],"symbol":"⏹️","description":"The hexadecimal digit sum is a perfect square.","active":true,"matchCount":1285123,"probability":0.07659929990768433,"expectedRolls":14,"rarity":"Common","probabilityReward":4358.383465399675,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_letter_majority","name":"Letter Majority","category":"hex_structure","predicate":{"type":"hexCharacterCount","class":"letter","op":"gte","value":4},"semanticTags":[],"symbol":"🔤","description":"Letters occupy at least four hexadecimal positions.","active":true,"matchCount":2457216,"probability":0.14646148681640625,"expectedRolls":7,"rarity":"Common","probabilityReward":3384.9528928948457,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_bookends","name":"Hex Bookends","category":"hex_structure","predicate":{"type":"hexBookends"},"semanticTags":["sequence"],"symbol":"🔗","description":"The first and last hexadecimal characters match.","active":true,"matchCount":1048576,"probability":0.0625,"expectedRolls":16,"rarity":"Common","probabilityReward":4663.882324023026,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"byte_bookends","name":"Byte Bookends","category":"hex_structure","predicate":{"type":"byteBookends"},"semanticTags":["sequence"],"symbol":"🔗","description":"The first and last hexadecimal bytes match.","active":true,"matchCount":65536,"probability":0.00390625,"expectedRolls":256,"rarity":"Rare","probabilityReward":233707.57615036698,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_ascending","name":"Ascending Hex","category":"sequence","predicate":{"type":"hexMonotonic","direction":"ascending"},"semanticTags":["sequence"],"symbol":"📈","description":"Hexadecimal characters strictly rise from left to right.","active":true,"matchCount":8008,"probability":0.0004773139953613281,"expectedRolls":2096,"rarity":"Epic","probabilityReward":1945380.9203934574,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_descending","name":"Descending Hex","category":"sequence","predicate":{"type":"hexMonotonic","direction":"descending"},"semanticTags":["sequence"],"symbol":"📉","description":"Hexadecimal characters strictly fall from left to right.","active":true,"matchCount":8008,"probability":0.0004773139953613281,"expectedRolls":2096,"rarity":"Epic","probabilityReward":1945380.9203934574,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_staircase","name":"Hex Staircase","category":"sequence","predicate":{"type":"hexStep","step":1},"semanticTags":["sequence","named"],"symbol":"🪜","description":"Each hexadecimal character advances by one.","active":true,"matchCount":11,"probability":6.556510925292969e-7,"expectedRolls":1525202,"rarity":"Anomaly","probabilityReward":1525201454.5454547,"semanticBonus":0.07500000000000001,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_reverse_staircase","name":"Reverse Hex Staircase","category":"sequence","predicate":{"type":"hexStep","step":-1},"semanticTags":["sequence","named"],"symbol":"🪜","description":"Each hexadecimal character retreats by one.","active":true,"matchCount":11,"probability":6.556510925292969e-7,"expectedRolls":1525202,"rarity":"Anomaly","probabilityReward":1525201454.5454547,"semanticBonus":0.07500000000000001,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_unique_four","name":"Four-Color Hex","category":"hex_structure","predicate":{"type":"hexUniqueCount","op":"eq","value":4},"semanticTags":[],"symbol":"🔹","description":"Exactly four distinct hexadecimal characters appear.","active":true,"matchCount":2839200,"probability":0.16922950744628906,"expectedRolls":6,"rarity":"Common","probabilityReward":3167.952376840466,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_unique_six","name":"Full Hex Variety","category":"hex_structure","predicate":{"type":"hexUniqueCount","op":"eq","value":6},"semanticTags":[],"symbol":"🔷","description":"Every hexadecimal position is distinct.","active":true,"matchCount":5765760,"probability":0.34366607666015625,"expectedRolls":3,"rarity":"Common","probabilityReward":2104.0530589369596,"semanticBonus":0,"variationMinBps":-700,"variationMaxBps":700},{"id":"hex_contains_all_letters","name":"Alphabet Soup","category":"hex_structure","predicate":{"type":"hexContainsAll","values":["A","B","C","D","E","F"]},"semanticTags":["named"],"symbol":"🔤","description":"Every hexadecimal letter appears.","active":true,"matchCount":720,"probability":0.00004291534423828125,"expectedRolls":23302,"rarity":"Legendary","probabilityReward":39901802.585519224,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"f1","name":"Formula 1","category":"hex_culture","predicate":{"type":"hexContains","value":"F1"},"semanticTags":["named"],"symbol":"🏎️","description":"The hexadecimal color contains F1.","active":true,"pattern":"F1","matchCount":326145,"probability":0.019439756870269775,"expectedRolls":52,"rarity":"Uncommon","probabilityReward":31413.368953530062,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"letter_run","name":"Letter Run","category":"hex_pattern","predicate":{"type":"hexContains","value":"ABC"},"semanticTags":["sequence"],"symbol":"🔤","description":"The hexadecimal color contains ABC.","active":true,"pattern":"ABC","matchCount":16383,"probability":0.0009765028953552246,"expectedRolls":1025,"rarity":"Epic","probabilityReward":546469.080735078,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"digit_run","name":"Digit Run","category":"hex_pattern","predicate":{"type":"hexContains","value":"123"},"semanticTags":["sequence"],"symbol":"🔢","description":"The hexadecimal color contains 123.","active":true,"pattern":"123","matchCount":16383,"probability":0.0009765028953552246,"expectedRolls":1025,"rarity":"Epic","probabilityReward":546469.080735078,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_00","name":"Double 0","category":"hex_pair","predicate":{"type":"hexContains","value":"00"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains 00.","active":true,"pattern":"00","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_11","name":"Double 1","category":"hex_pair","predicate":{"type":"hexContains","value":"11"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains 11.","active":true,"pattern":"11","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_22","name":"Double 2","category":"hex_pair","predicate":{"type":"hexContains","value":"22"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains 22.","active":true,"pattern":"22","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_33","name":"Double 3","category":"hex_pair","predicate":{"type":"hexContains","value":"33"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains 33.","active":true,"pattern":"33","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_44","name":"Double 4","category":"hex_pair","predicate":{"type":"hexContains","value":"44"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains 44.","active":true,"pattern":"44","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_55","name":"Double 5","category":"hex_pair","predicate":{"type":"hexContains","value":"55"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains 55.","active":true,"pattern":"55","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_66","name":"Double 6","category":"hex_pair","predicate":{"type":"hexContains","value":"66"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains 66.","active":true,"pattern":"66","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_77","name":"Double 7","category":"hex_pair","predicate":{"type":"hexContains","value":"77"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains 77.","active":true,"pattern":"77","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_88","name":"Double 8","category":"hex_pair","predicate":{"type":"hexContains","value":"88"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains 88.","active":true,"pattern":"88","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_99","name":"Double 9","category":"hex_pair","predicate":{"type":"hexContains","value":"99"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains 99.","active":true,"pattern":"99","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_aa","name":"Double A","category":"hex_pair","predicate":{"type":"hexContains","value":"AA"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains AA.","active":true,"pattern":"AA","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_bb","name":"Double B","category":"hex_pair","predicate":{"type":"hexContains","value":"BB"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains BB.","active":true,"pattern":"BB","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_cc","name":"Double C","category":"hex_pair","predicate":{"type":"hexContains","value":"CC"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains CC.","active":true,"pattern":"CC","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_dd","name":"Double D","category":"hex_pair","predicate":{"type":"hexContains","value":"DD"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains DD.","active":true,"pattern":"DD","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_ee","name":"Double E","category":"hex_pair","predicate":{"type":"hexContains","value":"EE"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains EE.","active":true,"pattern":"EE","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_ff","name":"Double F","category":"hex_pair","predicate":{"type":"hexContains","value":"FF"},"semanticTags":["sequence"],"symbol":"🔁","description":"The hexadecimal color contains FF.","active":true,"pattern":"FF","matchCount":310591,"probability":0.01851266622543335,"expectedRolls":55,"rarity":"Uncommon","probabilityReward":32779.61124935036,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_000","name":"Triple 0","category":"hex_triplet","predicate":{"type":"hexContains","value":"000"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains 000.","active":true,"pattern":"000","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_111","name":"Triple 1","category":"hex_triplet","predicate":{"type":"hexContains","value":"111"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains 111.","active":true,"pattern":"111","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_222","name":"Triple 2","category":"hex_triplet","predicate":{"type":"hexContains","value":"222"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains 222.","active":true,"pattern":"222","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_333","name":"Triple 3","category":"hex_triplet","predicate":{"type":"hexContains","value":"333"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains 333.","active":true,"pattern":"333","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_444","name":"Triple 4","category":"hex_triplet","predicate":{"type":"hexContains","value":"444"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains 444.","active":true,"pattern":"444","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_555","name":"Triple 5","category":"hex_triplet","predicate":{"type":"hexContains","value":"555"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains 555.","active":true,"pattern":"555","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_666","name":"Triple 6","category":"hex_triplet","predicate":{"type":"hexContains","value":"666"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains 666.","active":true,"pattern":"666","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_777","name":"Triple 7","category":"hex_triplet","predicate":{"type":"hexContains","value":"777"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains 777.","active":true,"pattern":"777","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_888","name":"Triple 8","category":"hex_triplet","predicate":{"type":"hexContains","value":"888"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains 888.","active":true,"pattern":"888","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_999","name":"Triple 9","category":"hex_triplet","predicate":{"type":"hexContains","value":"999"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains 999.","active":true,"pattern":"999","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_aaa","name":"Triple A","category":"hex_triplet","predicate":{"type":"hexContains","value":"AAA"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains AAA.","active":true,"pattern":"AAA","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_bbb","name":"Triple B","category":"hex_triplet","predicate":{"type":"hexContains","value":"BBB"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains BBB.","active":true,"pattern":"BBB","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_ccc","name":"Triple C","category":"hex_triplet","predicate":{"type":"hexContains","value":"CCC"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains CCC.","active":true,"pattern":"CCC","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_ddd","name":"Triple D","category":"hex_triplet","predicate":{"type":"hexContains","value":"DDD"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains DDD.","active":true,"pattern":"DDD","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_eee","name":"Triple E","category":"hex_triplet","predicate":{"type":"hexContains","value":"EEE"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains EEE.","active":true,"pattern":"EEE","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"contains_fff","name":"Triple F","category":"hex_triplet","predicate":{"type":"hexContains","value":"FFF"},"semanticTags":["sequence"],"symbol":"3️⃣","description":"The hexadecimal color contains FFF.","active":true,"pattern":"FFF","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.025,"variationMinBps":-700,"variationMaxBps":700},{"id":"dead","name":"Dead Man Walking","category":"hex_culture","predicate":{"type":"hexContains","value":"DEAD"},"semanticTags":["named"],"symbol":"💀","description":"The hexadecimal color contains DEAD.","active":true,"pattern":"DEAD","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"beef","name":"Where Is the Beef?","category":"hex_culture","predicate":{"type":"hexContains","value":"BEEF"},"semanticTags":["named"],"symbol":"🥩","description":"The hexadecimal color contains BEEF.","active":true,"pattern":"BEEF","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"cafe","name":"Coffee Break","category":"hex_culture","predicate":{"type":"hexContains","value":"CAFE"},"semanticTags":["named"],"symbol":"☕","description":"The hexadecimal color contains CAFE.","active":true,"pattern":"CAFE","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"face","name":"Face Value","category":"hex_culture","predicate":{"type":"hexContains","value":"FACE"},"semanticTags":["named"],"symbol":"😎","description":"The hexadecimal color contains FACE.","active":true,"pattern":"FACE","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"babe","name":"Babe","category":"hex_culture","predicate":{"type":"hexContains","value":"BABE"},"semanticTags":["named"],"symbol":"👶","description":"The hexadecimal color contains BABE.","active":true,"pattern":"BABE","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"fade","name":"Fade","category":"hex_culture","predicate":{"type":"hexContains","value":"FADE"},"semanticTags":["named"],"symbol":"🕳️","description":"The hexadecimal color contains FADE.","active":true,"pattern":"FADE","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"feed","name":"Feed","category":"hex_culture","predicate":{"type":"hexContains","value":"FEED"},"semanticTags":["named"],"symbol":"🍼","description":"The hexadecimal color contains FEED.","active":true,"pattern":"FEED","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"boob","name":"Boob","category":"hex_culture","predicate":{"type":"hexContains","value":"B00B"},"semanticTags":["meme"],"symbol":"🍒","description":"The hexadecimal color contains B00B.","active":true,"pattern":"B00B","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"dood","name":"Dood","category":"hex_culture","predicate":{"type":"hexContains","value":"D00D"},"semanticTags":["named"],"symbol":"🧑‍🎨","description":"The hexadecimal color contains D00D.","active":true,"pattern":"D00D","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"food","name":"Food","category":"hex_culture","predicate":{"type":"hexContains","value":"F00D"},"semanticTags":["named"],"symbol":"🍔","description":"The hexadecimal color contains F00D.","active":true,"pattern":"F00D","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"leet","name":"Leet Speak","category":"hex_culture","predicate":{"type":"hexContains","value":"1337"},"semanticTags":["meme"],"symbol":"💻","description":"The hexadecimal color contains 1337.","active":true,"pattern":"1337","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"boob_2","name":"Boob Two","category":"hex_culture","predicate":{"type":"hexContains","value":"8008"},"semanticTags":["meme"],"symbol":"🍈","description":"The hexadecimal color contains 8008.","active":true,"pattern":"8008","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"abcd","name":"Alphabetical","category":"hex_culture","predicate":{"type":"hexContains","value":"ABCD"},"semanticTags":["sequence","named"],"symbol":"🔤","description":"The hexadecimal color contains ABCD.","active":true,"pattern":"ABCD","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.07500000000000001,"variationMinBps":-700,"variationMaxBps":700},{"id":"james_bond","name":"James Bond","category":"hex_culture","predicate":{"type":"hexContains","value":"007"},"semanticTags":["named"],"symbol":"🕵️","description":"The hexadecimal color contains 007.","active":true,"pattern":"007","matchCount":16383,"probability":0.0009765028953552246,"expectedRolls":1025,"rarity":"Epic","probabilityReward":546469.080735078,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"blaze_it","name":"Blaze It","category":"hex_culture","predicate":{"type":"hexContains","value":"420"},"semanticTags":["meme"],"symbol":"🌿","description":"The hexadecimal color contains 420.","active":true,"pattern":"420","matchCount":16383,"probability":0.0009765028953552246,"expectedRolls":1025,"rarity":"Epic","probabilityReward":546469.080735078,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"nice","name":"Nice","category":"hex_culture","predicate":{"type":"hexContains","value":"69"},"semanticTags":["meme"],"symbol":"😏","description":"The hexadecimal color contains 69.","active":true,"pattern":"69","matchCount":326145,"probability":0.019439756870269775,"expectedRolls":52,"rarity":"Uncommon","probabilityReward":31413.368953530062,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"demon","name":"Demon","category":"hex_culture","predicate":{"type":"hexContains","value":"666"},"semanticTags":["meme"],"symbol":"😈","description":"The hexadecimal color contains 666.","active":true,"pattern":"666","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"jackpot","name":"Jackpot","category":"hex_culture","predicate":{"type":"hexContains","value":"777"},"semanticTags":["meme"],"symbol":"🎰","description":"The hexadecimal color contains 777.","active":true,"pattern":"777","matchCount":15616,"probability":0.0009307861328125,"expectedRolls":1075,"rarity":"Epic","probabilityReward":640175.3991080989,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"emergency","name":"Emergency","category":"hex_culture","predicate":{"type":"hexContains","value":"911"},"semanticTags":["named"],"symbol":"🚨","description":"The hexadecimal color contains 911.","active":true,"pattern":"911","matchCount":16383,"probability":0.0009765028953552246,"expectedRolls":1025,"rarity":"Epic","probabilityReward":546469.080735078,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"not_found","name":"Not Found","category":"hex_culture","predicate":{"type":"hexContains","value":"404"},"semanticTags":["named"],"symbol":"🚫","description":"The hexadecimal color contains 404.","active":true,"pattern":"404","matchCount":16351,"probability":0.0009745955467224121,"expectedRolls":1027,"rarity":"Epic","probabilityReward":550290.087114891,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"server_error","name":"Server Error","category":"hex_culture","predicate":{"type":"hexContains","value":"500"},"semanticTags":["named"],"symbol":"⚠️","description":"The hexadecimal color contains 500.","active":true,"pattern":"500","matchCount":16383,"probability":0.0009765028953552246,"expectedRolls":1025,"rarity":"Epic","probabilityReward":546469.080735078,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"perfect_score","name":"Perfect Score","category":"hex_culture","predicate":{"type":"hexContains","value":"100"},"semanticTags":["named"],"symbol":"💯","description":"The hexadecimal color contains 100.","active":true,"pattern":"100","matchCount":16383,"probability":0.0009765028953552246,"expectedRolls":1025,"rarity":"Epic","probabilityReward":546469.080735078,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"pure_black","name":"The Void","category":"exact","predicate":{"type":"channelExact","red":0,"green":0,"blue":0},"semanticTags":["exact"],"symbol":"🌑","description":"The RGB color is exactly (0, 0, 0).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"pure_white","name":"The Light","category":"exact","predicate":{"type":"channelExact","red":255,"green":255,"blue":255},"semanticTags":["exact"],"symbol":"☀️","description":"The RGB color is exactly (255, 255, 255).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"pure_red","name":"Maximum Red","category":"exact","predicate":{"type":"channelExact","red":255,"green":0,"blue":0},"semanticTags":["exact"],"symbol":"🟥","description":"The RGB color is exactly (255, 0, 0).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"pure_green","name":"Maximum Green","category":"exact","predicate":{"type":"channelExact","red":0,"green":255,"blue":0},"semanticTags":["exact"],"symbol":"🟩","description":"The RGB color is exactly (0, 255, 0).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"pure_blue","name":"Maximum Blue","category":"exact","predicate":{"type":"channelExact","red":0,"green":0,"blue":255},"semanticTags":["exact"],"symbol":"🟦","description":"The RGB color is exactly (0, 0, 255).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"pure_cyan","name":"Maximum Cyan","category":"exact","predicate":{"type":"channelExact","red":0,"green":255,"blue":255},"semanticTags":["exact"],"symbol":"🟦","description":"The RGB color is exactly (0, 255, 255).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"pure_magenta","name":"Maximum Magenta","category":"exact","predicate":{"type":"channelExact","red":255,"green":0,"blue":255},"semanticTags":["exact"],"symbol":"🟪","description":"The RGB color is exactly (255, 0, 255).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"pure_yellow","name":"Maximum Yellow","category":"exact","predicate":{"type":"channelExact","red":255,"green":255,"blue":0},"semanticTags":["exact"],"symbol":"🟨","description":"The RGB color is exactly (255, 255, 0).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"pure_gold","name":"Midas","category":"exact","predicate":{"type":"channelExact","red":255,"green":215,"blue":0},"semanticTags":["exact"],"symbol":"🥇","description":"The RGB color is exactly (255, 215, 0).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"streamer_purple","name":"Streamer Purple","category":"exact","predicate":{"type":"channelExact","red":145,"green":70,"blue":255},"semanticTags":["exact"],"symbol":"🟣","description":"The RGB color is exactly (145, 70, 255).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"audio_stream_green","name":"Audio Stream Green","category":"exact","predicate":{"type":"channelExact","red":30,"green":215,"blue":96},"semanticTags":["exact"],"symbol":"🟢","description":"The RGB color is exactly (30, 215, 96).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"classic_cola_red","name":"Classic Cola Red","category":"exact","predicate":{"type":"channelExact","red":244,"green":0,"blue":9},"semanticTags":["exact"],"symbol":"🥤","description":"The RGB color is exactly (244, 0, 9).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"almost_black","name":"Almost Black","category":"exact","predicate":{"type":"channelExact","red":0,"green":0,"blue":1},"semanticTags":["exact"],"symbol":"🌑","description":"The RGB color is exactly (0, 0, 1).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"almost_white","name":"Almost White","category":"exact","predicate":{"type":"channelExact","red":255,"green":255,"blue":254},"semanticTags":["exact"],"symbol":"☀️","description":"The RGB color is exactly (255, 255, 254).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"perfect_grey","name":"Perfect Grey","category":"exact","predicate":{"type":"channelExact","red":127,"green":127,"blue":127},"semanticTags":["exact"],"symbol":"🔘","description":"The RGB color is exactly (127, 127, 127).","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.15,"variationMinBps":-700,"variationMaxBps":700},{"id":"reference_123456","name":"Reference Sequence","category":"exact","predicate":{"type":"hexExact","value":"123456"},"semanticTags":["exact","sequence","named"],"symbol":"🔢","description":"The hexadecimal color is exactly 123456.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"reference_abcdef","name":"Alphabetic Gradient","category":"exact","predicate":{"type":"hexExact","value":"ABCDEF"},"semanticTags":["exact","sequence","named"],"symbol":"🔤","description":"The hexadecimal color is exactly ABCDEF.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"reference_fedcba","name":"Reverse Gradient","category":"exact","predicate":{"type":"hexExact","value":"FEDCBA"},"semanticTags":["exact","sequence","named"],"symbol":"🔄","description":"The hexadecimal color is exactly FEDCBA.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"six_seven","name":"Six Seven","category":"hex_culture","predicate":{"type":"hexContains","value":"67"},"semanticTags":["meme"],"symbol":"6️⃣","description":"The hexadecimal color contains 67.","active":true,"exclusiveGroup":"six_seven","exclusiveRank":1,"pattern":"67","matchCount":325378,"probability":0.01939404010772705,"expectedRolls":52,"rarity":"Uncommon","probabilityReward":31479.19904274948,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"six_seven_echo","name":"Six Seven Echo","category":"hex_culture","predicate":{"type":"hexContains","value":"6767"},"semanticTags":["meme","sequence"],"symbol":"🔁","description":"The hexadecimal color contains 6767.","active":true,"exclusiveGroup":"six_seven","exclusiveRank":2,"pattern":"6767","matchCount":766,"probability":0.00004565715789794922,"expectedRolls":21903,"rarity":"Legendary","probabilityReward":37346656.65828862,"semanticBonus":0.1,"variationMinBps":-700,"variationMaxBps":700},{"id":"six_seven_full","name":"Six Seven Full House","category":"hex_culture","predicate":{"type":"hexExact","value":"676767"},"semanticTags":["meme","sequence","exact"],"symbol":"🎲","description":"The hexadecimal color is exactly 676767.","active":true,"exclusiveGroup":"six_seven","exclusiveRank":3,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"a24","name":"A24","category":"hex_culture","predicate":{"type":"hexContains","value":"A24"},"semanticTags":["named"],"symbol":"🎬","description":"The hexadecimal color contains A24.","active":true,"pattern":"A24","matchCount":16383,"probability":0.0009765028953552246,"expectedRolls":1025,"rarity":"Epic","probabilityReward":546469.080735078,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"bee","name":"Bee","category":"hex_culture","predicate":{"type":"hexContains","value":"BEE"},"semanticTags":["named"],"symbol":"🐝","description":"The hexadecimal color contains BEE.","active":true,"pattern":"BEE","matchCount":16383,"probability":0.0009765028953552246,"expectedRolls":1025,"rarity":"Epic","probabilityReward":546469.080735078,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"ff7","name":"Final Fantasy VII","category":"hex_culture","predicate":{"type":"hexContains","value":"FF7"},"semanticTags":["named"],"symbol":"🗡️","description":"The hexadecimal color contains FF7.","active":true,"pattern":"FF7","matchCount":16383,"probability":0.0009765028953552246,"expectedRolls":1025,"rarity":"Epic","probabilityReward":546469.080735078,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"a113","name":"A113","category":"hex_culture","predicate":{"type":"hexContains","value":"A113"},"semanticTags":["named"],"symbol":"🎞️","description":"The hexadecimal color contains A113.","active":true,"pattern":"A113","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"eight_oh_eight","name":"808","category":"hex_culture","predicate":{"type":"hexContains","value":"808"},"semanticTags":["named"],"symbol":"🥁","description":"The hexadecimal color contains 808.","active":true,"pattern":"808","matchCount":16351,"probability":0.0009745955467224121,"expectedRolls":1027,"rarity":"Epic","probabilityReward":550290.087114891,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"era_1989","name":"1989 Era","category":"hex_culture","predicate":{"type":"hexContains","value":"1989"},"semanticTags":["named"],"symbol":"🎤","description":"The hexadecimal color contains 1989.","active":true,"pattern":"1989","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"blaze_nice","name":"Blaze Nice","category":"hex_culture","predicate":{"type":"hexContains","value":"42069"},"semanticTags":["meme"],"symbol":"🌿","description":"The hexadecimal color contains 42069.","active":true,"pattern":"42069","matchCount":32,"probability":0.0000019073486328125,"expectedRolls":524288,"rarity":"Anomaly","probabilityReward":524288000.00000006,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"nice_blaze","name":"Nice Blaze","category":"hex_culture","predicate":{"type":"hexContains","value":"69420"},"semanticTags":["meme"],"symbol":"😏","description":"The hexadecimal color contains 69420.","active":true,"pattern":"69420","matchCount":32,"probability":0.0000019073486328125,"expectedRolls":524288,"rarity":"Anomaly","probabilityReward":524288000.00000006,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"calculator_classic","name":"Calculator Classic","category":"hex_culture","predicate":{"type":"hexContains","value":"58008"},"semanticTags":["meme"],"symbol":"🧮","description":"The hexadecimal color contains 58008.","active":true,"pattern":"58008","matchCount":32,"probability":0.0000019073486328125,"expectedRolls":524288,"rarity":"Anomaly","probabilityReward":524288000.00000006,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"calculator_hello","name":"Calculator Hello","category":"hex_culture","predicate":{"type":"hexContains","value":"07734"},"semanticTags":["meme"],"symbol":"👋","description":"The hexadecimal color contains 07734.","active":true,"pattern":"07734","matchCount":32,"probability":0.0000019073486328125,"expectedRolls":524288,"rarity":"Anomaly","probabilityReward":524288000.00000006,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"calculator_boobs","name":"Calculator Boobs","category":"hex_culture","predicate":{"type":"hexContains","value":"80085"},"semanticTags":["meme"],"symbol":"🙃","description":"The hexadecimal color contains 80085.","active":true,"pattern":"80085","matchCount":32,"probability":0.0000019073486328125,"expectedRolls":524288,"rarity":"Anomaly","probabilityReward":524288000.00000006,"semanticBonus":0.075,"variationMinBps":-700,"variationMaxBps":700},{"id":"double_blaze","name":"Double Blaze","category":"hex_culture","predicate":{"type":"hexContains","value":"420420"},"semanticTags":["meme","sequence"],"symbol":"🔥","description":"The hexadecimal color contains 420420.","active":true,"pattern":"420420","matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.1,"variationMinBps":-700,"variationMaxBps":700},{"id":"double_not_found","name":"404 Echo","category":"hex_culture","predicate":{"type":"hexContains","value":"404404"},"semanticTags":["named","sequence"],"symbol":"🕳️","description":"The hexadecimal color contains 404404.","active":true,"pattern":"404404","matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.07500000000000001,"variationMinBps":-700,"variationMaxBps":700},{"id":"six_sixes","name":"Six Sixes","category":"hex_culture","predicate":{"type":"hexContains","value":"666666"},"semanticTags":["meme","sequence"],"symbol":"😈","description":"The hexadecimal color contains 666666.","active":true,"pattern":"666666","matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.1,"variationMinBps":-700,"variationMaxBps":700},{"id":"nice_stack","name":"Nice Stack","category":"hex_culture","predicate":{"type":"hexContains","value":"696969"},"semanticTags":["meme","sequence"],"symbol":"😏","description":"The hexadecimal color contains 696969.","active":true,"pattern":"696969","matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.1,"variationMinBps":-700,"variationMaxBps":700},{"id":"jackpot_stack","name":"Jackpot Stack","category":"hex_culture","predicate":{"type":"hexContains","value":"777777"},"semanticTags":["meme","sequence"],"symbol":"🎰","description":"The hexadecimal color contains 777777.","active":true,"pattern":"777777","matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.1,"variationMinBps":-700,"variationMaxBps":700},{"id":"leet_stack","name":"Leet Stack","category":"hex_culture","predicate":{"type":"hexContains","value":"133713"},"semanticTags":["meme","sequence"],"symbol":"💻","description":"The hexadecimal color contains 133713.","active":true,"pattern":"133713","matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.1,"variationMinBps":-700,"variationMaxBps":700},{"id":"coffee_code","name":"Coffee Code","category":"hex_culture","predicate":{"type":"hexExact","value":"C0FFEE"},"semanticTags":["named","exact"],"symbol":"☕","description":"The hexadecimal color is exactly C0FFEE.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"code_echo","name":"Code Echo","category":"hex_culture","predicate":{"type":"hexContains","value":"C0D3"},"semanticTags":["named"],"symbol":"👾","description":"The hexadecimal color contains C0D3.","active":true,"pattern":"C0D3","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"decode","name":"Decode","category":"hex_culture","predicate":{"type":"hexExact","value":"DEC0DE"},"semanticTags":["named","exact"],"symbol":"🔓","description":"The hexadecimal color is exactly DEC0DE.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"facade","name":"Facade","category":"hex_culture","predicate":{"type":"hexExact","value":"FACADE"},"semanticTags":["named","exact"],"symbol":"🎭","description":"The hexadecimal color is exactly FACADE.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"deface","name":"Deface","category":"hex_culture","predicate":{"type":"hexExact","value":"DEFACE"},"semanticTags":["named","exact"],"symbol":"🖌️","description":"The hexadecimal color is exactly DEFACE.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"badass","name":"Badass","category":"hex_culture","predicate":{"type":"hexExact","value":"BADA55"},"semanticTags":["meme","exact"],"symbol":"😎","description":"The hexadecimal color is exactly BADA55.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"foobar","name":"Foobar","category":"hex_culture","predicate":{"type":"hexExact","value":"F00BA4"},"semanticTags":["named","exact"],"symbol":"🧪","description":"The hexadecimal color is exactly F00BA4.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"boba","name":"Boba","category":"hex_culture","predicate":{"type":"hexContains","value":"B0BA"},"semanticTags":["named"],"symbol":"🧋","description":"The hexadecimal color contains B0BA.","active":true,"pattern":"B0BA","matchCount":768,"probability":0.0000457763671875,"expectedRolls":21846,"rarity":"Legendary","probabilityReward":37239073.87152481,"semanticBonus":0.05,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_meme_symmetry","name":"Meme Mirror","category":"combination","predicate":{"type":"combination","all":["nice","red_blue_equal"]},"semanticTags":["combination","meme"],"symbol":"🪞","description":"The nice + red_blue_equal signals align in one color.","active":true,"matchCount":1022,"probability":0.00006091594696044922,"expectedRolls":16417,"rarity":"Legendary","probabilityReward":25450554.7977322,"semanticBonus":0.175,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_meme_palindrome","name":"Meme Palindrome","category":"combination","predicate":{"type":"combination","all":["blaze_it","palindrome"]},"semanticTags":["combination","meme","sequence"],"symbol":"🌿","description":"The blaze_it + palindrome signals align in one color.","active":true,"matchCount":2,"probability":1.1920928955078125e-7,"expectedRolls":8388608,"rarity":"Anomaly","probabilityReward":8388608000.000001,"semanticBonus":0.19999999999999998,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_sequence_channel_order","name":"Ordered Sequence","category":"combination","predicate":{"type":"combination","all":["ascending_channels","hex_ascending"]},"semanticTags":["combination","sequence"],"symbol":"📈","description":"The ascending_channels + hex_ascending signals align in one color.","active":true,"matchCount":8008,"probability":0.0004773139953613281,"expectedRolls":2096,"rarity":"Epic","probabilityReward":1945380.9203934574,"semanticBonus":0.125,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_reverse_sequence","name":"Reversed Sequence","category":"combination","predicate":{"type":"combination","all":["descending_channels","hex_descending"]},"semanticTags":["combination","sequence"],"symbol":"📉","description":"The descending_channels + hex_descending signals align in one color.","active":true,"matchCount":8008,"probability":0.0004773139953613281,"expectedRolls":2096,"rarity":"Epic","probabilityReward":1945380.9203934574,"semanticBonus":0.125,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_prime_palindrome","name":"Prime Mirror","category":"combination","predicate":{"type":"combination","all":["sum_prime","palindrome"]},"semanticTags":["combination","named"],"symbol":"🔢","description":"The sum_prime + palindrome signals align in one color.","active":true,"matchCount":3,"probability":1.7881393432617188e-7,"expectedRolls":5592406,"rarity":"Anomaly","probabilityReward":5592405333.333334,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_square_greyscale","name":"Square Grey","category":"combination","predicate":{"type":"combination","all":["sum_square","greyscale"]},"semanticTags":["combination","named"],"symbol":"⚫","description":"The sum_square + greyscale signals align in one color.","active":true,"matchCount":10,"probability":5.960464477539062e-7,"expectedRolls":1677722,"rarity":"Anomaly","probabilityReward":1677721600.0000002,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_fibonacci_sequence","name":"Fibonacci Flow","category":"combination","predicate":{"type":"combination","all":["sum_fibonacci","ascending_channels"]},"semanticTags":["combination","sequence","named"],"symbol":"🌀","description":"The sum_fibonacci + ascending_channels signals align in one color.","active":true,"matchCount":17444,"probability":0.001039743423461914,"expectedRolls":962,"rarity":"Rare","probabilityReward":492382.234996554,"semanticBonus":0.175,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_high_contrast_neon","name":"Neon Contrast","category":"combination","predicate":{"type":"combination","all":["high_contrast","neon"]},"semanticTags":["combination","named"],"symbol":"💡","description":"The high_contrast + neon signals align in one color.","active":true,"matchCount":1566180,"probability":0.09335160255432129,"expectedRolls":11,"rarity":"Common","probabilityReward":4061.349190267277,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_pastel_luminous","name":"Pastel Light","category":"combination","predicate":{"type":"combination","all":["pastel","lightness_luminous"]},"semanticTags":["combination","named"],"symbol":"🌸","description":"The pastel + lightness_luminous signals align in one color.","active":true,"matchCount":231807,"probability":0.013816773891448975,"expectedRolls":73,"rarity":"Uncommon","probabilityReward":40959.758219616815,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_warm_red","name":"Warm Red Lead","category":"combination","predicate":{"type":"combination","all":["temperature_warm","red_dominant"]},"semanticTags":["combination","named"],"symbol":"🔥","description":"The temperature_warm + red_dominant signals align in one color.","active":true,"matchCount":5559680,"probability":0.33138275146484375,"expectedRolls":4,"rarity":"Common","probabilityReward":2158.713318728861,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_cool_blue","name":"Cool Blue Lead","category":"combination","predicate":{"type":"combination","all":["temperature_cool","blue_dominant"]},"semanticTags":["combination","named"],"symbol":"❄️","description":"The temperature_cool + blue_dominant signals align in one color.","active":true,"matchCount":5559680,"probability":0.33138275146484375,"expectedRolls":4,"rarity":"Common","probabilityReward":2158.713318728861,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_complement_vivid","name":"Vivid Complement","category":"combination","predicate":{"type":"combination","all":["channel_complement_red_blue","saturation_vivid"]},"semanticTags":["combination","named"],"symbol":"☯️","description":"The channel_complement_red_blue + saturation_vivid signals align in one color.","active":true,"matchCount":24792,"probability":0.0014777183532714844,"expectedRolls":677,"rarity":"Rare","probabilityReward":423682.9193086122,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_web_safe_greyscale","name":"Safe Grey","category":"combination","predicate":{"type":"combination","all":["web_safe","greyscale"]},"semanticTags":["combination","named"],"symbol":"🕸️","description":"The web_safe + greyscale signals align in one color.","active":true,"matchCount":6,"probability":3.5762786865234375e-7,"expectedRolls":2796203,"rarity":"Anomaly","probabilityReward":2796202666.666667,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_repeated_palindrome","name":"Echo Mirror","category":"combination","predicate":{"type":"combination","all":["repeated_pair","palindrome"]},"semanticTags":["combination","sequence"],"symbol":"🔁","description":"The repeated_pair + palindrome signals align in one color.","active":true,"matchCount":16,"probability":9.5367431640625e-7,"expectedRolls":1048576,"rarity":"Anomaly","probabilityReward":1048576000.0000001,"semanticBonus":0.125,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_sixfold_greyscale","name":"Sixfold Grey","category":"combination","predicate":{"type":"combination","all":["sixfold_digit","greyscale"]},"semanticTags":["combination","sequence","named"],"symbol":"⚫","description":"The sixfold_digit + greyscale signals align in one color.","active":true,"matchCount":16,"probability":9.5367431640625e-7,"expectedRolls":1048576,"rarity":"Anomaly","probabilityReward":1048576000.0000001,"semanticBonus":0.175,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_exact_sequence","name":"Exact Sequence","category":"combination","predicate":{"type":"combination","all":["reference_123456","hex_staircase"]},"semanticTags":["combination","exact","sequence"],"symbol":"🔢","description":"The reference_123456 + hex_staircase signals align in one color.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_exact_reverse","name":"Exact Reverse","category":"combination","predicate":{"type":"combination","all":["reference_fedcba","hex_reverse_staircase"]},"semanticTags":["combination","exact","sequence"],"symbol":"🔄","description":"The reference_fedcba + hex_reverse_staircase signals align in one color.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_anomaly_meme","name":"Stacked Meme","category":"combination","predicate":{"type":"combination","all":["six_sixes","demon"]},"semanticTags":["combination","meme","sequence"],"symbol":"😈","description":"The six_sixes + demon signals align in one color.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.19999999999999998,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_six_seven_palindrome","name":"Six Seven Mirror","category":"combination","predicate":{"type":"combination","all":["six_seven_full","greyscale"]},"semanticTags":["combination","meme","sequence"],"symbol":"6️⃣","description":"The six_seven_full + greyscale signals align in one color.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.19999999999999998,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_hex_letters","name":"Lettered Spectrum","category":"combination","predicate":{"type":"combination","all":["hex_letter_rich","hex_letter_majority"]},"semanticTags":["combination","named"],"symbol":"🔤","description":"The hex_letter_rich + hex_letter_majority signals align in one color.","active":true,"matchCount":2457216,"probability":0.14646148681640625,"expectedRolls":7,"rarity":"Common","probabilityReward":3384.9528928948457,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_digit_structure","name":"Digit Structure","category":"combination","predicate":{"type":"combination","all":["hex_digit_rich","hex_digit_sum_prime"]},"semanticTags":["combination","named"],"symbol":"🔢","description":"The hex_digit_rich + hex_digit_sum_prime signals align in one color.","active":true,"matchCount":2499197,"probability":0.14896374940872192,"expectedRolls":7,"rarity":"Common","probabilityReward":3359.5116298307416,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_power_progression","name":"Electric Progression","category":"combination","predicate":{"type":"combination","all":["power_two_any","channel_progression"]},"semanticTags":["combination","sequence"],"symbol":"⚡","description":"The power_two_any + channel_progression signals align in one color.","active":true,"matchCount":7292,"probability":0.00043463706970214844,"expectedRolls":2301,"rarity":"Epic","probabilityReward":2128429.1999135083,"semanticBonus":0.125,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_edge_contrast","name":"Edge Contrast","category":"combination","predicate":{"type":"combination","all":["edge_pair","extreme_span"]},"semanticTags":["combination","named"],"symbol":"⚡","description":"The edge_pair + extreme_span signals align in one color.","active":true,"matchCount":127080,"probability":0.007574558258056641,"expectedRolls":133,"rarity":"Rare","probabilityReward":104289.0897585077,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_saturation_tone","name":"Saturated Light","category":"combination","predicate":{"type":"combination","all":["saturation_electric","lightness_luminous"]},"semanticTags":["combination","named"],"symbol":"✨","description":"The saturation_electric + lightness_luminous signals align in one color.","active":true,"matchCount":29988,"probability":0.001787424087524414,"expectedRolls":560,"rarity":"Rare","probabilityReward":386496.8294202694,"semanticBonus":0.15000000000000002,"variationMinBps":-700,"variationMaxBps":700},{"id":"combo_culture_exact","name":"Cultural Artifact","category":"combination","predicate":{"type":"combination","all":["coffee_code","hex_letter_majority"]},"semanticTags":["combination","exact","named"],"symbol":"☕","description":"The coffee_code + hex_letter_majority signals align in one color.","active":true,"matchCount":1,"probability":5.960464477539063e-8,"expectedRolls":16777216,"rarity":"Anomaly","probabilityReward":16777216000.000002,"semanticBonus":0.2,"variationMinBps":-700,"variationMaxBps":700}]'::jsonb;
  v_entry jsonb;
  v_resolved jsonb;
  v_raw_ids jsonb := '[]'::jsonb;
  v_selected_ids jsonb := '[]'::jsonb;
  v_winner_ids jsonb := '{}'::jsonb;
  v_winner_ranks jsonb := '{}'::jsonb;
  v_conditions jsonb := '[]'::jsonb;
  v_contributors jsonb := '[]'::jsonb;
  v_sorted_contributors jsonb := '[]'::jsonb;
  v_condition_rarity_map jsonb := '{}'::jsonb;
  v_base_points_map jsonb := '{}'::jsonb;
  v_awarded_points_map jsonb := '{}'::jsonb;
  v_id text;
  v_group text;
  v_condition_rarity text;
  v_rank integer;
  v_hex text;
  v_sum integer;
  v_max integer;
  v_min integer;
  v_range integer;
  v_hex_letter_count integer;
  v_hex_digit_count integer;
  v_hex_digit_sum integer := 0;
  v_hex_unique_count integer;
  v_hue numeric := 0;
  v_saturation numeric := 0;
  v_lightness numeric := 0;
  v_delta numeric;
  v_rn numeric;
  v_gn numeric;
  v_bn numeric;
  v_maxn numeric;
  v_minn numeric;
  v_family text;
  v_saturation_label text;
  v_lightness_label text;
  v_temperature text;
  v_structure text;
  v_probability numeric;
  v_probability_reward numeric;
  v_semantic_bonus numeric;
  v_reward_strength numeric;
  v_band_min bigint;
  v_band_max bigint;
  v_base_points bigint;
  v_awarded bigint;
  v_variation_bps bigint;
  v_score bigint := 0;
  v_rarity text;
  v_traits jsonb;
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
  v_hex_letter_count := length(regexp_replace(v_hex, '[^A-F]', '', 'g'));
  v_hex_digit_count := length(regexp_replace(v_hex, '[^0-9]', '', 'g'));
  SELECT COALESCE(sum(strpos('0123456789ABCDEF', character) - 1), 0)
  INTO v_hex_digit_sum
  FROM regexp_split_to_table(v_hex, '') AS character;
  SELECT count(DISTINCT character)
  INTO v_hex_unique_count
  FROM regexp_split_to_table(v_hex, '') AS character;

  v_rn := p_r::numeric / 255;
  v_gn := p_g::numeric / 255;
  v_bn := p_b::numeric / 255;
  v_maxn := greatest(v_rn, v_gn, v_bn);
  v_minn := least(v_rn, v_gn, v_bn);
  v_delta := v_maxn - v_minn;
  v_lightness := round(((v_maxn + v_minn) / 2) * 100, 12);
  IF v_delta <> 0 THEN
    IF v_maxn = v_rn THEN
      v_hue := 60 * mod((v_gn - v_bn) / v_delta, 6);
    ELSIF v_maxn = v_gn THEN
      v_hue := 60 * (((v_bn - v_rn) / v_delta) + 2);
    ELSE
      v_hue := 60 * (((v_rn - v_gn) / v_delta) + 4);
    END IF;
    IF v_hue < 0 THEN v_hue := v_hue + 360; END IF;
    v_saturation := v_delta / (1 - abs(2 * ((v_maxn + v_minn) / 2) - 1)) * 100;
  END IF;
  v_hue := round(v_hue, 12);
  v_saturation := round(v_saturation, 12);

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
  v_temperature := CASE
    WHEN p_r = p_g AND p_g = p_b THEN 'Neutral'
    WHEN p_r >= p_b THEN 'Warm'
    ELSE 'Cool'
  END;
  v_structure := CASE
    WHEN v_range <= 20 THEN 'Smooth'
    WHEN v_range >= 205 THEN 'Polarized'
    ELSE 'Layered'
  END;

  -- First collect every matching non-combination predicate and identify the
  -- strongest member of each explicitly mutually-exclusive group.
  FOR v_entry IN
    SELECT value
    FROM jsonb_array_elements(v_catalog) AS item(value)
    WHERE COALESCE((value->>'active')::boolean, true)
      AND value->'predicate'->>'type' <> 'combination'
  LOOP
    IF public.chromadie_v6_condition_matches(
      v_entry->>'id', p_r, p_g, p_b, v_sum, v_range, v_hex,
      v_hue, v_saturation, v_lightness, v_family,
      v_hex_letter_count, v_hex_digit_count, v_hex_digit_sum,
      v_hex_unique_count, v_raw_ids
    ) THEN
      v_id := v_entry->>'id';
      v_raw_ids := v_raw_ids || jsonb_build_array(v_id);
      v_group := v_entry->>'exclusiveGroup';
      IF v_group IS NOT NULL THEN
        v_rank := COALESCE((v_entry->>'exclusiveRank')::integer, 0);
        IF NOT (v_winner_ranks ? v_group)
           OR v_rank > COALESCE((v_winner_ranks->>v_group)::integer, 0) THEN
          v_winner_ids := jsonb_set(v_winner_ids, ARRAY[v_group], to_jsonb(v_id), true);
          v_winner_ranks := jsonb_set(v_winner_ranks, ARRAY[v_group], to_jsonb(v_rank), true);
        END IF;
      END IF;
    END IF;
  END LOOP;

  FOR v_entry IN
    SELECT value
    FROM jsonb_array_elements(v_catalog) AS item(value)
    WHERE COALESCE((value->>'active')::boolean, true)
      AND value->'predicate'->>'type' <> 'combination'
  LOOP
    v_id := v_entry->>'id';
    v_group := v_entry->>'exclusiveGroup';
    IF (v_raw_ids ? v_id)
       AND (v_group IS NULL OR v_winner_ids->>v_group = v_id) THEN
      v_selected_ids := v_selected_ids || jsonb_build_array(v_id);
    END IF;
  END LOOP;

  -- Combination predicates intentionally see the selected component set and
  -- stack with it. They are evaluated in catalog order for deterministic IDs.
  FOR v_entry IN
    SELECT value
    FROM jsonb_array_elements(v_catalog) AS item(value)
    WHERE COALESCE((value->>'active')::boolean, true)
      AND value->'predicate'->>'type' = 'combination'
  LOOP
    IF public.chromadie_v6_condition_matches(
      v_entry->>'id', p_r, p_g, p_b, v_sum, v_range, v_hex,
      v_hue, v_saturation, v_lightness, v_family,
      v_hex_letter_count, v_hex_digit_count, v_hex_digit_sum,
      v_hex_unique_count, v_selected_ids
    ) THEN
      v_selected_ids := v_selected_ids || jsonb_build_array(v_entry->>'id');
    END IF;
  END LOOP;

  FOR v_entry IN
    SELECT value
    FROM jsonb_array_elements(v_catalog) AS item(value)
    WHERE COALESCE((value->>'active')::boolean, true)
      AND (v_selected_ids ? (value->>'id'))
  LOOP
    v_id := v_entry->>'id';
    v_condition_rarity := v_entry->>'rarity';
    v_probability := (v_entry->>'probability')::numeric;
    v_probability_reward := CASE
      WHEN v_condition_rarity = 'Anomaly'
        THEN 100000000::numeric * (0.00001::numeric / v_probability)
      ELSE (v_entry->>'probabilityReward')::numeric
    END;
    v_semantic_bonus := (v_entry->>'semanticBonus')::numeric;
    v_reward_strength := 1 + v_semantic_bonus;
    v_band_min := CASE v_condition_rarity
      WHEN 'Common' THEN 500
      WHEN 'Uncommon' THEN 5000
      WHEN 'Rare' THEN 50000
      WHEN 'Epic' THEN 500000
      WHEN 'Legendary' THEN 5000000
      ELSE 100000000
    END;
    v_band_max := CASE v_condition_rarity
      WHEN 'Common' THEN 4999
      WHEN 'Uncommon' THEN 49999
      WHEN 'Rare' THEN 499999
      WHEN 'Epic' THEN 4999999
      WHEN 'Legendary' THEN 99999999
      ELSE NULL
    END;
    v_base_points := greatest(1, round(v_probability_reward * v_reward_strength)::bigint);
    v_variation_bps := public.chromadie_v6_variation_bps(p_r, p_g, p_b, v_id);
    v_awarded := round(v_base_points::numeric * (10000 + v_variation_bps)::numeric / 10000)::bigint;
    v_awarded := greatest(v_band_min, v_awarded);
    IF v_band_max IS NOT NULL THEN v_awarded := least(v_band_max, v_awarded); END IF;

    v_resolved := (v_entry - ARRAY[
      'predicate', 'active', 'exclusiveGroup', 'exclusiveRank',
      'matchCount', 'probability', 'expectedRolls', 'rarity',
      'probabilityReward', 'semanticBonus'
    ]::text[]) || jsonb_build_object(
      'conditionRarity', v_condition_rarity,
      'matchCount', (v_entry->>'matchCount')::bigint,
      'probability', v_probability,
      'expectedRolls', (v_entry->>'expectedRolls')::bigint,
      'probabilityReward', v_probability_reward,
      'semanticBonus', v_semantic_bonus,
      'points', v_base_points,
      'basePoints', v_base_points,
      'awardedPoints', v_awarded,
      'rewardStrength', v_reward_strength,
      'multiplier', 1,
      'variationBps', v_variation_bps
    );
    v_conditions := v_conditions || jsonb_build_array(v_resolved);
    v_contributors := v_contributors || jsonb_build_array(v_resolved);
    v_condition_rarity_map := v_condition_rarity_map || jsonb_build_object(v_id, v_condition_rarity);
    v_base_points_map := v_base_points_map || jsonb_build_object(v_id, v_base_points);
    v_awarded_points_map := v_awarded_points_map || jsonb_build_object(v_id, v_awarded);
    IF v_score > 9223372036854775807 - v_awarded THEN RAISE EXCEPTION 'v6 score exceeds bigint capacity'; END IF;
    v_score := v_score + v_awarded;
  END LOOP;

  SELECT COALESCE(
    jsonb_agg(value ORDER BY (value->>'awardedPoints')::bigint DESC, value->>'id' ASC),
    '[]'::jsonb
  )
  INTO v_sorted_contributors
  FROM jsonb_array_elements(v_contributors) AS contributor(value);

  v_rarity := CASE
    WHEN v_score >= 100000000 THEN 'Anomaly'
    WHEN v_score >= 5000000 THEN 'Legendary'
    WHEN v_score >= 500000 THEN 'Epic'
    WHEN v_score >= 50000 THEN 'Rare'
    WHEN v_score >= 10000 THEN 'Uncommon'
    WHEN v_score >= 2500 THEN 'Common'
    ELSE 'Trash'
  END;

  v_traits := jsonb_build_array(
    jsonb_build_object('id', 'hue_' || lower(v_family), 'label', v_family || ' Hue', 'group', 'hue'),
    jsonb_build_object('id', 'saturation_' || lower(v_saturation_label), 'label', v_saturation_label || ' Saturation', 'group', 'saturation'),
    jsonb_build_object('id', 'lightness_' || lower(v_lightness_label), 'label', v_lightness_label || ' Lightness', 'group', 'lightness'),
    jsonb_build_object('id', 'temperature_' || lower(v_temperature), 'label', v_temperature || ' Temperature', 'group', 'temperature'),
    jsonb_build_object('id', 'structure_' || lower(v_structure), 'label', v_structure || ' Structure', 'group', 'structure')
  );

  RETURN jsonb_build_object(
    'scoreVersion', 6,
    'score_version', 6,
    'red', p_r,
    'green', p_g,
    'blue', p_b,
    'hex', '#' || v_hex,
    'hsl', jsonb_build_object('hue', v_hue, 'saturation', v_saturation, 'lightness', v_lightness),
    'identity', v_lightness_label || ' ' || v_saturation_label || ' ' || v_family,
    'score', v_score,
    'rarity', v_rarity,
    'conditions', v_conditions,
    'conditionIds', v_selected_ids,
    'conditionRarity', v_condition_rarity_map,
    'basePoints', v_base_points_map,
    'awardedPoints', v_awarded_points_map,
    'contributors', v_sorted_contributors,
    'traits', v_traits
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.roll_die_impl_pre_audit(p_is_reroll boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_r integer;
  v_g integer;
  v_b integer;
  v_hex_upper text;
  v_total_score bigint;
  v_rarity text;
  v_score_data jsonb;
  v_condition_ids jsonb := '[]'::jsonb;
  v_contributors jsonb := '[]'::jsonb;
  v_traits jsonb := '[]'::jsonb;
  v_identity text := '';
  v_event_badges jsonb := '[]'::jsonb;
  v_response_badges jsonb := '[]'::jsonb;
  v_user_id uuid := auth.uid();
  v_existing_roll record;
  v_total_count integer;
  v_higher_count integer;
  v_percentile numeric;
  v_last_roll date;
  v_current_streak integer := 1;
  v_new_achievements jsonb := '[]'::jsonb;
  v_achievement_badges jsonb := '[]'::jsonb;
  v_total_rolls bigint;
  v_achievement_ep bigint := 0;
  v_owns_freeze boolean;
  v_shard_count integer;
  v_milestone_granted text := '';
  v_best_roll_score bigint;
  v_cotw_str text;
  v_cotw_r integer;
  v_cotw_g integer;
  v_cotw_b integer;
  v_dist double precision;
  v_cotw_reward_granted boolean := false;
  v_random_bytes bytea;
BEGIN
  IF NOT p_is_reroll THEN
    SELECT * INTO v_existing_roll
    FROM scores
    WHERE user_id = v_user_id AND roll_date = public.game_utc_date();

    IF FOUND THEN
      SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = public.game_utc_date();
      SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = public.game_utc_date() AND score > v_existing_roll.score;
      v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::double precision / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;

      RETURN jsonb_build_object(
        'success', true,
        'already_rolled', true,
        'is_anon', false,
        'hex', v_existing_roll.hex_code,
        'score', v_existing_roll.score,
        'rarity', v_existing_roll.rarity,
        'badges', v_existing_roll.badges,
        'traits', '[]'::jsonb,
        'contributors', '[]'::jsonb,
        'identity', '',
        'percentile', v_percentile,
        'total_rollers', v_total_count,
        'new_achievements', '[]'::jsonb,
        'milestone_granted', ''
      );
    END IF;
  END IF;

  IF p_is_reroll THEN
    SELECT reroll_shards INTO v_shard_count FROM profiles WHERE id = v_user_id;
    IF v_shard_count IS NULL OR v_shard_count <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'No reroll shards available.');
    END IF;

    UPDATE profiles SET reroll_shards = reroll_shards - 1 WHERE id = v_user_id;
    SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = public.game_utc_date();
  END IF;

  SELECT best_roll_score INTO v_best_roll_score
  FROM profiles
  WHERE id = v_user_id;

  v_random_bytes := extensions.gen_random_bytes(3);
  v_r := get_byte(v_random_bytes, 0);
  v_g := get_byte(v_random_bytes, 1);
  v_b := get_byte(v_random_bytes, 2);

  v_hex_upper := upper('#' || lpad(to_hex(v_r), 2, '0') || lpad(to_hex(v_g), 2, '0') || lpad(to_hex(v_b), 2, '0'));

  v_score_data := public.calculate_roll_v6(v_r, v_g, v_b);
  v_total_score := (v_score_data->>'score')::bigint;
  v_rarity := v_score_data->>'rarity';
  v_condition_ids := coalesce(v_score_data->'conditionIds', '[]'::jsonb);
  v_contributors := coalesce(v_score_data->'contributors', '[]'::jsonb);
  v_traits := coalesce(v_score_data->'traits', '[]'::jsonb);
  v_identity := coalesce(v_score_data->>'identity', '');

  IF v_user_id IS NOT NULL AND NOT p_is_reroll AND v_total_score > COALESCE(v_best_roll_score, 0) THEN
    v_achievement_ep := v_achievement_ep + 50000;
    v_event_badges := v_event_badges || jsonb_build_array('beat_your_best');
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT value INTO v_cotw_str FROM meta WHERE key = 'cotw_target';
    IF v_cotw_str IS NOT NULL THEN
      v_cotw_r := split_part(v_cotw_str, ',', 1)::integer;
      v_cotw_g := split_part(v_cotw_str, ',', 2)::integer;
      v_cotw_b := split_part(v_cotw_str, ',', 3)::integer;
      v_dist := sqrt(power(v_r - v_cotw_r, 2) + power(v_g - v_cotw_g, 2) + power(v_b - v_cotw_b, 2));
      IF v_dist <= 50 THEN
        v_event_badges := v_event_badges || jsonb_build_array('cotw_hit');
        INSERT INTO public.user_daily_reward_claims (user_id, reward_date, reward_id)
        VALUES (v_user_id, public.game_utc_date(), 'cotw_hit')
        ON CONFLICT DO NOTHING;
        v_cotw_reward_granted := FOUND;
      END IF;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_rolled', false,
      'is_anon', true,
      'hex', v_hex_upper,
      'r', v_r,
      'g', v_g,
      'b', v_b,
      'score', v_total_score,
      'rarity', v_rarity,
      'badges', v_condition_ids,
      'traits', v_traits,
      'contributors', v_contributors,
      'identity', v_identity,
      'new_achievements', '[]'::jsonb,
      'milestone_granted', ''
    );
  END IF;

  SELECT last_roll_date, current_streak INTO v_last_roll, v_current_streak
  FROM profiles
  WHERE id = v_user_id;

  IF p_is_reroll THEN
    v_current_streak := COALESCE(v_current_streak, 1);
  ELSIF v_last_roll = public.game_utc_date() THEN
    v_current_streak := COALESCE(v_current_streak, 1);
  ELSIF v_last_roll = public.game_utc_date() - 1 THEN
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
  ELSIF v_last_roll = public.game_utc_date() - 2 THEN
    SELECT EXISTS(SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'streak_freeze' LIMIT 1) INTO v_owns_freeze;
    IF v_owns_freeze THEN
      DELETE FROM inventory
      WHERE id IN (SELECT id FROM inventory WHERE user_id = v_user_id AND item_key = 'streak_freeze' LIMIT 1);
      v_current_streak := COALESCE(v_current_streak, 0) + 1;
    ELSE
      v_current_streak := 1;
    END IF;
  ELSE
    v_current_streak := 1;
  END IF;

  IF v_current_streak % 7 = 0 AND NOT p_is_reroll AND v_last_roll IS DISTINCT FROM public.game_utc_date() THEN
    v_achievement_ep := v_achievement_ep + 50000;
    v_event_badges := v_event_badges || jsonb_build_array('streak_bonus_7');
    UPDATE profiles SET reroll_shards = COALESCE(reroll_shards, 0) + 1 WHERE id = v_user_id;
    v_event_badges := v_event_badges || jsonb_build_array('reroll_shard_earned');
  END IF;

  IF v_current_streak = 30 AND NOT EXISTS (SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'frame_30_day') THEN
    INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, 'frame_30_day');
    v_milestone_granted := 'Monthly Grinder Frame';
    v_event_badges := v_event_badges || jsonb_build_array('milestone_30');
  ELSIF v_current_streak = 100 AND NOT EXISTS (SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'frame_100_day') THEN
    INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, 'frame_100_day');
    v_milestone_granted := 'Iron Will Frame';
    v_event_badges := v_event_badges || jsonb_build_array('milestone_100');
  ELSIF v_current_streak = 365 AND NOT EXISTS (SELECT 1 FROM inventory WHERE user_id = v_user_id AND item_key = 'frame_365_day') THEN
    INSERT INTO inventory (user_id, item_key) VALUES (v_user_id, 'frame_365_day');
    v_milestone_granted := 'Annual Frame';
    v_event_badges := v_event_badges || jsonb_build_array('milestone_365');
  END IF;

  SELECT total_rolls + CASE WHEN p_is_reroll THEN 0 ELSE 1 END INTO v_total_rolls
  FROM profiles
  WHERE id = v_user_id;



  SELECT
    COALESCE(sum(a.ep_reward), 0),
    COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'icon', a.icon, 'ep_reward', a.ep_reward) ORDER BY a.ep_reward DESC), '[]'::jsonb),
    COALESCE(jsonb_agg('ach_' || a.id ORDER BY a.ep_reward DESC), '[]'::jsonb)
  INTO v_achievement_ep, v_new_achievements, v_achievement_badges
  FROM achievements a
  JOIN (VALUES
    ('first_roll', true),
    ('roll_10', v_total_rolls >= 10),
    ('roll_50', v_total_rolls >= 50),
    ('roll_100', v_total_rolls >= 100),
    ('roll_365', v_total_rolls >= 365),
    ('streak_7', v_current_streak >= 7),
    ('streak_14', v_current_streak >= 14),
    ('streak_30', v_current_streak >= 30),
    ('streak_100', v_current_streak >= 100),
    ('rarity_rare', v_rarity = 'Rare'),
    ('rarity_epic', v_rarity = 'Epic'),
    ('rarity_anomaly', v_rarity = 'Legendary'),
    ('mythic_roll', v_rarity = 'Anomaly'),
    ('score_50k', v_total_score >= 479000),
    ('score_100k', v_total_score >= 958000),
    ('score_200k', v_total_score >= 1916000),
    ('score_1_5m', v_total_score >= 14370000),
    ('roll_prime', v_condition_ids ? 'prime_sum'),
    ('high_contrast', v_condition_ids ? 'high_contrast'),
    ('low_contrast', v_condition_ids ? 'low_contrast'),
    ('greyscale', v_condition_ids ? 'greyscale'),
    ('web_safe', v_condition_ids ? 'web_safe'),
    ('roll_42_sum', v_condition_ids ? 'sum_42'),
    ('roll_beef', v_condition_ids ? 'beef'),
    ('roll_cafe', v_condition_ids ? 'cafe'),
    ('roll_dead', v_condition_ids ? 'dead'),
    ('roll_face', v_condition_ids ? 'face'),
    ('roll_palindrome', v_condition_ids ? 'palindrome'),
    ('repeated_pair', v_condition_ids ? 'repeated_pair'),
    ('saturation_spike', v_condition_ids ? 'saturation_spike'),
    ('triple_crown', v_condition_ids ? 'triple_crown'),
    ('pastel_soft', v_condition_ids ? 'pastel'),
    ('neon_bright', v_condition_ids ? 'neon'),
    ('roll_black', v_condition_ids ? 'pure_black'),
    ('roll_white', v_condition_ids ? 'pure_white'),
    ('roll_gold', v_condition_ids ? 'pure_gold'),
    ('pure_red', v_condition_ids ? 'pure_red'),
    ('pure_green', v_condition_ids ? 'pure_green'),
    ('pure_blue', v_condition_ids ? 'pure_blue'),
    ('streamer_purple', v_condition_ids ? 'streamer_purple'),
    ('audio_stream_green', v_condition_ids ? 'audio_stream_green'),
    ('classic_cola_red', v_condition_ids ? 'classic_cola_red')
  ) AS t(id, condition_met) ON a.id = t.id AND t.condition_met = true
  LEFT JOIN user_achievements ua ON ua.user_id = v_user_id AND ua.achievement_id = a.id
  WHERE a.season_id IS NULL AND ua.achievement_id IS NULL;

  v_achievement_ep := v_achievement_ep
    + CASE WHEN v_event_badges ? 'beat_your_best' THEN 50000 ELSE 0 END
    + CASE WHEN v_cotw_reward_granted THEN 50000 ELSE 0 END
    + CASE WHEN v_event_badges ? 'streak_bonus_7' THEN 50000 ELSE 0 END;

  INSERT INTO user_achievements (user_id, achievement_id, count)
  SELECT v_user_id, a.id, 1
  FROM achievements a
  JOIN (VALUES
    ('first_roll', true),
    ('roll_10', v_total_rolls >= 10),
    ('roll_50', v_total_rolls >= 50),
    ('roll_100', v_total_rolls >= 100),
    ('roll_365', v_total_rolls >= 365),
    ('streak_7', v_current_streak >= 7),
    ('streak_14', v_current_streak >= 14),
    ('streak_30', v_current_streak >= 30),
    ('streak_100', v_current_streak >= 100),
    ('rarity_rare', v_rarity = 'Rare'),
    ('rarity_epic', v_rarity = 'Epic'),
    ('rarity_anomaly', v_rarity = 'Legendary'),
    ('mythic_roll', v_rarity = 'Anomaly'),
    ('score_50k', v_total_score >= 479000),
    ('score_100k', v_total_score >= 958000),
    ('score_200k', v_total_score >= 1916000),
    ('score_1_5m', v_total_score >= 14370000),
    ('roll_prime', v_condition_ids ? 'prime_sum'),
    ('high_contrast', v_condition_ids ? 'high_contrast'),
    ('low_contrast', v_condition_ids ? 'low_contrast'),
    ('greyscale', v_condition_ids ? 'greyscale'),
    ('web_safe', v_condition_ids ? 'web_safe'),
    ('roll_42_sum', v_condition_ids ? 'sum_42'),
    ('roll_beef', v_condition_ids ? 'beef'),
    ('roll_cafe', v_condition_ids ? 'cafe'),
    ('roll_dead', v_condition_ids ? 'dead'),
    ('roll_face', v_condition_ids ? 'face'),
    ('roll_palindrome', v_condition_ids ? 'palindrome'),
    ('repeated_pair', v_condition_ids ? 'repeated_pair'),
    ('saturation_spike', v_condition_ids ? 'saturation_spike'),
    ('triple_crown', v_condition_ids ? 'triple_crown'),
    ('pastel_soft', v_condition_ids ? 'pastel'),
    ('neon_bright', v_condition_ids ? 'neon'),
    ('roll_black', v_condition_ids ? 'pure_black'),
    ('roll_white', v_condition_ids ? 'pure_white'),
    ('roll_gold', v_condition_ids ? 'pure_gold'),
    ('pure_red', v_condition_ids ? 'pure_red'),
    ('pure_green', v_condition_ids ? 'pure_green'),
    ('pure_blue', v_condition_ids ? 'pure_blue'),
    ('streamer_purple', v_condition_ids ? 'streamer_purple'),
    ('audio_stream_green', v_condition_ids ? 'audio_stream_green'),
    ('classic_cola_red', v_condition_ids ? 'classic_cola_red')
  ) AS t(id, condition_met) ON a.id = t.id AND t.condition_met = true
  WHERE a.season_id IS NULL
  ON CONFLICT (user_id, achievement_id) DO UPDATE
  SET count = CASE
    WHEN NOT p_is_reroll AND user_achievements.achievement_id IN (
      'rarity_rare', 'rarity_epic', 'rarity_anomaly', 'mythic_roll',
      'score_50k', 'score_100k', 'score_200k', 'score_1_5m',
      'roll_prime', 'high_contrast', 'low_contrast', 'greyscale', 'web_safe',
      'roll_42_sum', 'roll_beef', 'roll_cafe', 'roll_dead', 'roll_face',
      'roll_palindrome', 'repeated_pair', 'saturation_spike', 'triple_crown',
      'pastel_soft', 'neon_bright', 'roll_black', 'roll_white', 'roll_gold',
      'pure_red', 'pure_green', 'pure_blue', 'streamer_purple',
      'audio_stream_green', 'classic_cola_red'
    ) THEN user_achievements.count + 1
    ELSE user_achievements.count
  END;

  v_response_badges := v_condition_ids || v_event_badges || v_achievement_badges;

  IF p_is_reroll THEN
    UPDATE profiles
    SET lifetime_ep = GREATEST(COALESCE(ep_spent, 0), COALESCE(lifetime_ep, 0) - COALESCE(v_existing_roll.score, 0) + v_total_score + v_achievement_ep)
    WHERE id = v_user_id;

    UPDATE scores
    SET hex_code = v_hex_upper,
        score = v_total_score,
        rarity = v_rarity,
        badges = '[]'::jsonb,
        score_version = 6
    WHERE user_id = v_user_id AND roll_date = public.game_utc_date();
  ELSE
    BEGIN
      INSERT INTO scores (user_id, hex_code, score, rarity, roll_date, badges, score_version)
      VALUES (v_user_id, v_hex_upper, v_total_score, v_rarity, public.game_utc_date(), '[]'::jsonb, 6);
    EXCEPTION WHEN unique_violation THEN
      SELECT * INTO v_existing_roll FROM scores WHERE user_id = v_user_id AND roll_date = public.game_utc_date();
      RETURN jsonb_build_object(
        'success', true,
        'already_rolled', true,
        'is_anon', false,
        'hex', v_existing_roll.hex_code,
        'score', v_existing_roll.score,
        'rarity', v_existing_roll.rarity,
        'badges', v_existing_roll.badges,
        'traits', '[]'::jsonb,
        'contributors', '[]'::jsonb,
        'identity', '',
        'new_achievements', '[]'::jsonb,
        'milestone_granted', ''
      );
    END;

    UPDATE profiles
    SET lifetime_ep = COALESCE(lifetime_ep, 0) + v_total_score + v_achievement_ep
    WHERE id = v_user_id;
  END IF;

  UPDATE profiles
  SET current_streak = v_current_streak,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), v_current_streak),
      last_roll_date = public.game_utc_date()
  WHERE id = v_user_id;

  IF v_total_score > COALESCE(v_best_roll_score, 0) THEN
    UPDATE profiles
    SET best_roll_score = v_total_score,
        best_roll_hex = v_hex_upper,
        best_roll_rarity = v_rarity
    WHERE id = v_user_id;
  END IF;

  SELECT count(*) INTO v_total_count FROM scores WHERE roll_date = public.game_utc_date();
  SELECT count(*) INTO v_higher_count FROM scores WHERE roll_date = public.game_utc_date() AND score > v_total_score;
  v_percentile := CASE WHEN v_total_count > 0 THEN round(((1.0 - (v_higher_count::double precision / v_total_count)) * 100)::numeric, 2) ELSE 100.0 END;

  RETURN jsonb_build_object(
    'success', true,
    'already_rolled', false,
    'is_anon', false,
    'hex', v_hex_upper,
    'r', v_r,
    'g', v_g,
    'b', v_b,
    'score', v_total_score,
    'rarity', v_rarity,
    'badges', v_response_badges,
    'traits', v_traits,
    'contributors', v_contributors,
    'identity', v_identity,
    'percentile', v_percentile,
    'total_rollers', v_total_count,
    'new_achievements', v_new_achievements,
    'milestone_granted', v_milestone_granted
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.roll_die_impl_progression_base(p_is_reroll boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_total_rolls bigint;
  v_score bigint;
  v_hex text;
  v_rarity text;
  v_reward bigint := 0;
  v_new_roll_achievements jsonb := '[]'::jsonb;
  v_new_roll_badges jsonb := '[]'::jsonb;
  v_new_milestones jsonb := '[]'::jsonb;
  v_achievement record;
  v_inserted boolean;
  v_stored record;
BEGIN
  v_result := public.roll_die_impl_pre_audit(p_is_reroll);

  IF COALESCE((v_result->>'success')::boolean, false) IS NOT TRUE THEN
    RETURN v_result || jsonb_build_object('new_milestones', '[]'::jsonb);
  END IF;

  IF v_user_id IS NULL THEN
    RETURN v_result || jsonb_build_object('new_milestones', '[]'::jsonb);
  END IF;

  IF COALESCE((v_result->>'already_rolled')::boolean, false) THEN
    SELECT s.hex_code, s.score, s.rarity, s.condition_ids, s.contributors,
      s.traits, s.identity
    INTO v_stored
    FROM public.scores s
    WHERE s.user_id = v_user_id AND s.roll_date = public.game_utc_date();

    IF FOUND THEN
      RETURN (v_result || jsonb_build_object(
        'hex', v_stored.hex_code,
        'score', v_stored.score,
        'rarity', v_stored.rarity,
        'badges', v_stored.condition_ids,
        'contributors', v_stored.contributors,
        'traits', v_stored.traits,
        'identity', v_stored.identity
      )) || jsonb_build_object('new_milestones', '[]'::jsonb);
    END IF;
    RETURN v_result || jsonb_build_object('new_milestones', '[]'::jsonb);
  END IF;

  v_score := (v_result->>'score')::bigint;
  v_hex := upper(v_result->>'hex');
  v_rarity := v_result->>'rarity';

  UPDATE public.scores
  SET condition_ids = COALESCE(v_result->'badges', '[]'::jsonb),
      contributors = COALESCE(v_result->'contributors', '[]'::jsonb),
      traits = COALESCE(v_result->'traits', '[]'::jsonb),
      identity = COALESCE(v_result->>'identity', '')
  WHERE user_id = v_user_id AND roll_date = public.game_utc_date();

  IF NOT p_is_reroll THEN
    UPDATE public.profiles
    SET total_rolls = total_rolls + 1
    WHERE id = v_user_id
    RETURNING total_rolls INTO v_total_rolls;
  ELSE
    SELECT total_rolls INTO v_total_rolls
    FROM public.profiles WHERE id = v_user_id;
  END IF;

  FOR v_achievement IN
    SELECT a.id, a.name, a.icon, a.ep_reward
    FROM public.achievements a
    JOIN (VALUES
      ('first_roll'::text, 1::bigint),
      ('roll_10'::text, 10::bigint),
      ('roll_50'::text, 50::bigint),
      ('roll_100'::text, 100::bigint),
      ('roll_365'::text, 365::bigint)
    ) threshold(id, required_rolls) ON threshold.id = a.id
    WHERE v_total_rolls >= threshold.required_rolls
    ORDER BY threshold.required_rolls
  LOOP
    v_inserted := false;
    INSERT INTO public.user_achievements (user_id, achievement_id, count)
    VALUES (v_user_id, v_achievement.id, 1)
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    RETURNING true INTO v_inserted;

    IF COALESCE(v_inserted, false) THEN
      v_reward := v_reward + v_achievement.ep_reward;
      v_new_roll_achievements := v_new_roll_achievements || jsonb_build_array(
        jsonb_build_object(
          'id', v_achievement.id,
          'name', v_achievement.name,
          'icon', v_achievement.icon,
          'ep_reward', v_achievement.ep_reward
        )
      );
      v_new_roll_badges := v_new_roll_badges || jsonb_build_array('ach_' || v_achievement.id);
    END IF;
  END LOOP;

  IF v_reward > 0 THEN
    UPDATE public.profiles
    SET lifetime_ep = COALESCE(lifetime_ep, 0) + v_reward
    WHERE id = v_user_id;
    v_result := jsonb_set(
      v_result,
      '{new_achievements}',
      COALESCE(v_result->'new_achievements', '[]'::jsonb) || v_new_roll_achievements
    );
    v_result := jsonb_set(
      v_result,
      '{badges}',
      COALESCE(v_result->'badges', '[]'::jsonb) || v_new_roll_badges
    );
  END IF;

  v_new_milestones := public.grant_progression_milestones(v_user_id);
  v_result := jsonb_set(v_result, '{new_milestones}', v_new_milestones, true);

  INSERT INTO public.user_roll_best_candidates (user_id, roll_date, score, hex_code, rarity)
  VALUES (v_user_id, public.game_utc_date(), v_score, v_hex, v_rarity)
  ON CONFLICT (user_id, roll_date) DO UPDATE
  SET score = EXCLUDED.score,
      hex_code = EXCLUDED.hex_code,
      rarity = EXCLUDED.rarity,
      updated_at = now();

  DELETE FROM public.user_roll_best_candidates c
  WHERE c.user_id = v_user_id
    AND (c.score, c.roll_date) NOT IN (
      SELECT kept.score, kept.roll_date
      FROM public.user_roll_best_candidates kept
      WHERE kept.user_id = v_user_id
      ORDER BY kept.score DESC, kept.roll_date DESC
      LIMIT 10
    );

  SELECT c.score, c.hex_code, c.rarity
  INTO v_stored
  FROM public.user_roll_best_candidates c
  WHERE c.user_id = v_user_id
  ORDER BY c.score DESC, c.roll_date DESC
  LIMIT 1;

  UPDATE public.profiles
  SET best_roll_score = v_stored.score,
      best_roll_hex = v_stored.hex_code,
      best_roll_rarity = v_stored.rarity
  WHERE id = v_user_id;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.roll_die_impl(p_is_reroll boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.roll_die_impl_progression_base(p_is_reroll);

  RETURN v_result || jsonb_build_object(
    'new_progression_unlocks', COALESCE(v_result->'new_milestones', '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.roll_die(p_is_reroll boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text), 9341);

    PERFORM 1
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Profile not found.');
    END IF;

    IF p_is_reroll AND NOT EXISTS (
      SELECT 1
      FROM public.scores
      WHERE user_id = v_user_id
        AND roll_date = public.game_utc_date()
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'No daily roll is available to reroll.');
    END IF;
  END IF;

  RETURN public.roll_die_impl(p_is_reroll);
END;
$function$;

CREATE OR REPLACE FUNCTION public.purchase_item_impl(p_item_key text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_item_slot text;
  v_stackable boolean;
  v_access_tier text;
  v_catalog_status text;
  item_cost bigint;
  user_ep_spent bigint;
  user_lifetime_ep bigint;
  user_staff_ep bigint;
  user_staff_spent bigint;
  user_balance bigint;
  staff_charge bigint;
  normal_charge bigint;
  v_is_staff boolean;
BEGIN
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT cost, slot, COALESCE(stackable, false), COALESCE(access_tier, 'earned'), COALESCE(catalog_status, 'active')
  INTO item_cost, v_item_slot, v_stackable, v_access_tier, v_catalog_status
  FROM public.shop_items
  WHERE item_key = p_item_key
    AND (available_from IS NULL OR available_from <= public.game_utc_date())
    AND (available_until IS NULL OR available_until >= public.game_utc_date());
  IF item_cost IS NULL THEN RETURN json_build_object('success', false, 'error', 'Invalid item'); END IF;
  IF v_catalog_status <> 'active' THEN
    RETURN json_build_object('success', false, 'error', 'This item is no longer available for purchase.');
  END IF;
  IF v_access_tier = 'premium' THEN
    RETURN json_build_object('success', false, 'error', 'Premium expression is unlocked through an entitlement.');
  END IF;
  IF item_cost <= 0 THEN RETURN json_build_object('success', false, 'error', 'This item cannot be purchased.'); END IF;
  IF v_item_slot = 'consumable' AND p_item_key <> 'reroll_shard' AND NOT v_stackable THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
  END IF;

  SELECT COALESCE(ep_spent, 0), COALESCE(lifetime_ep, 0), COALESCE(staff_test_ep, 0),
    COALESCE(staff_test_ep_spent, 0), COALESCE(is_staff, false)
  INTO user_ep_spent, user_lifetime_ep, user_staff_ep, user_staff_spent, v_is_staff
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Profile not found'); END IF;

  user_balance := user_lifetime_ep - user_ep_spent
    + CASE WHEN v_is_staff THEN user_staff_ep - user_staff_spent ELSE 0 END;
  IF user_balance < item_cost THEN RETURN json_build_object('success', false, 'error', 'Not enough EP'); END IF;

  IF v_item_slot = 'consumable' THEN
    IF p_item_key = 'reroll_shard' THEN
      UPDATE public.profiles SET reroll_shards = COALESCE(reroll_shards, 0) + 1 WHERE id = v_user_id;
    ELSE
      INSERT INTO public.inventory (user_id, item_key, quantity) VALUES (v_user_id, p_item_key, 1)
      ON CONFLICT (user_id, item_key) DO UPDATE SET quantity = public.inventory.quantity + 1;
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.inventory WHERE user_id = v_user_id AND item_key = p_item_key) THEN
      RETURN json_build_object('success', false, 'error', 'Already owned');
    END IF;
    INSERT INTO public.inventory (user_id, item_key, quantity) VALUES (v_user_id, p_item_key, 1);
  END IF;

  staff_charge := CASE WHEN v_is_staff
    THEN LEAST(item_cost, GREATEST(user_staff_ep - user_staff_spent, 0)) ELSE 0 END;
  normal_charge := item_cost - staff_charge;
  UPDATE public.profiles
  SET staff_test_ep_spent = COALESCE(staff_test_ep_spent, 0) + staff_charge,
      ep_spent = COALESCE(ep_spent, 0) + normal_charge
  WHERE id = v_user_id;
  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.purchase_item(p_item_key text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    PERFORM 1
    FROM profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Profile not found');
    END IF;

    RETURN public.purchase_item_impl(p_item_key);
END;
$function$;

CREATE OR REPLACE FUNCTION public.equip_item(p_item_key text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid(); v_current_cosmetics jsonb; v_slot text;
  v_access_tier text; v_entitlement_key text; v_catalog_status text;
BEGIN
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Profile not found'); END IF;
  SELECT slot, COALESCE(access_tier, 'earned'), entitlement_key, COALESCE(catalog_status, 'active')
    INTO v_slot, v_access_tier, v_entitlement_key, v_catalog_status
    FROM public.shop_items WHERE item_key = p_item_key;
  IF v_slot IS NULL OR v_slot NOT IN ('name_font', 'name_material', 'name_motion', 'profile_border', 'title', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
  END IF;
  IF v_catalog_status <> 'active' THEN RETURN json_build_object('success', false, 'error', 'This item is no longer available.'); END IF;
  IF v_access_tier = 'premium' THEN
    IF v_entitlement_key IS NULL OR NOT EXISTS (SELECT 1 FROM public.profile_entitlements WHERE user_id = v_user_id AND entitlement_key = v_entitlement_key) THEN
      RETURN json_build_object('success', false, 'error', 'Premium expression requires an entitlement');
    END IF;
  ELSIF v_access_tier <> 'free' AND NOT EXISTS (SELECT 1 FROM public.inventory WHERE user_id = v_user_id AND item_key = p_item_key) THEN
    RETURN json_build_object('success', false, 'error', 'Item not owned');
  END IF;
  SELECT COALESCE(equipped_cosmetics, '{}'::jsonb) INTO v_current_cosmetics FROM public.profiles WHERE id = v_user_id;
  v_current_cosmetics := v_current_cosmetics || jsonb_build_object(v_slot, p_item_key);
  UPDATE public.profiles SET equipped_cosmetics = v_current_cosmetics WHERE id = v_user_id;
  RETURN json_build_object('success', true, 'cosmetics', v_current_cosmetics);
END;
$function$;

CREATE OR REPLACE FUNCTION public.grant_progression_milestones(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lifetime_ep bigint;
  v_total_rolls bigint;
  v_longest_streak integer;
  v_milestone record;
  v_inserted_id text;
  v_new jsonb := '[]'::jsonb;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RETURN v_new;
  END IF;

  SELECT lifetime_ep, total_rolls, longest_streak
  INTO v_lifetime_ep, v_total_rolls, v_longest_streak
  FROM public.profiles
  WHERE id = p_user_id;

  FOR v_milestone IN
    SELECT
      m.id, m.name, m.description, m.threshold, m.track, m.metric,
      m.achievement_id, m.sort_order, m.progress_source, m.progress_target,
      m.published, m.expected_rolls, m.pace_band, m.presentation_role,
      i.item_key, i.name AS reward_name, i.slot
    FROM public.progression_milestones AS m
    JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
    WHERE m.published
      AND i.catalog_status = 'active'
      AND CASE m.progress_source
        WHEN 'lifetime_ep' THEN COALESCE(v_lifetime_ep, 0) >= m.progress_target
        WHEN 'total_rolls' THEN COALESCE(v_total_rolls, 0) >= m.progress_target
        WHEN 'longest_streak' THEN COALESCE(v_longest_streak, 0) >= m.progress_target
        WHEN 'achievement' THEN EXISTS (
          SELECT 1
          FROM public.user_achievements AS ua
          WHERE ua.user_id = p_user_id
            AND ua.achievement_id = m.achievement_id
        )
        ELSE false
      END
    ORDER BY m.track, m.sort_order, m.id
  LOOP
    v_inserted_id := NULL;

    INSERT INTO public.user_progression_milestones (user_id, milestone_id, unlock_source)
    VALUES (p_user_id, v_milestone.id, 'live')
    ON CONFLICT (user_id, milestone_id) DO NOTHING
    RETURNING milestone_id INTO v_inserted_id;

    INSERT INTO public.inventory (user_id, item_key, quantity)
    VALUES (p_user_id, v_milestone.item_key, 1)
    ON CONFLICT (user_id, item_key) DO UPDATE
      SET quantity = GREATEST(public.inventory.quantity, 1);

    IF v_inserted_id IS NOT NULL THEN
      v_new := v_new || jsonb_build_array(jsonb_build_object(
        'id', v_milestone.id,
        'name', v_milestone.name,
        'description', v_milestone.description,
        'threshold', v_milestone.threshold,
        'track', v_milestone.track,
        'metric', v_milestone.metric,
        'achievement_id', v_milestone.achievement_id,
        'sort_order', v_milestone.sort_order,
        'progress_source', v_milestone.progress_source,
        'progress_target', v_milestone.progress_target,
        'published', v_milestone.published,
        'expected_rolls', v_milestone.expected_rolls,
        'pace_band', v_milestone.pace_band,
        'presentation_role', v_milestone.presentation_role,
        'unlock_source', 'live',
        'reward', jsonb_build_object(
          'item_key', v_milestone.item_key,
          'name', v_milestone.reward_name,
          'slot', v_milestone.slot
        )
      ));
    END IF;
  END LOOP;

  RETURN v_new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_progression()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_lifetime_ep bigint;
  v_total_rolls bigint;
  v_current_streak integer;
  v_longest_streak integer;
  v_week_start date := date_trunc('week', public.game_utc_date())::date;
  v_today date := public.game_utc_date();
  v_cotw text;
  v_cotw_hex text;
  v_weekly_complete boolean := false;
  v_ritual_published boolean := false;
  v_discovery_published boolean := false;
  v_journey_state text := 'empty';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT lifetime_ep, total_rolls, current_streak, longest_streak
  INTO v_lifetime_ep, v_total_rolls, v_current_streak, v_longest_streak
  FROM public.profiles
  WHERE id = v_user_id;

  SELECT value INTO v_cotw FROM public.meta WHERE key = 'cotw_target';
  IF v_cotw ~ '^([0-9]{1,3}),([0-9]{1,3}),([0-9]{1,3})$' THEN
    v_cotw_hex := upper(
      '#' || lpad(to_hex(split_part(v_cotw, ',', 1)::integer), 2, '0')
      || lpad(to_hex(split_part(v_cotw, ',', 2)::integer), 2, '0')
      || lpad(to_hex(split_part(v_cotw, ',', 3)::integer), 2, '0')
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.scores AS s
    WHERE s.user_id = v_user_id
      AND s.roll_date BETWEEN v_week_start AND v_today
      AND COALESCE(s.condition_ids, '[]'::jsonb) ? 'cotw_hit'
  ) INTO v_weekly_complete;

  SELECT EXISTS (
    SELECT 1 FROM public.progression_milestones AS m
    WHERE m.track = 'ritual' AND m.published
  ) INTO v_ritual_published;

  SELECT EXISTS (
    SELECT 1 FROM public.progression_milestones AS m
    WHERE m.track = 'discovery'
      AND m.published
      AND m.presentation_role <> 'hidden_discovery'
  ) INTO v_discovery_published;

  v_journey_state := CASE
    WHEN v_ritual_published AND v_discovery_published THEN 'ready'
    WHEN v_ritual_published OR v_discovery_published THEN 'partial'
    ELSE 'empty'
  END;

  RETURN jsonb_build_object(
    'success', true,
    'progression_version', 4,
    'journey_state', v_journey_state,
    'current_ep', COALESCE(v_lifetime_ep, 0),
    'total_rolls', COALESCE(v_total_rolls, 0),
    'current_streak', COALESCE(v_current_streak, 0),
    'longest_streak', COALESCE(v_longest_streak, 0),
    'milestones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'description', m.description,
        'threshold', m.threshold,
        'track', m.track,
        'metric', m.metric,
        'achievement_id', m.achievement_id,
        'sort_order', m.sort_order,
        'progress_source', m.progress_source,
        'progress_target', m.progress_target,
        'published', m.published,
        'expected_rolls', m.expected_rolls,
        'pace_band', m.pace_band,
        'presentation_role', m.presentation_role,
        'unlocked_at', u.unlocked_at,
        'unlock_source', u.unlock_source,
        'presented_at', u.presented_at,
        'acknowledged_at', u.acknowledged_at,
        'unlocked', (u.milestone_id IS NOT NULL),
        'new', (u.unlock_source = 'live' AND u.acknowledged_at IS NULL),
        'progress', CASE m.progress_source
          WHEN 'lifetime_ep' THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_lifetime_ep, 0), m.progress_target),
            'target', m.progress_target,
            'unit', 'EP'
          )
          WHEN 'total_rolls' THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_total_rolls, 0), m.progress_target),
            'target', m.progress_target,
            'unit', 'rolls'
          )
          WHEN 'longest_streak' THEN jsonb_build_object(
            'current', LEAST(COALESCE(v_longest_streak, 0), m.progress_target),
            'target', m.progress_target,
            'unit', 'days'
          )
          ELSE NULL
        END,
        'reward', jsonb_build_object(
          'item_key', i.item_key,
          'name', i.name,
          'slot', i.slot
        )
      ) ORDER BY m.track, m.sort_order, m.id)
      FROM public.progression_milestones AS m
      JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
      LEFT JOIN public.user_progression_milestones AS u
        ON u.user_id = v_user_id AND u.milestone_id = m.id
      WHERE m.published
        AND i.catalog_status = 'active'
        AND (m.presentation_role <> 'hidden_discovery' OR u.milestone_id IS NOT NULL)
    ), '[]'::jsonb),
    'recent_unlocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'name', recent.name,
        'description', recent.description,
        'threshold', recent.threshold,
        'track', recent.track,
        'metric', recent.metric,
        'achievement_id', recent.achievement_id,
        'sort_order', recent.sort_order,
        'progress_source', recent.progress_source,
        'progress_target', recent.progress_target,
        'published', recent.published,
        'expected_rolls', recent.expected_rolls,
        'pace_band', recent.pace_band,
        'presentation_role', recent.presentation_role,
        'unlocked_at', recent.unlocked_at,
        'unlock_source', recent.unlock_source,
        'presented_at', recent.presented_at,
        'acknowledged_at', recent.acknowledged_at,
        'unlocked', true,
        'reward', jsonb_build_object(
          'item_key', recent.item_key,
          'name', recent.reward_name,
          'slot', recent.slot
        )
      ) ORDER BY recent.unlocked_at DESC, recent.track, recent.sort_order, recent.id)
      FROM (
        SELECT m.id, m.name, m.description, m.threshold, m.track, m.metric,
          m.achievement_id, m.sort_order, m.progress_source, m.progress_target,
          m.published, m.expected_rolls, m.pace_band, m.presentation_role,
          u.unlocked_at, u.unlock_source, u.presented_at, u.acknowledged_at,
          i.item_key, i.name AS reward_name, i.slot
        FROM public.user_progression_milestones AS u
        JOIN public.progression_milestones AS m ON m.id = u.milestone_id
        JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
        WHERE u.user_id = v_user_id
          AND i.catalog_status = 'active'
        ORDER BY u.unlocked_at DESC, m.track, m.sort_order, m.id
        LIMIT 8
      ) AS recent
    ), '[]'::jsonb),
    'pending_unlocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pending.id,
        'name', pending.name,
        'description', pending.description,
        'track', pending.track,
        'sort_order', pending.sort_order,
        'presentation_role', pending.presentation_role,
        'unlocked_at', pending.unlocked_at,
        'unlock_source', pending.unlock_source,
        'reward', jsonb_build_object(
          'item_key', pending.item_key,
          'name', pending.reward_name,
          'slot', pending.slot
        )
      ) ORDER BY pending.unlocked_at ASC, pending.track, pending.sort_order, pending.id)
      FROM (
        SELECT m.id, m.name, m.description, m.track, m.sort_order,
          m.presentation_role, u.unlocked_at, u.unlock_source, i.item_key,
          i.name AS reward_name, i.slot
        FROM public.user_progression_milestones AS u
        JOIN public.progression_milestones AS m ON m.id = u.milestone_id
        JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
        WHERE u.user_id = v_user_id
          AND m.published
          AND u.unlock_source = 'live'
          AND u.acknowledged_at IS NULL
          AND i.catalog_status = 'active'
        ORDER BY u.unlocked_at ASC, m.track, m.sort_order, m.id
        LIMIT 8
      ) AS pending
    ), '[]'::jsonb),
    'weekly_focus', jsonb_build_object(
      'week_start', v_week_start,
      'target_hex', v_cotw_hex,
      'completed', v_weekly_complete,
      'bonus_ep', 50000
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_shop_catalog()
 RETURNS SETOF shop_items
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.shop_items
  WHERE catalog_status = 'active'
    AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion')
  ORDER BY item_key;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_alias(p_alias text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_alias text := lower(btrim(coalesce(p_alias, '')));
  v_result jsonb;
BEGIN
  IF v_alias !~ '^[a-z0-9_]{1,20}$' THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'alias', a.alias_key,
    'username', p.username
  )
  INTO v_result
  FROM public.profile_aliases a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.alias_key = v_alias;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_configuration(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_record public.profile_configurations%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_config jsonb;
  v_default jsonb;
  v_rich_access boolean := false;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = p_user_id;
  v_config := COALESCE(v_record.published_config, public.profile_default_configuration(v_profile.mood_color));
  v_default := public.profile_default_configuration(v_profile.mood_color);
  v_rich_access := public.profile_rich_media_access(p_user_id);
  IF COALESCE(v_config->>'templateKey', '') = 'atelier' AND NOT v_rich_access THEN
    v_config := v_config || jsonb_build_object(
      'templateKey', 'signal',
      'layoutVariant', v_default->'layoutVariant',
      'modules', v_default->'modules'
    );
  END IF;
  RETURN v_config || public.profile_media_expression_projection(
    v_record,
    COALESCE(v_profile.is_staff, false),
    v_rich_access,
    true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_configuration_v2(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_record public.profile_configurations%ROWTYPE;
  v_expression jsonb;
  v_profile public.profiles%ROWTYPE;
  v_rich_access boolean := false;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = p_user_id;
  v_rich_access := public.profile_rich_media_access(p_user_id);
  v_expression := public.profile_media_expression_projection(v_record, COALESCE(v_profile.is_staff, false), v_rich_access, true);
  RETURN jsonb_build_object(
    'success', true,
    'version', 2,
    'draft', NULL,
    'published', public.profile_configuration_v2_with_expression(
      COALESCE(v_record.published_config_v2, public.profile_configuration_v2_from_v1(COALESCE(v_record.published_config, public.profile_default_configuration(v_profile.mood_color)))),
      v_expression
    ),
    'updated_at', v_record.updated_at,
    'published_at', v_record.published_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_identity(p_username text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.public_profile_identity_projection(p.id)
  FROM public.profiles p
  WHERE btrim(p_username) ~ '^[A-Za-z0-9_]{1,20}$'
    AND p.username_key = lower(btrim(p_username))
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_identity_by_id(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.public_profile_identity_projection(p_user_id);
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_scores(p_user_id uuid)
 RETURNS TABLE(hex_code text, score bigint, rarity text, roll_date date, badges jsonb, condition_ids jsonb, contributors jsonb, traits jsonb, identity text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.hex_code, s.score, s.rarity, s.roll_date, s.condition_ids,
    s.condition_ids, s.contributors, s.traits, s.identity
  FROM public.scores s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.user_id = p_user_id
    AND s.roll_date >= public.game_utc_date() - 30
    AND (auth.uid() = p_user_id OR COALESCE((SELECT s2.activity_visible FROM public.profile_social_settings s2 WHERE s2.user_id = p_user_id), true))
  ORDER BY s.roll_date DESC
  LIMIT 31;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_story(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH visibility AS (
  SELECT (auth.uid() = p_user_id OR COALESCE((SELECT s2.activity_visible FROM public.profile_social_settings s2 WHERE s2.user_id = p_user_id), true)) AS allowed
),
timeline_rows AS (
  SELECT e.id, e.event_type, e.occurred_at, e.payload
  FROM public.profile_events AS e, visibility AS v
  WHERE e.user_id = p_user_id AND v.allowed
  ORDER BY e.occurred_at DESC, e.id DESC
  LIMIT 40
),
timeline AS (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'eventType', event_type,
      'occurredAt', occurred_at,
      'payload', payload
    ) ORDER BY occurred_at DESC, id DESC
  ), '[]'::jsonb) AS items
  FROM timeline_rows
),
collection_rows AS (
  SELECT condition_value AS condition_id, count(*) AS roll_count,
    min(s.roll_date) AS first_seen, max(s.roll_date) AS last_seen
  FROM public.scores AS s
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(s.condition_ids) = 'array' THEN s.condition_ids ELSE '[]'::jsonb END
  ) AS condition_values(condition_value)
  CROSS JOIN visibility AS v
  WHERE s.user_id = p_user_id AND v.allowed
  GROUP BY condition_value
  ORDER BY roll_count DESC, last_seen DESC, condition_id
  LIMIT 30
),
collection AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.condition_id,
    'name', COALESCE(a.name, c.condition_id),
    'icon', COALESCE(a.icon, '✦'),
    'rarity', COALESCE(a.rarity, 'Common'),
    'count', c.roll_count,
    'firstSeen', c.first_seen,
    'lastSeen', c.last_seen
  ) ORDER BY c.roll_count DESC, c.last_seen DESC, c.condition_id), '[]'::jsonb) AS items
  FROM collection_rows AS c
  LEFT JOIN public.achievements AS a ON a.id = c.condition_id
),
progression_rows AS (
  SELECT u.milestone_id, u.unlocked_at
  FROM public.user_progression_milestones AS u, visibility AS v
  WHERE u.user_id = p_user_id AND v.allowed
),
progression_proof AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'name', m.name,
    'description', m.description,
    'track', m.track,
    'unlockedAt', u.unlocked_at,
    'reward', jsonb_build_object('name', i.name, 'slot', i.slot)
  ) ORDER BY u.unlocked_at DESC, m.id ASC), '[]'::jsonb) AS items
  FROM (
    SELECT milestone_id, unlocked_at
    FROM progression_rows
    ORDER BY unlocked_at DESC, milestone_id ASC
    LIMIT 2
  ) AS u
  JOIN public.progression_milestones AS m ON m.id = u.milestone_id
  JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
  WHERE m.published AND i.catalog_status = 'active'
),
progression_summary AS (
  SELECT count(*)::integer AS completed_count
  FROM progression_rows AS u
  JOIN public.progression_milestones AS m ON m.id = u.milestone_id
  JOIN public.shop_items AS i ON i.item_key = m.reward_item_key
  WHERE m.published AND i.catalog_status = 'active'
)
SELECT jsonb_build_object(
  'timeline', timeline.items,
  'collection', collection.items,
  'progression_proof', jsonb_build_object(
    'completed_count', progression_summary.completed_count,
    'recent_unlocks', progression_proof.items
  )
)
FROM public.profiles AS p, timeline, collection, progression_proof, progression_summary
WHERE p.id = p_user_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_social(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.get_public_profile_social(p_user_id, 'newest');
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_social(p_user_id uuid, p_sort text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_viewer_id uuid := auth.uid();
  v_settings public.profile_social_settings;
  v_blocked boolean := false;
  v_guestbook jsonb;
  v_summary_visible boolean;
  v_views_visible boolean;
  v_sort text := CASE lower(btrim(coalesce(p_sort, '')))
    WHEN 'popular' THEN 'popular'
    WHEN 'oldest' THEN 'oldest'
    ELSE 'newest'
  END;
  v_public_views integer := 0;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT * INTO v_settings
  FROM public.profile_social_settings
  WHERE user_id = p_user_id;

  v_summary_visible := COALESCE(v_settings.social_summary_visible, true);
  v_views_visible := COALESCE(v_settings.profile_views_visible, true);

  IF v_viewer_id IS NOT NULL AND v_viewer_id <> p_user_id THEN
    v_blocked := public.is_profile_blocked(v_viewer_id, p_user_id);
  END IF;

  IF v_views_visible THEN
    SELECT COALESCE(sum(view_count), 0)::integer INTO v_public_views
    FROM public.profile_view_daily
    WHERE profile_id = p_user_id;
  END IF;

  IF v_blocked THEN
    RETURN jsonb_build_object(
      'success', true,
      'blocked', true,
      'interactionsEnabled', false,
      'guestbookEnabled', false,
      'activityVisible', false,
      'socialSummaryVisible', false,
      'profileViewsVisible', false,
      'publicViewCount', 0,
      'favoriteCount', 0,
      'reactionCounts', jsonb_build_object('spark', 0, 'glow', 0, 'cheer', 0),
      'viewerFavorited', false,
      'viewerReactions', '[]'::jsonb,
      'guestbook', '[]'::jsonb
    );
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'entryKey', e.entry_key,
      'author', author.username,
      'body', e.body,
      'createdAt', e.created_at,
      'canDelete', v_viewer_id IS NOT NULL
        AND (e.author_id = v_viewer_id OR p_user_id = v_viewer_id),
      'isPinned', e.is_pinned,
      'likeCount', CASE WHEN v_summary_visible THEN e.like_count ELSE 0 END,
      'viewerLiked', v_viewer_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profile_guestbook_likes l
        WHERE l.liker_id = v_viewer_id AND l.entry_key = e.entry_key
      ),
      'replies', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'replyKey', r.reply_key,
          'author', reply_author.username,
          'body', r.body,
          'createdAt', r.created_at,
          'canDelete', v_viewer_id IS NOT NULL
            AND (r.author_id = v_viewer_id OR p_user_id = v_viewer_id)
        ) ORDER BY r.created_at ASC, r.reply_key ASC)
        FROM (
          SELECT r.*
          FROM public.profile_guestbook_replies r
          WHERE r.entry_key = e.entry_key
            AND r.status = 'visible'
            AND NOT public.is_profile_blocked(r.author_id, p_user_id)
          ORDER BY r.created_at ASC, r.reply_key ASC
          LIMIT 5
        ) r
        JOIN public.profiles reply_author ON reply_author.id = r.author_id
      ), '[]'::jsonb)
    )
    ORDER BY e.is_pinned DESC,
      CASE WHEN v_sort = 'popular' THEN e.like_count ELSE 0 END DESC,
      CASE WHEN v_sort = 'oldest' THEN e.created_at ELSE NULL END ASC,
      CASE WHEN v_sort <> 'oldest' THEN e.created_at ELSE NULL END DESC,
      e.entry_key DESC
  ), '[]'::jsonb)
  INTO v_guestbook
  FROM (
    SELECT
      e.*,
      EXISTS (
        SELECT 1 FROM public.profile_guestbook_pins pin
        WHERE pin.profile_id = p_user_id AND pin.entry_key = e.entry_key
      ) AS is_pinned,
      (SELECT count(*)::integer FROM public.profile_guestbook_likes l WHERE l.entry_key = e.entry_key) AS like_count
    FROM public.profile_guestbook_entries e
    WHERE e.profile_id = p_user_id
      AND e.status = 'visible'
      AND NOT public.is_profile_blocked(e.author_id, p_user_id)
    ORDER BY
      CASE WHEN EXISTS (
        SELECT 1 FROM public.profile_guestbook_pins pin
        WHERE pin.profile_id = p_user_id AND pin.entry_key = e.entry_key
      ) THEN 1 ELSE 0 END DESC,
      CASE WHEN v_sort = 'popular' THEN (
        SELECT count(*) FROM public.profile_guestbook_likes l WHERE l.entry_key = e.entry_key
      ) ELSE 0 END DESC,
      CASE WHEN v_sort = 'oldest' THEN e.created_at ELSE NULL END ASC,
      CASE WHEN v_sort <> 'oldest' THEN e.created_at ELSE NULL END DESC,
      e.entry_key DESC
    LIMIT 20
  ) e
  JOIN public.profiles author ON author.id = e.author_id;

  RETURN jsonb_build_object(
    'success', true,
    'blocked', false,
    'interactionsEnabled', COALESCE(v_settings.interactions_enabled, true),
    'guestbookEnabled', COALESCE(v_settings.guestbook_enabled, true),
    'activityVisible', COALESCE(v_settings.activity_visible, true),
    'socialSummaryVisible', v_summary_visible,
    'profileViewsVisible', v_views_visible,
    'publicViewCount', v_public_views,
    'favoriteCount', CASE WHEN v_summary_visible THEN (
      SELECT count(*)::integer FROM public.profile_favorites f WHERE f.profile_id = p_user_id
    ) ELSE 0 END,
    'reactionCounts', CASE WHEN v_summary_visible THEN jsonb_build_object(
      'spark', (SELECT count(*)::integer FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'spark'),
      'glow', (SELECT count(*)::integer FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'glow'),
      'cheer', (SELECT count(*)::integer FROM public.profile_reactions r WHERE r.profile_id = p_user_id AND r.reaction_type = 'cheer')
    ) ELSE jsonb_build_object('spark', 0, 'glow', 0, 'cheer', 0) END,
    'viewerFavorited', v_viewer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profile_favorites f
      WHERE f.favoriter_id = v_viewer_id AND f.profile_id = p_user_id
    ),
    'viewerReactions', COALESCE((
      SELECT jsonb_agg(r.reaction_type ORDER BY r.reaction_type)
      FROM public.profile_reactions r
      WHERE r.reactor_id = v_viewer_id AND r.profile_id = p_user_id
    ), '[]'::jsonb),
    'guestbook', v_guestbook
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_sitemap_page(p_after text DEFAULT NULL::text, p_limit integer DEFAULT 1000)
 RETURNS TABLE(username text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_after_key text := NULLIF(lower(btrim(COALESCE(p_after, ''))), '');
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 1000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Sitemap page size must be between 1 and 1000.';
  END IF;

  RETURN QUERY
  SELECT p.username
  FROM public.profiles p
  WHERE p.lifetime_ep > 0
    AND COALESCE((
      SELECT settings.discoverable
      FROM public.profile_social_settings settings
      WHERE settings.user_id = p.id
    ), true)
    AND (v_after_key IS NULL OR p.username_key > v_after_key)
  ORDER BY p.username_key ASC
  LIMIT p_limit;
END;
$function$;
-- Privileges are asserted explicitly so a fresh reset does not inherit an
-- accidental grant from a historical definition.
REVOKE ALL ON FUNCTION public.calculate_roll_v6(integer, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roll_die_impl_pre_audit(boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roll_die_impl_progression_base(boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roll_die_impl(boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roll_die(boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.roll_die(boolean) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.purchase_item_impl(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.purchase_item(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purchase_item(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.equip_item(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.equip_item(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.grant_progression_milestones(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_progression() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_progression() TO authenticated;
REVOKE ALL ON FUNCTION public.get_shop_catalog() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_shop_catalog() TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_profile_alias(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_alias(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_configuration(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_configuration(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_profile_configuration_v2(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_configuration_v2(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_identity(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_identity(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_identity_by_id(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_identity_by_id(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_scores(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_scores(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_profile_story(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_story(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_social(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_social(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_profile_social(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_social(uuid, text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_profile_sitemap_page(text, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_sitemap_page(text, integer) TO anon;

COMMIT;
