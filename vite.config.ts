import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Emit relative asset paths. The packaged desktop app loads index.html over
  // file://, where a leading "/" resolves to the filesystem root rather than
  // the app bundle - so absolute paths leave the renderer stuck on the loader.
  base: './',
  plugins: [react()],
})
