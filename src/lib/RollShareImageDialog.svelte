<script>
  import { onDestroy, tick } from 'svelte';
  import { addToast } from './stores';
  import { focusFirstElement, restoreFocus, trapFocus } from './a11y';
  import { getAppOrigin } from './authUrls';
  import { normalizeHexColor } from './utils';
  import { createRollImageCopyFreshness, runRollImageCopy } from './rollImageCopy.js';

  export let score = 0;
  export let rarity = '';
  export let color = '#000000';
  export let ink = '#ffffff';
  let showImageModal = false;
  let imagePreviewUrl = '';
  let imageCopied = false;
  let imageDialog = null;
  let imageOpener = null;
  let activeResult = null;
  let activeResultIsCurrent = () => false;
  const imageCopyFreshness = createRollImageCopyFreshness();
  let imageCopiedFeedbackVersion = 0;

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = showImageModal ? 'hidden' : '';
  }

  async function buildShareCardCanvas(result, isCurrent) {
    const { buildRollShareCardCanvas } = await import('./rollShareExport.js');
    if (!isCurrent()) return null;

    return buildRollShareCardCanvas({
      score: result.score,
      rarity: result.rarity,
      color: result.color,
      origin: getAppOrigin()
    });
  }

  /** @param {number} expectedVersion @param {(version: number) => boolean} [isCurrent] */
  export async function open(expectedVersion, isCurrent = () => true) {
    const requestIsCurrent = () => isCurrent(expectedVersion);
    if (!requestIsCurrent()) return;
    imageCopyFreshness.invalidate();
    const result = { score, rarity, color };
    const exportCanvas = await buildShareCardCanvas(result, requestIsCurrent);
    if (!exportCanvas || !requestIsCurrent()) return;

    activeResult = result;
    activeResultIsCurrent = requestIsCurrent;
    imagePreviewUrl = exportCanvas.toDataURL('image/png');
    imageCopied = false;
    showImageModal = true;
    imageOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await tick();
    if (!requestIsCurrent() || !showImageModal) return;
    focusFirstElement(imageDialog) || imageDialog?.focus();
  }

  async function copyImageToClipboard() {
    const result = activeResult;
    const isResultCurrent = activeResultIsCurrent;
    const isCurrent = imageCopyFreshness.begin(isResultCurrent);
    await runRollImageCopy({
      result,
      isCurrent,
      buildCanvas: currentResult => buildShareCardCanvas(currentResult, isCurrent),
      canvasToBlob: async canvas => {
        const { canvasToPngBlob } = await import('./rollShareExport.js');
        return canvasToPngBlob(canvas);
      },
      writeClipboard: blob => {
        if (!navigator.clipboard?.write || !window.ClipboardItem) {
          throw new Error('Image clipboard is not supported in this browser.');
        }
        const item = new ClipboardItem({ 'image/png': blob });
        return navigator.clipboard.write([item]);
      },
      onCopied: () => {
        const feedbackVersion = ++imageCopiedFeedbackVersion;
        imageCopied = true;
        addToast('Image copied to clipboard.', 'success');
        setTimeout(() => {
          if (feedbackVersion === imageCopiedFeedbackVersion) imageCopied = false;
        }, 2000);
      },
      onError: err => console.error('Clipboard write failed', err),
      onFailure: () => {
        addToast('Could not copy the share image in this browser.', 'error');
        imageCopied = false;
      }
    });
  }

  /** @param {boolean} [restoreOpener] */
  export async function close(restoreOpener = true) {
    if (!showImageModal) return;
    imageCopyFreshness.invalidate();
    showImageModal = false;
    activeResult = null;
    activeResultIsCurrent = () => false;
    await tick();
    if (restoreOpener) restoreFocus(imageOpener);
    imageOpener = null;
  }

  function handleImageModalKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      void close();
      return;
    }

    trapFocus(event, imageDialog);
  }

  onDestroy(() => {
    imageCopyFreshness.invalidate();
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  });
</script>

{#if showImageModal}
  <div
    class="image-modal-overlay"
    style={`--share-image-accent: ${normalizeHexColor(color, '#ffffff')}; --share-image-ink: ${ink};`}
    role="presentation"
    on:click|self={() => close()}
  >
    <div
      class="image-modal-content"
      bind:this={imageDialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-image-title"
      tabindex="-1"
      on:keydown={handleImageModalKeydown}
    >
      <header class="image-modal-header">
        <p class="image-modal-kicker">Daily roll</p>
        <h3 id="share-image-title">Share this roll</h3>
        <p class="image-modal-copy">Preview the result image or copy it to share elsewhere.</p>
      </header>
      <div class="image-modal-preview">
        <img src={imagePreviewUrl} alt="ChromaDie daily roll share card" class="preview-img" />
      </div>
      <div class="modal-actions">
        <button type="button" class="download-btn" on:click={copyImageToClipboard}>
          {#if imageCopied}Copied{:else}Copy image{/if}
        </button>
        <button type="button" class="close-btn" on:click={() => close()}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .image-modal-overlay {
    position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: clamp(16px, 4vw, 32px);
    background: rgba(8, 8, 10, .86); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  }
  .image-modal-content {
    display: grid; gap: 18px; width: min(100%, 680px); max-height: calc(100dvh - 32px); overflow-y: auto; padding: clamp(18px, 4vw, 28px);
    border: 1px solid color-mix(in srgb, var(--share-image-accent, #ffffff) 32%, var(--card-border)); border-radius: 16px;
    background: #161619; box-shadow: 0 24px 80px rgba(0, 0, 0, .48); text-align: left;
  }
  .image-modal-header { display: grid; gap: 6px; }
  .image-modal-kicker { margin: 0; color: var(--share-image-accent, var(--color-accent)); font: 700 .62rem/1 var(--font-mono-stack); letter-spacing: .14em; text-transform: uppercase; }
  .image-modal-content h3 { margin: 0; color: #fff; font: 750 1.45rem/1.05 var(--font-display-stack); letter-spacing: -.03em; }
  .image-modal-copy { margin: 0; color: var(--text-muted); font: 500 .78rem/1.4 var(--font-body-stack); }
  .image-modal-preview { padding: 8px; border: 1px solid var(--card-border); border-radius: 12px; background: #0e0e10; }
  .preview-img { display: block; width: 100%; max-height: min(63vw, calc(100dvh - 12rem)); object-fit: contain; border-radius: 7px; }
  .modal-actions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
  .download-btn,
  .close-btn { min-height: 42px; padding: 0 16px; border-radius: 9px; cursor: pointer; font: 650 .76rem/1 var(--font-body-stack); }
  .download-btn { border: 1px solid var(--share-image-accent, #fff); background: var(--share-image-accent, #fff); color: var(--share-image-ink, #0e0e10); }
  .download-btn:hover { filter: brightness(1.08); }
  .close-btn { border: 1px solid var(--card-border); background: transparent; color: var(--text); }
  .close-btn:hover { border-color: var(--share-image-accent, var(--color-accent)); background: color-mix(in srgb, var(--share-image-accent, var(--color-accent)) 8%, transparent); }

  @media (max-width: 600px) {
    .image-modal-content { padding: 18px 16px; border-radius: 14px; }
    .image-modal-content h3 { font-size: 1.25rem; }
    .image-modal-preview { padding: 5px; }
    .modal-actions { flex-direction: column; }
    .download-btn,
    .close-btn { width: 100%; }
  }
</style>
