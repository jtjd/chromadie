# Chromadie Progression Research

**Date:** 2026-08-20

**Scope:** Progression Core System research; no code or schema changes.

## Decision summary

Retain the three dimensions: **Rank** records accumulated mastery, **Ritual**
records returning and sustaining the daily roll, and **Discovery** records the
player's stochastic color story. Together they serve the profile-first product
direction without introducing a second game economy. Rank should remain the
only broad aggregate progression measure; Ritual should make one daily roll a
complete success; Discovery should remain a parallel set of unfound
opportunities rather than a sequence of locked goals.

The research supports earned, server-published proof and owner-selected public
expression. It does not support XP/currency layers, seasonal pressure, paid
prestige, popularity leaderboards, or a badge wall.

## Sources and mechanisms

| Source (publication/current-page date) | Mechanism observed | Chromadie implication |
| --- | --- | --- |
| [Duolingo, “Improving the Streak”](https://blog.duolingo.com/improving-the-streak/) (official, 2020); [streak habit research](https://blog.duolingo.com/how-duolingo-streak-builds-habit/) (official, 2022); [milestone design](https://blog.duolingo.com/streak-milestone-design-animation/) (official, 2022); [achievement redesign](https://blog.duolingo.com/achievement-badges/) (official, 2023) | One small daily action, early streak milestones, flexible recovery, and celebrations improved return behavior in Duolingo's experiments. Achievement surfaces worked better when they were discoverable, concrete, and varied by difficulty. | Make one roll enough for daily success; preserve a longest record after a miss; celebrate meaningful milestones without guilt, XP, leagues, or reminder spam. |
| [guns.lol badges](https://help.guns.lol/how-to-guides/profile-badges), [profile views](https://help.guns.lol/how-to-guides/profile-views), and [changelog](https://help.guns.lol/changelog) (official, current; March/May 2026 entries); [haunt.gg badges](https://help.haunt.gg/customization/badges), [products](https://help.haunt.gg/overview/products), and [changelog](https://help.haunt.gg/overview/changelog) (official, current through August 2026) | Public profiles are identity canvases with badge collections, ordering/hiding, previews, and customization. Many visible statuses are nevertheless paid, view/like/comment-based, or tied to external communities. | Adopt profile-first presentation, selective proof, owner controls, and previews. Reject paid/verified prestige, social-count progression, external Discord status, arbitrary custom badges, and noisy animation/badge walls. |
| [Steam Trading Cards FAQ](https://steamcommunity.com/tradingcards/faq/Steam), [Steam Badges FAQ](https://steamcommunity.com/tradingcards/faq/Badges), and [Steamworks achievements](https://partner.steamgames.com/doc/features/achievements?l=english) (official, current as of 2026-08-20) | Persistent achievements and badges feed profile showcases and levels; rarity can be informational; achievement state is persistent and server-authoritative. | Keep one meaningful Rank, a small selected proof surface, and immutable server-owned milestones. Reject trading, duplicate-card grind, booster randomness, and currencies. |
| [GitHub profile reference](https://docs.github.com/en/account-and-profile/reference/profile-reference) and [personal profile](https://docs.github.com/en/account-and-profile/concepts/personal-profile) (official, current); [GitHub achievement study](https://arxiv.org/abs/2303.14702) (2023); [Discord Profile Badges 101](https://support.discord.com/hc/en-us/articles/360035962891-Profile-Badges-101) and [Custom Profiles](https://support.discord.com/hc/en-us/articles/4403147417623-Custom-Profiles) (official, current) | Contextual achievements, pinned items, collections, non-transferable badges, previews, and privacy controls make identity legible. An exploratory GitHub study found ambiguous badges were unreliable quality signals. | Use concise labels, dates/context, non-transferable earned proof, and hide/pin controls. Do not equate badge quantity or opaque lore with player quality. |
| [PlayStation trophies](https://www.playstation.com/en-au/support/games/how-to-earn-trophies-on-playstation--consoles/) (official, current); [Nintendo Missions and Rewards](https://www.nintendo.com/us/whatsnew/missions-and-rewards-available-with-nintendo-switch-online/) (official, 2025) | Players pin a small number of objective trophies; rarity is contextual. Core behavior can earn composable profile-icon elements. | Connect discoveries to profile expression and show bounded rarity context. Reject rotating weekly FOMO, points economies, and global vanity leaderboards. |
| [“On or Off Track: How (Broken) Streaks Affect Consumer Decisions”](https://doi.org/10.1093/jcr/ucac029) (Silverman/Barasch, online 2022; JCR 2023); [Goal-Gradient Hypothesis](https://doi.org/10.1509/jmkr.43.1.39) (Kivetz/Urminsky/Zheng, 2006) | Intact streaks can motivate subsequent behavior, while repair reduces the harm of a break. Effort accelerates near a concrete, credible goal. | Keep current streak as context and longest streak as durable identity; show exact, real progress and never manufacture a “nearly there” or predicted random discovery. |

## Adopt / reject

| Adopt | Reject |
| --- | --- |
| One-roll daily success and short, meaningful milestone celebrations. | XP, currencies, battle-pass/seasonal pressure, or daily quotas beyond the roll. |
| Server-authoritative earned rewards that are renderer-backed and zero-cost. | Paid badges, paid prestige, trading economies, or rewards that make free profiles inferior. |
| Owner-selected public proof: current Rank, a few accomplishments, and recent rare color history. | Complete public achievement walls, popularity/view/like/comment leaderboards, and social farming. |
| Parallel Discovery goals with approximate odds and explicit “unfound” state. | Sequential random goals, false guarantees, progress bars for stochastic events, or opaque rarity claims. |
| Longest-streak preservation, recovery/soft landing, privacy controls, reduced motion, and mobile/keyboard support. | Permanent punishment after one missed day, notification spam, or color-only status cues. |

## Three-track evaluation

### Rank — retain

EP-backed Rank is a useful single summary of long-term mastery if it stays tied
to the player's color history rather than becoming generic XP. Keep its
thresholds and rewards sparse, server-derived, and profile-relevant. Public
presentation should be subtle and should not become a leaderboard.

### Ritual — retain and clarify

Use `current_streak` for today's context, `longest_streak` for durable
milestones, and `total_rolls` for accumulated history. Streak milestones and
roll-count milestones communicate different stories and should not be presented
as duplicate bars. If a milestone is sourced from total rolls, wording such as
“730 colors remembered” is safer than “two years” unless one-roll-per-day is
guaranteed for the complete record. A break may reset current continuity, but
must not erase longest streak, total rolls, discoveries, or rewards.

### Discovery — retain as parallel stochastic identity

Keep all eligible unfound conditions available; one roll may satisfy several,
and a later condition may be found before an earlier one. Exact combinatorial
references include a six-digit hex palindrome at 1 in 4,096 and greyscale at 1
in 65,536. Score/rarity expectations are model-dependent estimates, so expose
“about 1 in N rolls” only as orientation and never as a promise or “next”
target. Keep Discovery rewards sparse and let the collection story live inside
this track rather than adding a fourth lane.

## Direct implementation implications

- **Roll result:** show the relevant streak/history change, one deterministic
  milestone if reached, and a rare Discovery/unlock when applicable; do not
  render a progression wall after every roll.
- **Progression destination:** retain three lanes. Show concrete next targets
  for Rank/Ritual; show Discovery as parallel unfound conditions with concise
  explanations and non-guaranteed odds.
- **Public profile:** expose only bounded, owner-controlled proof—current Rank,
  one or two selected milestones, and/or a recent rare color. Keep the full
  ledger owner-only.
- **Rewards and authority:** publish only active renderer-backed earned items;
  grant and reconcile them server-side, idempotently, while preserving existing
  inventory/equipped state. Premium remains expression, not gameplay prestige.
- **Quality bar:** scale celebration by significance; support reduced motion,
  keyboard/mobile layouts, privacy, and non-color-only rarity cues. Record only
  server-confirmed progression events in aggregate analytics.
