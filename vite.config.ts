import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      routeFileIgnorePattern: '.*\\.test\\..*',
      autoCodeSplitting: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react'
            }
            if (id.includes('@tanstack')) {
              return 'vendor-tanstack'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            if (id.includes('socket.io') || id.includes('engine.io')) {
              return 'vendor-realtime'
            }
            if (
              id.includes('zod') ||
              id.includes('axios') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge') ||
              id.includes('class-variance-authority')
            ) {
              return 'vendor-utils'
            }
            if (
              id.includes('msw') ||
              id.includes('@mswjs') ||
              id.includes('headers-polyfill') ||
              id.includes('outvariant') ||
              id.includes('strict-event-emitter')
            ) {
              return 'vendor-msw'
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
