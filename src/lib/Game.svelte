<script>
  import { supabase } from './supabase';
  import { session, fetchWalletBalance, rerollShards, profile } from './stores';
  import { sleep, getTodayString } from './utils';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { getRollEffect } from './cosmetics';

  const dispatch = createEventDispatcher();

  let phase = 'preroll';
  let loading = false;
  let error = null;

  let displayHex = '#000000';
  let displayColor = '#222';
  let lockedDigits = 0;

  let score = 0;
  let rarity = '';
  let badges = [];
  let displayScore = 0;
  let scanProgress = 0;

  // Percentile State
  let percentileDisplay = null;

  // Share & Countdown State
  let copied = false;
  let countdownString = '24:00:00';
  let countdownInterval;

  // Reactive arrays to separate standard badges from achievements
  $: rollBadges = badges.filter(b => !b.is_achievement);
  $: earnedAchievements = badges.filter(b => b.is_achievement);

  // FIX: Fetch roll effect from profile cosmetics
  $: cosmetics = $profile?.equipped_cosmetics || {};
  $: rollEff = getRollEffect(cosmetics);

  function getPercentileTier(p, total) {
      let text = '';
      let color = '#8a8a9a';

      if (total <= 1) return { text: "🏆 First roll of the day!", color: "#f1c40f", total };
      let rank = 100 - p;

      if (rank <= 1) { text = "🔥 Top 1% today"; color = "#f1c40f"; }
      else if (rank <= 5) { text = "⭐ Top 5% today"; color = "#ffeb3b"; }
      else if (rank <= 10) { text = "🚀 Top 10% today"; color = "#10b981"; }
      else if (rank <= 25) { text = "👍 Top 25% today"; color = "#6ee787"; }
      else if (rank <= 50) { text = "📊 Above average today"; color = "#e0e0e0"; }
      else if (rank <= 75) { text = "⚪ Around average today"; color = "#8a8a9a"; }
      else if (rank <= 90) { text = "⚠️ Bottom 25% today"; color = "#ff9800"; }
      else if (rank <= 95) { text = "🔻 Bottom 10% today"; color = "#ef4444"; }
      else { text = "💀 Bottom 5% today"; color = "#b91c1c"; }

      return { text, color, total };
  }

  function sortBadgesDescending(arr) {
      return (arr || []).slice().sort((a, b) => b.points - a.points);
  }

  function getTomorrowMidnightUTC() {
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  }

  function tickCountdown() {
      const diff = getTomorrowMidnightUTC() - new Date();
      if (diff <= 0) {
          clearInterval(countdownInterval);
          phase = 'preroll';
          badges = [];
          displayScore = 0;
          scanProgress = 0;
          percentileDisplay = null;
          return;
      }
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      countdownString = `${h}:${m}:${s}`;
  }

  async function shareResults() {
      let badgeText = rollBadges.length > 0 ? rollBadges.map(b => b.name).join(', ') : 'None';
      let achText = earnedAchievements.length > 0 ? earnedAchievements.map(b => b.name).join(', ') : 'None';
      let shareString = `🎲 ChromaDie Daily Roll\nHex: ${displayColor}\nScore: ${score.toLocaleString()} pts\nRarity: ${rarity}\nConditions: ${badgeText}\nAchievements: ${achText}\n\nCan you beat my color? Roll yours here: ${window.location.origin}`;

      try {
          await navigator.clipboard.writeText(shareString);
          copied = true;
          setTimeout(() => copied = false, 2000);
      } catch (e) {
          console.error("Clipboard copy failed", e);
      }
  }

  async function initiateRoll(isReroll = false) {
    loading = true;
    error = null;
    phase = 'rolling';
    lockedDigits = 0;
    badges = [];
    displayScore = 0;
    scanProgress = 0;
    percentileDisplay = null;

    const { data, error: rpcError } = await supabase.rpc('roll_die', { p_is_reroll: isReroll });

    if (rpcError || !data || !data.success) {
      error = rpcError?.message || "An error occurred while rolling. Please try again.";
      phase = 'preroll';
      loading = false;
      return;
    }

    let scrambleInterval = setInterval(() => {
      displayColor = `rgb(${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)})`;
      let scramble = '#';
      for(let i=1; i<7; i++) scramble += Math.floor(Math.random()*16).toString(16).toUpperCase();
      displayHex = scramble;
    }, 60);

    await sleep(2000);
    clearInterval(scrambleInterval);
    displayColor = '#222';

    const hexChars = data.hex.split('');
    for (let i = 0; i < 7; i++) {
      lockedDigits = i;
      let currentText = hexChars.map((c, idx) => idx <= i ? c : '-').join('');
      displayHex = currentText;
      await sleep(500);
    }

    await sleep(400);
    displayColor = data.hex;

    const sortedBadgesForAnim = (data.badges || []).slice().sort((a, b) => a.points - b.points);

    for (const badge of sortedBadgesForAnim) {
      await sleep(700);
      badges = [badge, ...badges];
      if (badge.points >= 1000000) {
        document.querySelector('.container')?.classList.add('flash-jackpot', 'shake-screen');
        setTimeout(() => document.querySelector('.container')?.classList.remove('flash-jackpot', 'shake-screen'), 500);
      }
    }

    phase = 'results';
    score = data.score;
    rarity = data.rarity;

    const { data: percData, error: percError } = await supabase.rpc('get_score_percentile', { p_score: data.score });
    if (!percError && percData) {
        percentileDisplay = getPercentileTier(percData.percentile, percData.total_rollers);
    }

    let targetScore = data.score;
    let currentScore = 0;
    let countUpInterval = setInterval(() => {
      currentScore += targetScore / 60;
      if (currentScore >= targetScore) {
        currentScore = targetScore;
        clearInterval(countUpInterval);
      }
      displayScore = Math.floor(currentScore);
    }, 33);

    const rollData = {
      date: getTodayString(),
      hex: data.hex,
      score: data.score,
      rarity: data.rarity,
      badges: sortBadgesDescending(data.badges || [])
    };

    if (!$session) {
      localStorage.setItem('chromadie-roll', JSON.stringify(rollData));
    } else {
      fetchWalletBalance();
    }

    loading = false;
  }

  onMount(async () => {
    tickCountdown();
    countdownInterval = setInterval(tickCountdown, 1000);

    if ($session) {
      const { data: dbRoll } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', $session.user.id)
        .eq('roll_date', getTodayString())
        .single();

      if (dbRoll) {
        phase = 'results';
        score = dbRoll.score; displayScore = dbRoll.score;
        rarity = dbRoll.rarity;
        badges = sortBadgesDescending(dbRoll.badges || []);
        displayColor = dbRoll.hex_code;

        const { data: percData } = await supabase.rpc('get_score_percentile', { p_score: dbRoll.score });
        if (percData) percentileDisplay = getPercentileTier(percData.percentile, percData.total_rollers);
      }
    } else {
      const savedRoll = localStorage.getItem('chromadie-roll');
      if (savedRoll) {
        try {
          const rollData = JSON.parse(savedRoll);
          if (rollData.date === getTodayString()) {
            phase = 'results';
            score = rollData.score; displayScore = rollData.score;
            rarity = rollData.rarity;
            badges = sortBadgesDescending(rollData.badges || []);
            displayColor = rollData.hex;

            const { data: percData } = await supabase.rpc('get_score_percentile', { p_score: rollData.score });
            if (percData) percentileDisplay = getPercentileTier(percData.percentile, percData.total_rollers);
          }
        } catch (e) {
          localStorage.removeItem('chromadie-roll');
        }
      }
    }
  });

  onDestroy(() => clearInterval(countdownInterval));
</script>

<div class="container game-container">
  {#if error}
    <p class="auth-error">{error}</p>
  {/if}

  {#if phase === 'preroll'}
    <div class="card">
      <h1>Daily Roll</h1>
      <p class="info-text">You get one roll every 24 hours. Roll to receive a random 24-bit color and earn Entropy Points (EP).</p>
      <button class="roll-btn" on:click={() => initiateRoll(false)} disabled={loading}>
        {loading ? 'Rolling...' : 'Roll the Die'}
      </button>
    </div>

  {:else if phase === 'rolling'}
    <div class="card">
      <div class="results-header results-header-tight">
        <div class="final-color-display" style="background-color: {displayColor};"></div>
        <div class="rolling-hex">{displayHex}</div>
      </div>
      <div class="scan-container">
        <div class="scan-bar" style="width: {scanProgress}%"></div>
      </div>
      <div class="rolling-badges-container">
        {#each badges as badge}
          <div class="badge-pop rarity-{badge.rarity || 'Common'}">
            <span class="badge-symbol">{badge.symbol || '✨'}</span>
            <div class="badge-text">
              <span class="badge-title">{badge.name}</span>
              <span class="badge-desc">{badge.desc || ''}</span>
            </div>
            <span class="badge-points">+{badge.points.toLocaleString()}</span>
          </div>
        {/each}
      </div>
    </div>

  {:else if phase === 'results'}
    <div class="card">
      <div class="results-header results-header-tight">
        <div class="rarity-tag rarity-{rarity}">{rarity}</div>

        <!-- FIX: Wrapped color orb in roll-effect-wrapper -->
        <div class="roll-effect-wrapper {rollEff.cls}" style="{rollEff.style}">
          <div class="final-color-display rarity-{rarity}" style="background-color: {displayColor};"></div>
        </div>

        <div class="hex-code">{displayColor}</div>
        <div class="score-label">Leaderboard Score</div>
        <div class="score-display">{displayScore.toLocaleString()}</div>

        {#if percentileDisplay}
          <div class="rank-display" style="color: {percentileDisplay.color}; margin-top: 5px; font-weight: 700;">
            {percentileDisplay.text}
            <span style="color: var(--text-muted); font-weight: 500; font-size: 0.8rem;">
              (of {percentileDisplay.total.toLocaleString()} rollers)
            </span>
          </div>
        {/if}
      </div>

      <div class="post-score-actions">
        <div class="countdown-inline">
          Next roll in: <span style="color: #fff; font-weight: 600;">{countdownString}</span>
        </div>
        <button class="chroma-btn" on:click={shareResults}>
          {copied ? '✅ Copied!' : '📋 Share Roll'}
        </button>

        {#if $session && $rerollShards > 0}
          <button class="reroll-btn" on:click={() => initiateRoll(true)} disabled={loading}>
            🎲 Use Reroll Shard ({$rerollShards} left)
          </button>
        {/if}
      </div>

      {#if !$session}
        <div class="brand-promo guest-promo-middle">
          <div class="brand-promo-header">Guest Mode</div>
          <div class="brand-promo-title">Save Your Progress</div>
          <div class="brand-promo-copy">Your roll is saved locally. Create an account to compete on the leaderboard, earn EP, and buy cosmetics.</div>
          <button class="roll-btn" style="margin-top: 15px; display: inline-block;" on:click={() => dispatch('promptlogin')}>
            Create Account
          </button>
        </div>
      {/if}

      <div class="badges-container badges-container-tight">
        <div class="badges-title">Conditions Met</div>
        {#if rollBadges.length === 0}
          <div class="badge-result">
            <div class="badge-text">
              <span class="badge-title">No special conditions met</span>
            </div>
          </div>
        {:else}
          {#each rollBadges as badge}
            <div class="badge-result rarity-{badge.rarity || 'Common'}">
              <span class="badge-symbol">{badge.symbol || '✨'}</span>
              <div class="badge-text">
                <span class="badge-title">{badge.name}</span>
                <span class="badge-desc">{badge.desc || 'Special condition met'}</span>
              </div>
              <span class="badge-points">+{badge.points.toLocaleString()}</span>
            </div>
          {/each}
        {/if}
      </div>

      {#if earnedAchievements.length > 0}
        <div class="badges-container badges-container-tight" style="margin-top: 20px;">
          <div class="badges-title">Achievements Unlocked</div>
          <div class="badges-subtitle">Rewards add to your spendable EP balance, not your leaderboard score.</div>
          {#each earnedAchievements as badge}
            <div class="badge-result rarity-Mythic">
              <span class="badge-symbol">{badge.symbol || '🏆'}</span>
              <div class="badge-text">
                <span class="badge-title">{badge.name}</span>
                <span class="badge-desc">{badge.desc}</span>
              </div>
              <span class="badge-points" style="color: #f1c40f; text-shadow: 0 0 10px rgba(241, 196, 15, 0.3);">+{badge.points.toLocaleString()} EP</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .results-header-tight { margin-bottom: 5px !important; }
  .post-score-actions { display: flex; justify-content: center; align-items: center; gap: 15px; margin: 0 0 20px 0; flex-wrap: wrap; }
  .countdown-inline { color: var(--text-muted); font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; background: rgba(255,255,255,0.03); padding: 6px 12px; border-radius: 6px; border: 1px solid var(--card-border); }
  .chroma-btn { position: relative; isolation: isolate; background: #16171f; color: #fff; border: 1px solid transparent; padding: 7px 18px; font-size: 0.85rem; border-radius: 8px; cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-weight: 600; transition: transform 0.15s ease, box-shadow 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.3); display: inline-flex; align-items: center; gap: 5px; }
  .chroma-btn::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.5px; z-index: -1; background: var(--spectrum); background-size: 300% 100%; -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; animation: spectrumFlow 5s linear infinite; }
  .chroma-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139, 124, 246, 0.25); }
  .chroma-btn:active { transform: translateY(1px); }

  .reroll-btn { background: rgba(139, 124, 246, 0.15); color: var(--accent-purple); border: 1px solid var(--accent-purple); padding: 7px 18px; font-size: 0.85rem; border-radius: 8px; cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-weight: 600; transition: all 0.2s; }
  .reroll-btn:hover { background: rgba(139, 124, 246, 0.3); }
  .reroll-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .badges-container-tight { margin-bottom: 0 !important; margin-top: 20px; }
  .guest-promo-middle { margin-bottom: 20px !important; text-align: center; border-left: none !important; }
  .badges-subtitle { font-size: 0.7rem; color: var(--text-muted); margin-bottom: 10px; text-align: left; opacity: 0.8; }
</style>
