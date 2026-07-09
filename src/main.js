import './styles/variables.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/cosmetics.css'
import { mount } from 'svelte'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
