// Sets up the Svelte app, and renders App.svelte

import App from './App.svelte'
const app = new App({ target: document.body, props: { name: 'Svelte'} })
export default app