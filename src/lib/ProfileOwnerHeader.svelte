<header class="profile-owner-header" data-site-chrome="header">
  <nav aria-label="Your profile navigation">
    <a href="/">Home</a>
    <a class="customize" href="/profile/settings">Customize profile</a>
  </nav>
</header>

<style>
  .profile-owner-header {
    position: relative;
    z-index: 20;
    padding: 0.75rem clamp(1rem, 4vw, 3rem);
    background: #101014;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    font: 500 0.875rem / 1.4 'Inter', ui-sans-serif, system-ui, sans-serif;
  }

  nav { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    border-radius: 0.625rem;
    color: #f5f5f6;
    text-decoration: none;
  }
  .customize { background: #f5f5f6; color: #101014; }
  a:hover { background: #303038; }
  .customize:hover { background: #dedee5; }
  a:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
</style>
