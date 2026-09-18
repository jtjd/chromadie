<script>
  export let initial = '?';
  export let className = '';
</script>

<span class={`user-avatar-fallback ${className}`} aria-hidden="true">
  {(initial || '?')[0]}
</span>

<style>
  .user-avatar-fallback {
    display: grid;
    position: relative;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    overflow: hidden;
    place-items: center;
    border: 0;
    border-radius: 50%;
    container-type: inline-size;
    background: rgba(8, 9, 12, 0.72);
    color: rgba(248, 248, 248, 0.94);
    /* Keep initials bounded when the effect wrapper has no query context. */
    font: 600 clamp(1.5rem, 34px, 3rem) / 1 'Inter', sans-serif;
    text-transform: lowercase;
  }
</style>
