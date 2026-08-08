<script>
  export let ast = [];

  function safeNodes(value) {
    return Array.isArray(value) ? value : [];
  }
</script>

<div class="profile-rich-text">
  {#each safeNodes(ast) as block, blockIndex (`${block?.type || 'block'}-${blockIndex}`)}
    {#if block?.type === 'paragraph'}
      <p>
        {#each safeNodes(block.children) as node, nodeIndex (`${node?.type || 'node'}-${nodeIndex}`)}
          {#if node?.type === 'strong'}<strong>{node.children?.[0]?.value || ''}</strong>
          {:else if node?.type === 'emphasis'}<em>{node.children?.[0]?.value || ''}</em>
          {:else if node?.type === 'code'}<code>{node.value || ''}</code>
          {:else if node?.type === 'link'}<a href={node.url} target="_blank" rel="noopener noreferrer">{node.label || node.url}</a>
          {:else}{node?.value || ''}{/if}
        {/each}
      </p>
    {:else if block?.type === 'list'}
      {#if block.ordered}<ol>{#each safeNodes(block.items) as item, itemIndex (`item-${itemIndex}`)}<li>{#each safeNodes(item.children) as node, nodeIndex (`item-${itemIndex}-${nodeIndex}`)}{#if node?.type === 'strong'}<strong>{node.children?.[0]?.value || ''}</strong>{:else if node?.type === 'emphasis'}<em>{node.children?.[0]?.value || ''}</em>{:else if node?.type === 'code'}<code>{node.value || ''}</code>{:else if node?.type === 'link'}<a href={node.url} target="_blank" rel="noopener noreferrer">{node.label || node.url}</a>{:else}{node?.value || ''}{/if}{/each}</li>{/each}</ol>
      {:else}<ul>{#each safeNodes(block.items) as item, itemIndex (`item-${itemIndex}`)}<li>{#each safeNodes(item.children) as node, nodeIndex (`item-${itemIndex}-${nodeIndex}`)}{#if node?.type === 'strong'}<strong>{node.children?.[0]?.value || ''}</strong>{:else if node?.type === 'emphasis'}<em>{node.children?.[0]?.value || ''}</em>{:else if node?.type === 'code'}<code>{node.value || ''}</code>{:else if node?.type === 'link'}<a href={node.url} target="_blank" rel="noopener noreferrer">{node.label || node.url}</a>{:else}{node?.value || ''}{/if}{/each}</li>{/each}</ul>{/if}
    {:else if block?.type === 'code'}
      <pre><code>{block.value || ''}</code></pre>
    {/if}
  {/each}
</div>

<style>
  .profile-rich-text { display: grid; gap: .8rem; color: var(--color-ink-muted, rgba(220,230,248,.72)); font-size: .9rem; line-height: 1.65; }
  .profile-rich-text p, .profile-rich-text ol, .profile-rich-text ul, .profile-rich-text pre { margin: 0; }
  .profile-rich-text ol, .profile-rich-text ul { display: grid; gap: .25rem; padding-left: 1.2rem; }
  .profile-rich-text a { color: color-mix(in srgb, var(--profile-accent, #cdd2ff) 78%, white); text-underline-offset: .16em; }
  .profile-rich-text code { padding: .08rem .28rem; border-radius: .2rem; background: color-mix(in srgb, var(--profile-accent, #cdd2ff) 12%, transparent); color: var(--color-ink-strong, #f1f6ff); font: .85em/1.4 var(--font-mono-stack, monospace); }
  .profile-rich-text pre { overflow-x: auto; padding: .7rem .8rem; border: 1px solid color-mix(in srgb, var(--profile-accent, #cdd2ff) 18%, transparent); border-radius: .4rem; background: rgba(0,0,0,.2); }
  .profile-rich-text pre code { padding: 0; background: transparent; }
</style>
