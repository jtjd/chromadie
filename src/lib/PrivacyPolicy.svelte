<svelte:head>
  <title>Privacy Policy | ChromaDie</title>
</svelte:head>

<main class="container legal-page" aria-labelledby="privacy-title">
  <section class="card legal-hero">
    <p class="legal-kicker">Privacy policy</p>
    <h1 id="privacy-title">How ChromaDie handles data</h1>
    <p class="legal-updated">Last updated: July 2026</p>
    <p class="info-text">
      ChromaDie keeps data collection focused on the game itself. We only use the information needed to run accounts, save progress, and keep the service secure.
    </p>
  </section>

  <section class="card legal-section">
    <h2>What we collect</h2>
    <ul>
      <li>Account email, used for sign-in, email confirmation, and account recovery. Account deletion is authorized by your current signed-in session.</li>
      <li>Profile details such as your username and cosmetic choices, which may appear on your profile or leaderboard row.</li>
      <li>Gameplay data including rolls, scores, EP, inventory, achievements, pinned achievements, and rivals.</li>
      <li>Guest progress and shop cache stored locally in your browser when you play without an account.</li>
      <li>Security data needed to protect the site from abuse and keep sign-in working reliably.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>How we use it</h2>
    <ul>
      <li>To create and secure accounts.</li>
      <li>To save your progress, cosmetics, and achievements.</li>
      <li>To show profile and leaderboard information where the game makes it visible.</li>
      <li>To keep guest mode and local browser storage working on the device you use.</li>
      <li>To reduce spam, fraud, and other abusive activity.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>Sharing and access</h2>
    <ul>
      <li>We do not sell personal data.</li>
      <li>We do not use advertising or advertising cookies.</li>
      <li>We use privacy-conscious Cloudflare Web Analytics to understand page performance and basic site usage. It is not used for advertising or marketing profiles.</li>
      <li>Supabase processes account and game data, and Cloudflare provides site delivery, abuse protection, Turnstile, and privacy-conscious web analytics.</li>
      <li>Some profile and leaderboard information is visible to other players in the app.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>Data retention</h2>
    <ul>
      <li>Detailed score rows are retained for roughly 30 days. Durable account totals, achievements, inventory, and best-roll records remain while your account is active.</li>
      <li>Challenge links expire after 30 days and are removed by scheduled cleanup.</li>
      <li>Guest progress remains in the browser until you clear site data or the app removes it.</li>
      <li>Some security and operational records may be kept for a limited time to protect the service and investigate misuse.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>Account deletion</h2>
    <p>
      You can permanently delete your account from profile settings while signed in. The operation removes the Supabase Auth user and app-owned profile, score, inventory, achievement, rival, and challenge records. It is retry-safe if a provider request is interrupted, signs this browser out when complete, and cannot be undone.
    </p>
  </section>

  <section class="card legal-section">
    <h2>Your choices</h2>
    <ul>
      <li>You can update your profile information in the app.</li>
      <li>You can delete your account from profile settings.</li>
      <li>You can clear guest progress by removing browser data for the site.</li>
      <li>You can avoid account sign-in and play in guest mode instead.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>Changes to this policy</h2>
    <p>
      If the way the game handles data changes, we will update this page so the policy stays aligned with the product.
    </p>
  </section>
</main>

<style>
  .legal-page {
    max-width: 920px;
    text-align: left;
    margin-bottom: 48px;
  }

  .legal-hero h1 {
    margin-top: 0;
    margin-bottom: 0.75rem;
    font-size: clamp(2rem, 4vw, 3.2rem);
  }

  .legal-updated {
    margin: 0 0 0.8rem;
    color: rgba(255,255,255,0.72);
    font-size: 0.9rem;
    font-weight: 600;
  }

  .legal-kicker {
    margin: 0 0 0.6rem;
    color: var(--accent-purple);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .legal-section h2 {
    margin-top: 0;
    margin-bottom: 0.8rem;
    font-size: 1.15rem;
  }

  .legal-section p,
  .legal-section li {
    color: var(--text-muted);
    line-height: 1.65;
  }

  .legal-section ul {
    padding-left: 1.1rem;
    display: grid;
    gap: 0.55rem;
  }

  .legal-section + .legal-section {
    margin-top: 1rem;
  }
</style>
