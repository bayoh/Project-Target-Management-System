import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Server configuration for development
  server: {
    port: 3000,
    host: true, // Allow external connections
    strictPort: false, // Try next available port if 3000 is taken
    open: false, // Don't auto-open browser
    cors: true,
    
    // HMR configuration
    hmr: {
      port: 3001,
      overlay: true, // Show error overlay
      clientPort: 3001,
    },
    
    // Watch configuration
    watch: {
      usePolling: false, // Use native file watching
      interval: 100, // Polling interval if usePolling is true
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
    
    // Proxy configuration for API calls (if needed)
    proxy: {
      // Uncomment and configure if you have API endpoints
      // '/api': {
      //   target: 'http://localhost:8000',
      //   changeOrigin: true,
      //   secure: false,
      // },
    },
  },
  
  // Preview server configuration (for production builds)
  preview: {
    port: 4173,
    host: true,
    strictPort: false,
    open: false,
    cors: true,
  },
  
  // Build configuration
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Enable for debugging in production
    minify: 'esbuild',
    
    // Chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks: (id) => {
           if (id.includes('node_modules')) {
             if (id.includes('react') || id.includes('react-dom')) {
               return 'vendor';
             }
             if (id.includes('react-router')) {
               return 'router';
             }
             if (id.includes('@radix-ui') || id.includes('lucide-react')) {
               return 'ui';
             }
             if (id.includes('@supabase')) {
               return 'supabase';
             }
             return 'vendor';
           }
         },
        // Asset naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    
    // Build performance
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false, // Faster builds
    
    // CSS configuration
    cssCodeSplit: true,
    cssMinify: true,
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
    ],
    exclude: [
      'lucide-react', // Known to cause issues with pre-bundling
    ],
    // Force re-optimization on certain changes
    force: false,
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/pages': path.resolve(__dirname, './src/pages'),
    },
  },
  
  // Environment variables
  envPrefix: 'VITE_',
  
  // CSS configuration
  css: {
    devSourcemap: true,
    // Removed SCSS preprocessor options since project uses TailwindCSS
    // If SCSS is needed in the future, uncomment and configure:
    // preprocessorOptions: {
    //   scss: {
    //     additionalData: `@import "@/styles/variables.scss";`,
    //   },
    // },
  },
  
  // Define global constants
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
  
  // Esbuild configuration
  esbuild: {
    target: 'esnext',
    logOverride: {
      'this-is-undefined-in-esm': 'silent',
    },
  },
  
  // Worker configuration
  worker: {
    format: 'es',
  },
  
  // JSON configuration
  json: {
    namedExports: true,
    stringify: false,
  },
  
  // App type for better SPA support
  appType: 'spa',
});
