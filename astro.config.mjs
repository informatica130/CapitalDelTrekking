// @ts-check
import { defineConfig } from 'astro/config';

// URL pública del sitio. Cámbiala al dominio definitivo antes de publicar.
export default defineConfig({
  site: 'https://melipeucocapitaldeltrekking.cl',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
