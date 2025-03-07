import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from '@solidjs/start/config';

export default defineConfig({
  vite: { plugins: [tailwindcss()] },
  ssr: false,
  devOverlay: false, // TODO: fix the resize observer issue and bring it back
});
