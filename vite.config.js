import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three'))               return 'three'
          if (id.includes('@react-three'))                     return 'r3f'
          if (id.includes('node_modules/reactflow') ||
              id.includes('node_modules/@reactflow'))          return 'flow'
        }
      }
    }
  }
})
