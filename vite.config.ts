// vite.config.ts — Vite 빌드 + Vitest 테스트 설정 (모바일 웹 단일 타겟)
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // QR로 접속하는 정적 호스팅(GitHub Pages 등) 하위 경로 배포 대비: 상대 경로
  base: './',
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/__tests__/**/*.test.ts'],
  },
});
