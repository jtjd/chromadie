<script>
  import { toasts } from './stores';
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div 
      class="toast {toast.type}" 
      in:fly={{ y: 20, duration: 300 }}
      out:fly={{ y: -20, duration: 300 }}
      animate:flip={{ duration: 300 }}
    >
      {toast.message}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .toast {
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .toast.error {
    background: #d93025;
  }
  .toast.success {
    background: #0f9d58;
  }
</style>
