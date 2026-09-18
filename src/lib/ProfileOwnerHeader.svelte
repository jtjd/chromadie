<header class="profile-owner-header" data-site-chrome="header">
  <div class="profile-owner-header__inner">
    <a class="profile-owner-header__brand" href="/" aria-label="ChromaDie home">
      <img src="/brand/am-mark-v1.webp" alt="" width="72" height="58" decoding="async" />
    </a>
    <nav aria-label="Your profile navigation">
      <a href="/">Home</a>
      <a class="customize" href="/profile/settings">Customize profile</a>
    </nav>
  </div>
</header>

<style>
  .profile-owner-header {
    position: relative;
    z-index: 20;
    width: 100%;
    height: 88px;
    background: transparent;
    font: 500 0.875rem / 1.4 'Inter', ui-sans-serif, system-ui, sans-serif;
  }

  .profile-owner-header__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: min(968px, calc(100% - 48px));
    height: 54px;
    box-sizing: border-box;
    margin: 22px auto 0;
    padding: 0 12px 0 26px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 999px;
    background: rgba(13, 14, 17, 0.76);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.025);
    backdrop-filter: blur(22px) saturate(118%);
    -webkit-backdrop-filter: blur(22px) saturate(118%);
  }

  .profile-owner-header__brand { display: inline-flex; align-items: center; }
  .profile-owner-header__brand img { display: block; width: 44px; height: auto; filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.08)); }
  nav { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; }
  nav a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    border-radius: 999px;
    color: #f5f5f6;
    text-decoration: none;
  }
  .customize { padding-inline: 1.15rem; background: #f5f5f6; color: #101014; }
  nav a:hover { background: #303038; }
  .customize:hover { background: #dedee5; }
  a:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }

  @media (max-width: 700px) {
    .profile-owner-header { height: 70px; }
    .profile-owner-header__inner { width: calc(100% - 20px); height: 52px; margin-top: 8px; padding: 0 8px 0 14px; }
    .profile-owner-header__brand img { width: 42px; }
    nav { gap: 0.25rem; }
    nav a { min-height: 38px; padding-inline: 0.65rem; font-size: 0.75rem; }
    .customize { padding-inline: 0.85rem; }
  }
</style>
