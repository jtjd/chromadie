<script>
  export let initial = '?';
  export let className = '';
</script>

<span class={`profile-avatar-fallback ${className}`} aria-hidden="true">
  <span>{initial}</span>
</span>

<style>
  .profile-avatar-fallback {
    display: grid;
    position: relative;
    width: 100%;
    height: 100%;
    place-items: center;
    border-radius: 50%;
    container-type: inline-size;
    background: rgba(8, 9, 12, .72);
    color: var(--profile-highlight, #f8f8f8);
  }
  .profile-avatar-fallback > span {
    font: 600 55cqi / 1 'Clash Display', sans-serif;
  }
</style>
