import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    fs: {
      strict: true,
      deny: [
        '.env',
        '.env.*',
        '**/.env*',
        '*.{crt,pem}',
        'custom.d.ts',
        'node_modules/.vite'
      ]
    }
  },
  build: {
    target: 'es2022',
    cssMinify: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Must check lucide-react BEFORE react, because 'lucide-react' contains 'react'
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
          }
          // Isolate static regional GIS corridor data tables
          if (id.includes('services/fuelRouteService') || id.includes('services/googleDirectionsService')) {
            return 'geo-data-vendor';
          }
        }
      }
    }
  }
})
