# Homepage Live Directory

The public homepage now follows the approved live-directory composition. It
keeps the current header, places a real public-roll ticker below it, pairs
direct product copy and username claiming with an uneven profile collage, and
links into discovery and the leaderboard.

Preview identity, backgrounds, avatars, links, badges, cosmetics, music state,
roll data, rarity, EP, rank, and timestamps come from the existing public
profile/discovery contracts. Fictional homepage profiles and invented activity
are not rendered. Public staff accounts are preferred; when no valid showcase
account resolves, the homepage shows an honest empty state.

Validation captures:

- [1920 × 1080 homepage](../artifacts/homepage-game-prototype/homepage-1920x1080.png)
- [1440 × 900 homepage](../artifacts/homepage-game-prototype/homepage-desktop-1440x900.png)
- [1280 × 720 homepage](../artifacts/homepage-game-prototype/homepage-compact-1280x720.png)
- [390 × 844 homepage](../artifacts/homepage-game-prototype/homepage-mobile-390x844.png)
- [1440 × 900 directory](../artifacts/homepage-game-prototype/directory-1440x900.png)
- [390 × 844 directory](../artifacts/homepage-game-prototype/directory-mobile-390x844.png)

Audio and Spotify are deferred on preview surfaces; the normal public profile
renderer is unchanged. `npm run check:performance` continues to report the
repository’s transitional total JavaScript and CSS budget overage (704.75 kB /
700 kB JavaScript; 380.55 kB / 380 kB CSS); the other required checks pass.
