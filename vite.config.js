import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import { compression } from 'vite-plugin-compression2';

const target = process.env.VITE_API_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'ethers'
    ],
    exclude: [
      'react-router-dom'
    ]
  },
  build: {
    target: 'es2020',
    // Use esbuild minify to avoid rare Terser/runtime issues
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          wagmi: ['wagmi', 'viem'],
          ethers: ['ethers'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: true,
    reportCompressedSize: false,
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Разрешаем доступ с любого IP
    strictPort: true, // Строго используем указанный порт
    hmr: {
      port: 5173, // Явно указываем порт для HMR
      host: 'localhost',
      protocol: 'ws',
      timeout: 30000, // Увеличиваем timeout для HMR
      overlay: true, // Показываем ошибки в overlay
    },
    proxy: {
      '/api': {
        target,
        changeOrigin: true,
        secure: false,
      },
      '/pin-nft': {
        target,
        changeOrigin: true,
        secure: false,
      },
      '/pin-file': {
        target,
        changeOrigin: true,
        secure: false,
      },
      '/pin-multiple-files': {
        target,
        changeOrigin: true,
        secure: false,
      },
      '/upload-file': {
        target,
        changeOrigin: true,
        secure: false,
      },
      '/whitelist': {
        target,
        changeOrigin: true,
        secure: false,
      },
      '/pin-json': {
        target,
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      ignored: [
        '**/backend/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**'
      ]
    },
    // Добавляем настройки для лучшей стабильности
    cors: true,
    force: true, // Принудительно перезапускаем сервер при изменениях
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Отключаем некоторые оптимизации для стабильности
  experimental: {
    renderBuiltUrl: false,
  },
  // Добавляем настройки для избежания конфликтов с кошельками
  esbuild: {
    define: {
      global: 'globalThis',
    },
  },
});
