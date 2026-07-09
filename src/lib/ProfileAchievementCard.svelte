<script>
  export let ach;
  export let isUnlocked = false;
  export let achCount = 0;
  export let isSelected = false;
  export let isOwnProfile = false;
  export let progress = null;
  export let onToggle = () => {};
  export let formatCount = (n) => String(n);
</script>

<button
  type="button"
  class="achievement-box {isUnlocked ? 'unlocked' : 'locked'}"
  class:selected={isSelected}
  disabled={!isOwnProfile || !isUnlocked}
  aria-pressed={isSelected}
  style="border-color: {isSelected ? 'var(--accent-purple)' : ''};"
  on:click={() => onToggle(ach.id)}
>
  <div class="ach-icon">
    {isUnlocked ? ach.icon : '🔒'}
    {#if isUnlocked && achCount > 1}
      <span class="mastery-count">x{formatCount(achCount)}</span>
    {/if}
  </div>

  <div class="ach-info">
    <div class="ach-name">{ach.name}</div>
    <div class="ach-desc">{ach.description}</div>

    {#if !isUnlocked && progress}
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: {Math.min(100, (progress.current / progress.target) * 100)}%"></div>
      </div>
      <div class="progress-text">{progress.current.toLocaleString()} / {progress.target.toLocaleString()}</div>
    {/if}
  </div>
</button>
