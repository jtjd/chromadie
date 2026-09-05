<script>
  import { loadOwnerAchievementRecord } from './achievementData.js';
  import { isPinnableAchievement, resolveAchievementProgress } from './achievementProgress.js';
  import { addToast, equippedBadges, profile } from './stores.js';
  import { supabase } from './supabase.js';
  import { onMount } from 'svelte';

  export let userId = '';
  export let progression = {};
  export let accountProfile = {};

  let definitions = [];
  let unlocked = {};
  let loading = true;
  let error = '';
  let filter = 'all';
  let saving = false;
  let requestId = 0;

  $: pinnedIds = ($profile?.equipped_badges || accountProfile?.equipped_badges || [])
    .filter(isPinnableAchievement);
  $: visibleDefinitions = definitions.filter(achievement => {
    const isUnlocked = Boolean(unlocked[achievement.id]);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    if (filter === 'pinned') return pinnedIds.includes(achievement.id);
    return true;
  });
  $: unlockedCount = definitions.filter(achievement => unlocked[achievement.id]).length;
  onMount(() => loadRecord());

  async function loadRecord() {
    const currentRequest = ++requestId;
    loading = true;
    error = '';
    const result = await loadOwnerAchievementRecord(supabase, userId);
    if (currentRequest !== requestId) return;
    definitions = result.definitions;
    unlocked = result.unlocked;
    error = result.error ? 'Your achievement library could not be loaded.' : '';
    loading = false;
  }

  async function togglePinned(id) {
    if (saving || !unlocked[id] || !isPinnableAchievement(id)) return;
    const next = pinnedIds.includes(id)
      ? pinnedIds.filter(value => value !== id)
      : [...pinnedIds, id];
    if (next.length > 3) {
      addToast('You can only pin 3 achievements.', 'error');
      return;
    }

    saving = true;
    const { data, error: saveError } = await supabase.rpc('equip_badges', { p_badge_ids: next });
    saving = false;
    if (saveError || data?.success === false) {
      addToast(data?.error || 'Pinned achievements could not be updated.', 'error');
      return;
    }
    const badges = Array.isArray(data?.badges) ? data.badges : next;
    equippedBadges.set(badges);
    profile.update(value => value ? { ...value, equipped_badges: badges } : value);
    addToast('Pinned achievements updated.', 'success');
  }

  function progressFor(id) {
    return resolveAchievementProgress(id, {
      totalRolls: progression?.totalRolls ?? accountProfile?.total_rolls,
      longestStreak: progression?.longestStreak ?? accountProfile?.longest_streak,
      bestScore: accountProfile?.best_roll_score
    });
  }
</script>

<section class="record-panel" aria-labelledby="achievement-record-title">
  <header class="record-panel__header">
    <div>
      <p>Profile proof</p>
      <h2 id="achievement-record-title">Achievements</h2>
      <span>{unlockedCount} of {definitions.length} unlocked · {pinnedIds.length} of 3 pinned</span>
    </div>
    <div class="record-filters" aria-label="Filter achievements">
      {#each [['all', 'All'], ['unlocked', 'Unlocked'], ['locked', 'Locked'], ['pinned', 'Pinned']] as option (option[0])}
        <button type="button" class:active={filter === option[0]} on:click={() => filter = option[0]}>{option[1]}</button>
      {/each}
    </div>
  </header>

  {#if loading}
    <div class="record-state" role="status">Loading your achievement library…</div>
  {:else if error}
    <div class="record-state" role="alert">{error} <button type="button" on:click={loadRecord}>Retry</button></div>
  {:else if visibleDefinitions.length === 0}
    <div class="record-state">No achievements match this filter.</div>
  {:else}
    <div class="achievement-grid">
      {#each visibleDefinitions as achievement (achievement.id)}
        {@const isUnlocked = Boolean(unlocked[achievement.id])}
        {@const progress = isUnlocked ? null : progressFor(achievement.id)}
        {@const isPinned = pinnedIds.includes(achievement.id)}
        <article class:locked={!isUnlocked} class:pinned={isPinned}>
          <div class="achievement-icon" aria-hidden="true">{isUnlocked ? achievement.icon || '✦' : '◇'}</div>
          <div class="achievement-copy">
            <div class="achievement-meta"><span>{achievement.rarity || 'Achievement'}</span>{#if unlocked[achievement.id]?.count > 1}<span>×{unlocked[achievement.id].count}</span>{/if}</div>
            <h3>{achievement.name || achievement.id}</h3>
            <p>{achievement.description || (isUnlocked ? 'Unlocked for your profile.' : 'Keep rolling to reveal this achievement.')}</p>
            {#if progress}
              <div class="achievement-progress" aria-label={`${Math.min(progress.current, progress.target).toLocaleString()} of ${progress.target.toLocaleString()}`}>
                <span style={`width:${Math.min(100, (progress.current / progress.target) * 100)}%`}></span>
              </div>
              <small>{Math.min(progress.current, progress.target).toLocaleString()} / {progress.target.toLocaleString()}</small>
            {/if}
          </div>
          {#if isUnlocked && isPinnableAchievement(achievement.id)}
            <button class="pin-button" type="button" disabled={saving} aria-pressed={isPinned} on:click={() => togglePinned(achievement.id)}>{isPinned ? 'Pinned' : 'Pin'}</button>
          {:else if achievement.id === 'launch_edition'}
            <span class="fixed-badge">Profile mark</span>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .record-panel{display:grid;gap:1.25rem}.record-panel__header{display:flex;align-items:end;justify-content:space-between;gap:1rem;padding-bottom:1rem;border-bottom:1px solid var(--color-line-subtle)}
  .record-panel__header p,.record-panel__header span{margin:0;color:var(--color-ink-muted);font-size:.72rem}.record-panel__header p{text-transform:uppercase;letter-spacing:.13em}.record-panel__header h2{margin:.35rem 0 .25rem;font:700 clamp(1.7rem,4vw,2.5rem)/1 var(--font-display-stack)}
  .record-filters{display:flex;flex-wrap:wrap;gap:.35rem}.record-filters button,.record-state button{min-height:2.25rem;padding:.45rem .7rem;border:1px solid var(--color-line-subtle);border-radius:999px;background:transparent;color:var(--color-ink-muted);font:600 .72rem/1 var(--font-body-stack);cursor:pointer}.record-filters button.active{border-color:var(--progression-accent-vivid);color:var(--color-ink-strong);background:color-mix(in srgb,var(--progression-accent-vivid) 14%,transparent)}
  .achievement-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}.achievement-grid article{position:relative;display:grid;grid-template-columns:3rem minmax(0,1fr) auto;gap:.9rem;min-height:8rem;padding:1rem;border:1px solid var(--color-line-subtle);border-radius:1rem;background:var(--surface,#161619)}.achievement-grid article.locked{opacity:.67}.achievement-grid article.pinned{border-color:color-mix(in srgb,var(--progression-accent-vivid) 65%,var(--color-line-subtle))}
  .achievement-icon{display:grid;place-items:center;width:3rem;height:3rem;border-radius:.8rem;background:color-mix(in srgb,var(--progression-accent-vivid) 12%,var(--surface-strong,#202024));font-size:1.45rem}.achievement-copy{min-width:0}.achievement-meta{display:flex;gap:.5rem;color:var(--color-ink-muted);font-size:.62rem;letter-spacing:.09em;text-transform:uppercase}.achievement-copy h3{margin:.35rem 0;color:var(--color-ink-strong);font-size:.95rem}.achievement-copy p{margin:0;color:var(--color-ink-muted);font-size:.75rem;line-height:1.45}.achievement-copy small{display:block;margin-top:.35rem;color:var(--color-ink-muted);font-size:.65rem}
  .achievement-progress{height:4px;margin-top:.7rem;overflow:hidden;border-radius:999px;background:var(--surface-strong,#25252a)}.achievement-progress span{display:block;height:100%;background:var(--progression-accent-vivid)}.pin-button{align-self:start;min-height:2rem;padding:.35rem .6rem;border:1px solid var(--color-line-subtle);border-radius:.55rem;background:transparent;color:var(--color-ink-strong);font:600 .68rem/1 var(--font-body-stack);cursor:pointer}.pin-button[aria-pressed="true"]{background:var(--progression-accent-vivid);color:var(--progression-accent-ink);border-color:transparent}.fixed-badge{color:var(--color-ink-muted);font-size:.65rem}.record-state{padding:2rem;border:1px solid var(--color-line-subtle);border-radius:1rem;color:var(--color-ink-muted);text-align:center}
  button:focus-visible{outline:2px solid var(--color-ink-strong);outline-offset:2px}@media(max-width:760px){.record-panel__header{align-items:flex-start;flex-direction:column}.achievement-grid{grid-template-columns:1fr}}@media(max-width:430px){.achievement-grid article{grid-template-columns:2.5rem minmax(0,1fr)}.achievement-icon{width:2.5rem;height:2.5rem}.pin-button,.fixed-badge{grid-column:2}}
</style>
