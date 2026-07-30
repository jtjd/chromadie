import './styles/fonts.css'
import './styles/tokens.css'
import './styles/variables.css'
import './styles/foundations.css'
import './styles/motion.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/cosmetics.css'
import './styles/site.css'
import { mount } from 'svelte'
import App from './App.svelte'
import { createBrowserProductAnalyticsAdapter, setProductAnalyticsAdapter } from './lib/productAnalytics.js'

setProductAnalyticsAdapter(createBrowserProductAnalyticsAdapter())

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
