<script>
  import AnalyticsPreferences from './AnalyticsPreferences.svelte';
</script>

<svelte:head>
  <title>Privacy Policy | ChromaDie</title>
</svelte:head>

<main class="container site-document legal-page" aria-labelledby="privacy-title">
  <section class="card legal-hero">
    <p class="legal-kicker">Privacy policy</p>
    <h1 id="privacy-title">ChromaDie Privacy Policy</h1>
    <p class="legal-updated">Last updated: July 2026</p>
    <p class="info-text">
      This policy explains what information ChromaDie collects, how we use it, and the choices available to you. We limit collection to the information needed to provide, maintain, and protect the game.
    </p>
  </section>

  <section class="card legal-section">
    <h2>Information we collect</h2>
    <ul>
      <li><strong>Account information:</strong> your email address, which is used for sign-in, email confirmation, and account recovery.</li>
      <li><strong>Profile information:</strong> your username and cosmetic selections. This information may be visible on your profile and the leaderboard.</li>
      <li><strong>Uploaded profile content:</strong> if you use profile uploads, we process the avatar, background, and other supported media you choose to publish. Public uploads are associated with your profile and may be cached or transformed to serve them efficiently.</li>
      <li><strong>Gameplay information:</strong> rolls, scores, EP, inventory, achievements, pinned achievements, rivals, and other information associated with your progress.</li>
      <li><strong>Guest data:</strong> game progress and shop data stored locally in your browser when you play without an account.</li>
      <li><strong>Security and technical information:</strong> information used to maintain reliable sign-in, protect the service, and prevent abuse.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>How we use information</h2>
    <ul>
      <li>Provide, maintain, and secure your account.</li>
      <li>Save your game progress, cosmetics, and achievements.</li>
      <li>Display profile and leaderboard information to other players.</li>
      <li>Support guest mode and save guest progress on your device.</li>
      <li>Monitor site performance and understand basic usage.</li>
      <li>Detect and prevent spam, fraud, and other abusive activity.</li>
      <li>Review, restrict, or remove uploaded content that violates the Terms of Service or creates a safety, legal, or operational risk.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>Public profiles and uploaded content</h2>
    <p>
      Profile pages, links, avatars, backgrounds, and other published customization are public by design. Do not upload content you need to keep private. We may scan, moderate, unpublish, or remove content and accounts when required to enforce our rules, respond to reports, protect people, or comply with law.
    </p>
  </section>

  <section class="card legal-section">
    <h2>How information is shared</h2>
    <ul>
      <li>We do not sell your personal information.</li>
      <li>We do not display advertising or use advertising cookies.</li>
      <li>Supabase processes account and gameplay information on our behalf.</li>
      <li>Cloudflare provides site delivery, abuse protection, Turnstile verification, and privacy-focused web analytics. Analytics are used to understand site performance and basic usage, not to build advertising or marketing profiles.</li>
      <li>Optional product-event measurement is separate from Cloudflare Web Analytics and is off until you choose to allow it. The current product-event adapter keeps only redacted events in the page and does not transmit or store product-event records.</li>
      <li>Your username, cosmetic selections, and certain gameplay information may be visible to other players through profiles and leaderboards.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>Data retention</h2>
    <ul>
      <li>Detailed score records are generally retained for 30 days. Account totals, achievements, inventory, and best-roll records are retained while your account remains active.</li>
      <li>Challenge links expire after 30 days and are subsequently deleted.</li>
      <li>Guest data remains in your browser until you clear the site's data or ChromaDie removes it.</li>
      <li>Security and operational records may be retained for a limited period when needed to protect the service or investigate misuse.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>Account deletion</h2>
    <p>
      You can permanently delete your account from your profile settings while signed in. Deletion removes your authentication account and associated profile, score, inventory, achievement, rival, and challenge records. When deletion is complete, you will be signed out on that browser. Account deletion cannot be undone.
    </p>
  </section>

  <section class="card legal-section">
    <h2>Your choices</h2>
    <ul>
      <li>Update your profile information in the game.</li>
      <li>Permanently delete your account from your profile settings.</li>
      <li>Clear guest progress by removing ChromaDie's site data from your browser.</li>
      <li>Play in guest mode without creating or signing in to an account.</li>
    </ul>
    <AnalyticsPreferences />
  </section>

  <section class="card legal-section">
    <h2>Contact</h2>
    <p>
      For questions about this policy, your account, or ChromaDie's privacy practices, contact us at <a href="mailto:support@chromadie.com">support@chromadie.com</a>.
      For business inquiries, contact <a href="mailto:business@chromadie.com">business@chromadie.com</a>.
    </p>
  </section>

  <section class="card legal-section">
    <h2>Changes to this policy</h2>
    <p>
      We may update this policy to reflect changes to ChromaDie or its data practices. When we do, we will post the revised policy on this page and update the date shown above.
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
    color: var(--color-accent-bright);
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

  .legal-section a {
    color: var(--color-accent-bright);
    font-weight: 600;
    text-decoration-color: color-mix(in srgb, var(--accent-purple) 55%, transparent);
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    transition: color 0.2s ease, text-decoration-color 0.2s ease;
  }

  .legal-section a:hover,
  .legal-section a:focus-visible {
    color: var(--color-accent-bright);
    text-decoration-color: currentColor;
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
