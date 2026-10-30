import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/** Inlines the entry stylesheet into index.html at build time, so the first paint doesn't wait for a CSS request. */
function inlineEntryCss(): Plugin {
  return {
    name: 'sugbo:inline-entry-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        return html.replace(/<link rel="stylesheet"[^>]*href="\/(assets\/[^"]+\.css)"[^>]*>/g, (tag, file: string) => {
          const asset = bundle[file];
          return asset?.type === 'asset' ? `<style>${String(asset.source)}</style>` : tag;
        });
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), inlineEntryCss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { proxy: { '/api': 'http://localhost:4000' } },
});
