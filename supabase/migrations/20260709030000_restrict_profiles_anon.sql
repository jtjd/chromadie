REVOKE SELECT ON TABLE "public"."profiles" FROM "anon";

GRANT SELECT ("id", "username", "current_streak", "longest_streak", "ep_spent", "lifetime_ep", "equipped_cosmetics", "reroll_shards", "equipped_badges", "mood_color", "best_roll_score", "best_roll_hex", "best_roll_rarity")
ON TABLE "public"."profiles" TO "anon";

