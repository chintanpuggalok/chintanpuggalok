import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://chintanpuggalok.com",
  output: "static",
  integrations: [react(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: "github-dark-default",
    },
  },
  vite: {
    define: {
      __PORTFOLIO_API_URL__: JSON.stringify(
        process.env.PUBLIC_API_URL ??
          "https://chintan-portfolio-api.chintanpuggalok.workers.dev",
      ),
    },
  },
});
