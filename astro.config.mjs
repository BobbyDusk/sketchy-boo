import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  integrations: [svelte()],
  sitemap: true,
  site: "https://sketchy.boo/",
  vite: {
    plugins: [tailwindcss()],
  },
});