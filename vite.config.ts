import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/image_multi_view/',       // Project Pages 필수
  build: {
    outDir: 'dist',                 // 기본값이지만 명시 추천
    assetsDir: 'assets',            // 기본값
    // assetsInlineLimit: 4096,     // 필요시 조정(인라인 임계값)
    // sourcemap: true,             // 디버그 필요시
    // emptyOutDir: true            // 빌드 전 dist 비우기(기본 true)
  }
})