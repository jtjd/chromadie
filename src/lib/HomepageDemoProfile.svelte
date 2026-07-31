<script>
  import { createEventDispatcher } from 'svelte';

  export let profile;
  const dispatch = createEventDispatcher();

  function backHome() {
    dispatch('navigate', { view: 'home' });
  }
</script>

<main class="demo-page" style={`--demo-bg: ${profile.background}; --demo-avatar: ${profile.avatar}; --demo-accent: ${profile.accent}; --demo-color: ${profile.color};`}>
  <div class="demo-page__atmosphere" aria-hidden="true"></div>
  <section class="demo-page__card border-prism-anim" aria-labelledby="demo-profile-name">
    <div class="demo-page__identity">
      <span class="demo-page__avatar" aria-hidden="true"><b>{profile.username.slice(0, 1).toUpperCase()}</b></span>
      <div>
        <strong id="demo-profile-name" class="demo-page__name name-spectrum-anim" data-text={profile.username}>{profile.username}</strong>
        <p>{profile.bio}</p>
      </div>
    </div>
    <div class="demo-page__links">
      {#each profile.links as link (link)}
        <a href="#demo-link" on:click|preventDefault><span aria-hidden="true">↗</span>{link}</a>
      {/each}
    </div>
    <div class="demo-page__rank"><span>current rank</span><strong>{profile.rank}</strong><span>on today’s leaderboard</span></div>
    <div class="demo-page__roll">
      <span class="demo-page__roll-orb orb-shape-diamond roll-sparkles-anim" style={`background-color: ${profile.color};`} aria-hidden="true"></span>
      <div><p>today's roll</p><strong>{profile.color}</strong><small>strong roll · {profile.effect}</small></div>
    </div>
    <button class="demo-page__back" type="button" on:click={backHome}>← Back to examples</button>
  </section>
</main>

<style>
  .demo-page { position: relative; display: grid; min-height: calc(100dvh - 5rem); place-items: center; overflow: hidden; padding: 3rem 1.25rem; isolation: isolate; background: #05060a; color: var(--color-ink-strong); }
  .demo-page__atmosphere { position: absolute; inset: 0; z-index: -1; background: var(--demo-bg); opacity: .72; filter: saturate(1.05); }
  .demo-page__atmosphere::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 44%, color-mix(in srgb, var(--demo-accent), transparent 78%), transparent 45%), linear-gradient(180deg, rgba(2,3,8,.18), rgba(2,3,8,.82)); }
  .demo-page__card { width: min(100%, 52rem); padding: clamp(1.5rem, 5vw, 3rem); border-radius: 1.2rem; background: rgba(7,8,15,.78); box-shadow: 0 2rem 6rem rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08); }
  .demo-page__identity { display: flex; align-items: center; gap: 1.2rem; }
  .demo-page__avatar { display: grid; place-items: center; flex: 0 0 6.5rem; width: 6.5rem; height: 6.5rem; border: 1px solid color-mix(in srgb, var(--demo-accent), white 8%); border-radius: 1.25rem; background: var(--demo-avatar); box-shadow: 0 0 2.4rem color-mix(in srgb, var(--demo-accent), transparent 70%); }
  .demo-page__avatar b { color: white; font: 700 2.4rem/1 var(--font-display-stack); text-shadow: 0 0 1rem color-mix(in srgb, var(--demo-accent), white 30%); }
  .demo-page__name { display: block; font: 700 clamp(2.2rem, 6vw, 4.2rem)/.9 var(--font-display-stack); letter-spacing: -.06em; }
  .demo-page__identity p { margin: .6rem 0 0; color: rgba(245,247,255,.72); font-size: 1rem; }
  .demo-page__links { display: flex; flex-wrap: wrap; gap: .55rem; margin-top: 1.5rem; }
  .demo-page__links a { display: inline-flex; gap: .35rem; align-items: center; padding: .5rem .7rem; border: 1px solid rgba(255,255,255,.22); border-radius: var(--radius-pill); color: rgba(245,247,255,.85); font: 500 .7rem/1 var(--font-mono-stack); text-decoration: none; }
  .demo-page__links a:hover { border-color: var(--demo-accent); color: white; }
  .demo-page__rank { display: flex; align-items: center; gap: .65rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,.16); color: rgba(245,247,255,.6); font: 500 .68rem/1 var(--font-mono-stack); }
  .demo-page__rank strong { color: var(--demo-accent); font: 700 1.6rem/1 var(--font-display-stack); }
  .demo-page__rank span:last-child { margin-left: auto; }
  .demo-page__roll { display: flex; align-items: center; gap: 1rem; margin-top: 1.5rem; padding: 1rem; border: 1px solid color-mix(in srgb, var(--demo-accent), transparent 60%); border-radius: .9rem; background: rgba(5,7,12,.42); }
  .demo-page__roll-orb { position: relative; display: block; width: 4.5rem; height: 4.5rem; flex: 0 0 4.5rem; filter: drop-shadow(0 0 1.2rem color-mix(in srgb, var(--demo-color), transparent 35%)); }
  .demo-page__roll p { margin: 0; color: var(--demo-accent); font: 700 .62rem/1 var(--font-mono-stack); letter-spacing: .13em; text-transform: uppercase; }
  .demo-page__roll strong { display: block; margin-top: .35rem; color: white; font: 700 1.5rem/1 var(--font-display-stack); }
  .demo-page__roll small { display: block; margin-top: .4rem; color: rgba(245,247,255,.55); font: 500 .65rem/1 var(--font-mono-stack); }
  .demo-page__back { margin-top: 1.5rem; padding: .6rem 0; border: 0; background: transparent; color: rgba(245,247,255,.62); font: 600 .78rem/1 var(--font-body-stack); cursor: pointer; }
  .demo-page__back:hover { color: white; }
  @media (max-width: 36rem) { .demo-page { min-height: calc(100dvh - 4rem); padding: 1rem; } .demo-page__identity { align-items: flex-start; flex-direction: column; } .demo-page__avatar { flex-basis: 5rem; width: 5rem; height: 5rem; } .demo-page__rank span:last-child { max-width: 7rem; text-align: right; line-height: 1.3; } }
</style>
