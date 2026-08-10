import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { minify as minifyCss } from 'csso'

function optimizeCssAssets() {
  return {
    name: 'chromadie-optimize-css-assets',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' || !asset.fileName.endsWith('.css')) continue
        // Preserve feature-query fallbacks used by translucent profile
        // surfaces while keeping the rest of the CSS compact.
        asset.source = minifyCss(String(asset.source), { restructure: false }).css
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), optimizeCssAssets()],
  build: {
    manifest: true
  }
})
