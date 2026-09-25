# Target Experience

## Authenticated Profile Destination

Authenticated players use their own profile as the product destination, not a
separate game dashboard. The public `/` homepage owns the daily Roll and points
players toward their profile and public discovery as part of the result flow.

The profile contains:

1. Identity hero.
2. Today's static roll result and progression state, with a clear path back to `/`.
3. Today's result and visible profile consequences.
4. Pinned accomplishments or collections.
5. Personal links or creator content.
6. Timeline and recent activity.
7. Social interactions and discovery entry points.
8. Editing controls visible only to the owner.

## Public Profile

A public profile must work as a standalone shareable destination.

Visitors should quickly understand:

- Who this person is.
- Their visual identity and signature color.
- What they have accomplished.
- What they rolled recently.
- What content or social links they want to share.
- How to explore Chromadie or create their own profile.

The visitor experience must not display owner-only controls or require authentication to appreciate the page.

## Homepage Roll Sequence

The homepage owns the complete interactive daily-roll experience. The profile
remains the player's identity destination and shows the resulting color, score,
progression, history, and profile consequences without embedding a second game
application.

Recommended sequence:

1. The profile or navigation signals that today's roll is available.
2. The player rolls from `/`.
3. The homepage Roll composition owns request, reveal, result, and reroll UI.
4. The canonical server result updates account and profile state.
5. The result becomes the dominant color moment.
6. Rewards, rarity, conditions, and collection consequences appear progressively.
7. The profile presents the updated result as part of the player's story.
8. The player receives clear next actions: equip, pin, customize, compare, or explore.

The animation should feel substantial but remain fast, skippable after initiation where safe, and reduced under reduced-motion preferences.

## Profile Modes

The same profile shell supports:

- Owner mode.
- Public visitor mode.
- Guest/local mode.
- Edit mode.
- Preview mode.
- Private or unavailable mode.

Avoid separate divergent implementations.

## Discovery

Keep roll leaderboards, but reinterpret them as discovery surfaces.

Each entry should be visually identifiable and link directly to the profile.

Initial discovery surfaces:

- Today's strongest rolls.
- Recent exceptional rolls.
- Rising profiles.
- New profiles.
- Random profile.
- Profiles near the player's rank.

Do not launch subjective “most beautiful” rankings until there is a fair, abuse-resistant signal.

## Social Scope for Initial Release

Begin with low-risk interactions:

- Follow or favorite profile.
- Lightweight positive reactions.
- Owner-controlled guestbook with reporting and deletion.
- Optional visitor visibility.
- Share action.
- Compare selected public collections.

Avoid private messaging at this stage.
