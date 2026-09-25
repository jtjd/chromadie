<script>
  import { createEventDispatcher } from 'svelte';

  /**
   * @typedef {{ id: string, fromUsername: string | null, loading: true, error: string | null, score?: undefined, hex?: undefined }} LoadingChallengeData
   * @typedef {{ id: string, fromUsername: string | null, loading: false, error: string, score?: undefined, hex?: undefined }} UnavailableChallengeData
   * @typedef {{ id: string, fromUsername: string | null, loading: false, error: null, score: number, hex: string }} ReadyChallengeData
   * @typedef {LoadingChallengeData | UnavailableChallengeData | ReadyChallengeData} ChallengeData
   */
  /** @type {ChallengeData} */
  export let challengeData;
  const dispatch = createEventDispatcher();
</script>

<section class="challenge-banner" aria-label="Challenge prompt">
  <div class="challenge-copy">
    <p class="challenge-kicker">Challenge</p>
    <h2>
      {#if challengeData.loading}
        Opening challenge
      {:else if challengeData.error}
        Challenge unavailable
      {:else}
        Beat this roll
      {/if}
    </h2>
    {#if challengeData.fromUsername && !challengeData.loading}
      <p class="challenge-source">From {challengeData.fromUsername}</p>
    {/if}
    <p class="challenge-text">
      {#if challengeData.loading}
        Checking the shared link.
      {:else if challengeData.error}
        This link may have expired or been removed.
      {:else if challengeData.fromUsername}
        Beat the target score with your next daily roll.
      {:else}
        Beat the target score with your next daily roll.
      {/if}
    </p>
  </div>
  <div class="challenge-meta">
    {#if challengeData.loading}
      <div class="challenge-stat challenge-stat-loading">
        <div>
          <p class="challenge-score">Loading</p>
          <p class="challenge-subtext">Challenge link</p>
        </div>
      </div>
    {:else if challengeData.error}
      <div class="challenge-stat challenge-stat-error">
        <div>
          <p class="challenge-score">Unavailable</p>
          <p class="challenge-subtext">Try a newer link</p>
        </div>
      </div>
    {:else if challengeData.score !== undefined && challengeData.hex}
      <div class="challenge-stat" aria-label={`Target score ${challengeData.score.toLocaleString()} points`}>
        <span class="challenge-color" style="background-color: {challengeData.hex};"></span>
        <div>
          <p class="challenge-score">{challengeData.score.toLocaleString()} pts</p>
          <p class="challenge-subtext">Target score</p>
        </div>
      </div>
    {:else}
      <div class="challenge-stat challenge-stat-error">
        <div>
          <p class="challenge-score">Unavailable</p>
          <p class="challenge-subtext">Try a newer link</p>
        </div>
      </div>
    {/if}
    <button
      type="button"
      class="challenge-close"
      aria-label="Dismiss challenge"
      on:click={() => dispatch('dismiss')}
    >
      Close
    </button>
  </div>
</section>

<style>
  .challenge-banner {
    width: min(1160px, calc(100% - 48px));
    margin: 0 auto 12px;
    padding: 1rem 1.1rem;
    background: rgba(10, 10, 12, .58);
    border: 1px solid rgba(255, 255, 255, .1);
    border-radius: 18px;
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .16);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .challenge-copy {
    display: grid;
    gap: 0.35rem;
    min-width: 0;
  }
  .challenge-kicker {
    margin: 0;
    color: var(--white, #ffffff);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 0.68rem;
    font-weight: 700;
  }
  .challenge-banner h2 {
    margin: 0;
    font-family: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
    font-size: 1.05rem;
    color: #fff;
  }
  .challenge-source {
    margin: 0;
    color: #fff;
    font-size: 0.84rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    opacity: 0.95;
  }
  .challenge-text {
    margin: 0;
    color: var(--text-muted);
    line-height: 1.5;
    font-size: 0.92rem;
  }
  .challenge-meta {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .challenge-stat {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.7rem 0.85rem;
    border-radius: 9px;
    background: rgba(0,0,0,0.18);
    border: 1px solid rgba(255,255,255,0.07);
  }
  .challenge-stat-loading,
  .challenge-stat-error {
    min-width: 220px;
    justify-content: flex-start;
  }
  .challenge-color {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.22);
    box-shadow: 0 0 0 1px rgba(0,0,0,0.12) inset;
    flex-shrink: 0;
  }
  .challenge-score {
    margin: 0;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
    font-weight: 700;
    color: #fff;
    font-size: 1rem;
    line-height: 1.1;
  }
  .challenge-subtext {
    margin: 0.15rem 0 0;
    color: var(--text-muted);
    font-size: 0.75rem;
  }
  .challenge-close {
    min-height: 42px;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 9px;
    background: transparent;
    color: #f8f8f8;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0 18px;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
  }
  .challenge-close:hover {
    background: color-mix(in srgb, var(--white, #ffffff) 9%, transparent);
    border-color: var(--border, rgba(255, 255, 255, .09));
    transform: translateY(-1px);
  }

  @media (max-width: 600px) {
    .challenge-banner {
      flex-direction: column;
      align-items: stretch;
      width: calc(100% - 1rem);
      padding: 0.9rem;
      margin: 0 auto 12px;
      gap: 0.85rem;
    }
    .challenge-meta {
      justify-content: stretch;
    }
    .challenge-stat,
    .challenge-stat-loading,
    .challenge-stat-error {
      width: 100%;
      justify-content: flex-start;
    }
    .challenge-close {
      width: 100%;
    }
  }
</style>
