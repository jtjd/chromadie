# Product Acceptance Criteria

## Profile Quality

- A default free profile looks intentional and shareable.
- A visitor understands identity, today's state, accomplishments, and links within seconds.
- Profiles can differ meaningfully without arbitrary code.
- The page remains recognizably Chromadie.

## Roll Integration

- The primary roll occurs within the profile.
- The roll result is canonical and server-authoritative.
- The profile visibly updates after the roll.
- The flow communicates rewards and story consequences.
- Refreshing or racing requests cannot create extra scoring rolls.

## Discovery

- Roll leaderboard entries are profile discovery cards, not anonymous score rows.
- Public profile navigation is immediate.
- Private or unavailable profiles are handled safely.
- Discovery does not reveal internal identifiers.

## Social

- Owners control interaction permissions.
- Blocks and reports are enforced.
- Writes are authenticated and rate limited.
- Guestbook content is safely rendered.
- Social features are useful without private messaging.

## Monetization

- Free users can access beautiful layouts and meaningful customization.
- Premium provides additional expression rather than stronger rolls or fake prestige.
- Earned status is visually distinguishable from paid decoration.
- Paid media/effects do not degrade visitors' accessibility or performance.

## Technical

- Existing authentication and account deletion still work.
- Existing scoring, rewards, shop ownership, and achievements are preserved.
- Public routes, metadata, CSP, and direct refresh still work.
- Desktop and mobile are supported.
- Reduced motion is supported.
- Required test and validation commands pass.
