import './styles/fonts.css'
import '@fontsource-variable/instrument-sans/wght.css'
import '@fontsource-variable/instrument-sans/wght-italic.css'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/manrope/wght.css'
import '@fontsource-variable/spline-sans/wght.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-600.css'
import './styles/tokens.css'
import './styles/variables.css'
import './styles/foundations.css'
import './styles/motion.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/site.css'
import { mount } from 'svelte'
import App from './App.svelte'
import { createBrowserProductAnalyticsAdapter, setProductAnalyticsAdapter } from './lib/productAnalytics.js'

setProductAnalyticsAdapter(createBrowserProductAnalyticsAdapter())

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
