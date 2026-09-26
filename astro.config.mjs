import { defineConfig } from 'astro/config';

// 'preserve' keeps the site's existing URLs: src/pages/about.astro → /about.html,
// src/pages/swancityscuba/index.astro → /swancityscuba/index.html (served at /swancityscuba/).
export default defineConfig({
  site: 'https://cesi.earth',
  build: { format: 'preserve' },
  trailingSlash: 'ignore',
});
