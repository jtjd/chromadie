# Homepage presentation and direct copy

## Objective

Support the playable roll hero with concrete reasons to create and customize
a profile. The user approved the section restructure and requested plain
language without forced branding such as “your story” or “journey.”

## Plan and scope

1. Keep the authoritative playable hero and its account behavior.
2. Move the existing real profile example immediately below the hero.
3. Replace repeated explanations with canonical collection and achievement
   examples, explicitly labeled as examples rather than player unlocks.
4. Present up to three profiles from the existing bounded public feed, with
   honest source labeling, loading/error/retry/empty states, and safe links.
5. Add account-aware signup/customize actions and keyboard-accessible FAQs.
6. Reduce supporting heading sizes and verify desktop/mobile compositions.

## Compatibility

No migrations, new RPCs, scoring changes, grants, profile hydration requests,
or auth changes. The existing curated Tjz appearance remains intact. Public
profile cards use only the current public projection; they are discovery
summaries, not fabricated reproductions of players’ saved layouts. The old
explanation components remain unmounted for compatibility with historical
reference checks. The user's approved sequence supersedes the lower-section
order in ROLL_FIRST_PLAYABLE_HOMEPAGE.md.

## Acceptance

- Hero remains playable and the primary interaction.
- Active homepage copy uses specific product actions and benefits.
- No example-profile visit CTA, decorative arrow glyphs, tiny section labels,
  or redundant “Open profile” text on clickable discovery cards.
- Profile example, collection/rewards, public profiles, start, and FAQ render
  in that order below the hero.
- Signup is not shown during account hydration or account errors.
- No overflow at 1440, 768, 390, and 320px; keyboard and reduced motion work.
- Full mandatory checks and relevant browser regressions pass.

## Rationale

The research reviewed with the user supports concrete examples, clear action
labels, and concise copy. Sources: [NN/G homepage design principles](https://www.nngroup.com/articles/homepage-design-principles/)
and [web writing research](https://www.nngroup.com/articles/how-users-read-on-the-web/).
Chess.com, Linktree, Carrd, and Are.na supplied examples of content structure,
not binding visual references or claimed conversion lifts.
