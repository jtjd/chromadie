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
    <p class="legal-updated">Last updated: August 2026</p>
    <p class="info-text">
      This policy explains what information ChromaDie collects, how we use it, and the choices available to you. We limit collection to what is needed to provide, maintain, and protect the service.
    </p>
  </section>

  <section class="card legal-section">
    <h2>Information we collect</h2>
    <ul>
      <li><strong>Account information:</strong> your email address, which is used for sign-in, email confirmation, and account recovery.</li>
      <li><strong>Profile information:</strong> your username, public profile details, links, and cosmetic selections. This information may be visible on your profile, in discovery, and on leaderboards when you permit discovery.</li>
      <li><strong>Uploaded profile content:</strong> the avatars, backgrounds, and supported media you choose to upload or publish. Public uploads are associated with your profile and may be resized, converted, cached, or transformed to serve them efficiently.</li>
      <li><strong>Gameplay information:</strong> rolls, scores, EP, inventory, achievements, pinned achievements, rivals, and other information associated with your progress.</li>
      <li><strong>Guest data:</strong> game progress and shop data stored locally in your browser when you play without an account.</li>
      <li><strong>Billing and security information:</strong> limited checkout, payment-status, fraud, and operational records used to provide Plus, protect the service, meet legal obligations, and handle disputes. ChromaDie does not receive or store your full payment-card number.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>How we use information</h2>
    <ul>
      <li>Provide, maintain, and secure your account.</li>
      <li>Save your game progress, cosmetics, and achievements.</li>
      <li>Display the public profile, media, and gameplay information you choose to make available to other players and search engines.</li>
      <li>Support guest mode and save guest progress on your device.</li>
      <li>Monitor site performance, basic usage, and consented product measurement.</li>
      <li>Detect and prevent spam, fraud, and other abusive activity.</li>
      <li>Review, restrict, or remove uploaded content that violates the Terms of Service or creates a safety, legal, or operational risk.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>Public profiles and uploaded content</h2>
    <p>
      Profile pages, links, avatars, backgrounds, and other published customization are public by design. If you enable discovery, your profile may appear in ChromaDie discovery and generated search sitemaps. Turning discovery off keeps your direct profile link available but asks search engines not to index it. Do not upload content you need to keep private. We may scan, moderate, unpublish, or remove content and accounts when required to enforce our rules, respond to reports, protect people, or comply with law.
    </p>
  </section>

  <section class="card legal-section">
    <h2>How information is shared</h2>
    <ul>
      <li>We do not sell your personal information.</li>
      <li>We do not display advertising or use advertising cookies.</li>
      <li>Supabase processes account, profile, gameplay, and database information on our behalf.</li>
      <li>Cloudflare Pages delivers the site; Cloudflare R2 stores supported profile media; Cloudflare Turnstile helps prevent abuse; and Cloudflare Web Analytics measures site performance and basic usage.</li>
      <li>Fontshare serves the remote fonts used by the site. Your browser may make a request to Fontshare when those fonts load.</li>
      <li>Stripe processes Plus checkout and payment details. We receive limited payment metadata, such as checkout and payment-status identifiers, rather than raw card details.</li>
      <li>Optional product-event measurement is separate from Cloudflare Web Analytics and is off until you choose to allow it. Consented progression events use anonymous, allowlisted dimensions in daily aggregate buckets, never raw events, account ids, scores, or colors.</li>
      <li>Your username, published profile details, cosmetic selections, uploaded media, and certain gameplay information may be visible to other players through profiles and leaderboards.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>Data retention</h2>
    <ul>
      <li>Detailed score records are generally retained for 30 days. Account totals, achievements, inventory, and best-roll records are retained while your account remains active.</li>
      <li>Consented progression measurement is retained only as anonymous daily totals for up to 90 days and cannot be tied back to an account.</li>
      <li>Challenge links expire after 30 days and are subsequently deleted.</li>
      <li>Guest data remains in your browser until you clear the site's data or ChromaDie removes it.</li>
      <li>Limited billing, security, and operational records may be retained as needed for fraud prevention, security, tax and accounting obligations, legal compliance, chargebacks, disputes, and enforcement.</li>
    </ul>
  </section>

  <section class="card legal-section">
    <h2>Account deletion</h2>
    <p>
      You can permanently delete your account from profile settings while signed in. Deletion removes your authentication account and associated profile, score, inventory, achievement, rival, and challenge records, subject to the billing, security, and legal retention described above. When deletion is complete, you will be signed out on that browser. Account deletion cannot be undone.
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
    font: 600 clamp(3rem, 6vw, 5.25rem)/.94 'Manrope Variable', sans-serif;
    letter-spacing: -.048em;
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
    text-decoration-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
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
