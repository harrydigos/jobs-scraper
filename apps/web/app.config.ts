import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from '@solidjs/start/config';

export default defineConfig({
  ssr: false,
  server: {
    compatibilityDate: '2025-02-08',
  },
  vite: { plugins: [tailwindcss() as unknown as Plugin] }, // TODO: fix
});
