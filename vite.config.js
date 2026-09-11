import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` cible un déploiement GitHub Pages sur https://<user>.github.io/groovebox/
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/groovebox/' : '/',
  plugins: [react()],
})
