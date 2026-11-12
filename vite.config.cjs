const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig({
  plugins: [react()],
  base: './',
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    watch: {
      ignored: ['**/logpile_data/**', '**/UserData/**', '**/app-dist/**', '**/website/**'],
    },
  },
  build: {
    outDir: 'app-dist',
    emptyOutDir: true,
  },
})

