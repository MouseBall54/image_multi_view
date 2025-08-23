import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON ? './' : (process.env.NODE_ENV === 'production' ? '/image_multi_view/' : '/'),
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // assetsInlineLimit: 4096,     // 필요시 조정(인라인 임계값)
    // sourcemap: true,             // 디버그 필요시
    // emptyOutDir: true            // 빌드 전 dist 비우기(기본 true)
  },
  server: {
    port: 5173,
    host: 'localhost'
  }
})