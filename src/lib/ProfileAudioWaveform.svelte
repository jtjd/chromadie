<script>
  import { onDestroy } from 'svelte';

  export let src = '';
  export let progress = 0;
  export let accent = '#CBA6F7';
  export let label = 'Audio waveform';

  const BAR_COUNT = 64;
  let bars = fallbackBars('');
  let loadedSrc = '';
  let requestId = 0;
  let audioContext;

  $: if (src !== loadedSrc) {
    // Svelte reruns this reactive statement when the source prop changes;
    // retain the last source so decoding is not restarted on progress ticks.
    // eslint-disable-next-line no-useless-assignment
    loadedSrc = src;
    void loadWaveform(src);
  }

  function fallbackBars(seed) {
    let hash = 17;
    for (const character of String(seed || 'profile-audio')) hash = (hash * 31 + character.codePointAt(0)) >>> 0;
    return Array.from({ length: BAR_COUNT }, (_, index) => {
      const wave = Math.abs(Math.sin((index + 1) * .47 + hash / 997));
      const pulse = Math.abs(Math.sin((index + 3) * .13 + hash / 431));
      return .2 + wave * .48 + pulse * .28;
    });
  }

  async function loadWaveform(nextSrc) {
    const currentRequest = ++requestId;
    bars = fallbackBars(nextSrc);
    if (!nextSrc || typeof window === 'undefined' || typeof fetch !== 'function') return;
    const AudioContextClass = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!AudioContextClass) return;
    let decodeContext = null;
    try {
      const response = await fetch(nextSrc, { cache: 'force-cache' });
      if (!response.ok) return;
      const buffer = await response.arrayBuffer();
      if (currentRequest !== requestId) return;
      decodeContext = new AudioContextClass();
      audioContext = decodeContext;
      const decoded = await decodeContext.decodeAudioData(buffer.slice(0));
      if (currentRequest !== requestId) return;
      const channel = decoded.getChannelData(0);
      const windowSize = Math.max(1, Math.floor(channel.length / BAR_COUNT));
      const peaks = Array.from({ length: BAR_COUNT }, (_, index) => {
        const start = index * windowSize;
        const end = Math.min(channel.length, start + windowSize);
        let peak = 0;
        for (let sample = start; sample < end; sample += 1) peak = Math.max(peak, Math.abs(channel[sample] || 0));
        return peak;
      });
      const maximum = Math.max(...peaks, .001);
      bars = peaks.map(peak => .18 + (peak / maximum) * .72);
    } catch {
      // Decorative decoding may be unavailable because of browser or storage
      // policy; the deterministic waveform remains useful in that case.
    } finally {
      if (decodeContext) {
        await decodeContext.close?.().catch?.(() => {});
        if (audioContext === decodeContext) audioContext = null;
      }
    }
  }

  onDestroy(() => {
    requestId += 1;
    audioContext?.close?.().catch?.(() => {});
  });
</script>

<div class="profile-audio-waveform" role="img" aria-label={label} style={`--wave-accent:${accent}`}>
  {#each bars as bar, index (index)}
    <span class:profile-audio-waveform__bar--played={index / bars.length <= Math.max(0, Math.min(1, progress / 100))} style={`--bar-height:${bar * 100}%;`}></span>
  {/each}
</div>

<style>
  .profile-audio-waveform { display: flex; align-items: center; gap: .12rem; width: 100%; min-height: 2.35rem; overflow: hidden; }
  .profile-audio-waveform span { display: block; flex: 1 1 0; min-width: 1px; height: var(--bar-height); max-height: 100%; border-radius: 999px; background: color-mix(in srgb, var(--wave-accent) 42%, transparent); transition: background-color .16s ease; }
  .profile-audio-waveform span.profile-audio-waveform__bar--played { background: var(--wave-accent); }
  @media (prefers-reduced-motion: reduce) { .profile-audio-waveform span { transition: none; } }
</style>
