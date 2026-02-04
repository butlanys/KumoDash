import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

const monacoPlugin =
  (monacoEditorPlugin as unknown as { default?: typeof monacoEditorPlugin }).default ??
  monacoEditorPlugin

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), monacoPlugin({})],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
