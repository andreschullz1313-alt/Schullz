import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

function readAsDataUri(filePath: string, mimeType: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${buf.toString('base64')}`;
}

function escapeInlineScript(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script');
}

function escapeInlineStyle(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style');
}

function standaloneHtmlPlugin(): Plugin {
  const virtualId = 'virtual:pwa-register';
  const resolvedVirtualId = '\0' + virtualId;

  return {
    name: 'schullz-standalone-singlefile-html',
    enforce: 'post',
    resolveId(id) {
      if (id === virtualId) return resolvedVirtualId;
      return null;
    },
    load(id) {
      if (id === resolvedVirtualId) {
        return 'export function registerSW() { return async () => {}; }\n';
      }
      return null;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;

        let out = html;

        // Collect bundled CSS and JS assets
        const cssChunks: string[] = [];
        const jsChunks: string[] = [];

        for (const [fileName, item] of Object.entries(bundle)) {
          if (item.type === 'asset' && fileName.endsWith('.css')) {
            const source = typeof item.source === 'string' ? item.source : Buffer.from(item.source).toString('utf8');
            cssChunks.push(source);
            delete bundle[fileName];
          } else if (item.type === 'chunk' && fileName.endsWith('.js')) {
            jsChunks.push(item.code);
            delete bundle[fileName];
          }
        }

        // Remove external stylesheet and module script tags emitted by Vite
        out = out.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>\s*/gi, '');
        out = out.replace(/<script[^>]+src=["'][^"']+["'][^>]*><\/script>\s*/gi, '');
        out = out.replace(/<link[^>]+rel=["']modulepreload["'][^>]*>\s*/gi, '');

        // Inline public icons & favicon as data URIs so file:// works 100% standalone
        const rootDir = import.meta.dirname;
        const faviconData = readAsDataUri(path.resolve(rootDir, 'public/favicon.ico'), 'image/jpeg');
        const svgIconData = readAsDataUri(path.resolve(rootDir, 'public/icon.svg'), 'image/svg+xml');
        const appleTouchData = readAsDataUri(path.resolve(rootDir, 'public/apple-touch-icon.png'), 'image/png');

        if (appleTouchData) {
          out = out.replace(/href=["']\/apple-touch-icon\.png["']/g, () => `href="${appleTouchData}"`);
        }
        if (svgIconData) {
          out = out.replace(/href=["']\/icon\.svg["']/g, () => `href="${svgIconData}"`);
        }
        if (faviconData) {
          out = out.replace(/href=["']\/favicon\.ico["']/g, () => `href="${faviconData}"`);
        }

        // Inject combined CSS into </head>
        if (cssChunks.length > 0) {
          const styleTag = `<style>\n${escapeInlineStyle(cssChunks.join('\n'))}\n</style>\n  </head>`;
          out = out.replace('</head>', () => styleTag);
        }

        // Inject combined JS right before </body>
        if (jsChunks.length > 0) {
          const scriptTag = `<script>\n${escapeInlineScript(jsChunks.join('\n'))}\n</script>\n  </body>`;
          out = out.replace('</body>', () => scriptTag);
        }

        // Write complete standalone HTML to workspace root & dist/
        const rootTarget = path.resolve(rootDir, 'schullz-ink-tattoo-completo.html');
        fs.writeFileSync(rootTarget, out, 'utf8');

        const distDir = path.resolve(rootDir, 'dist');
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, {recursive: true});
        }
        const distTarget = path.resolve(distDir, 'schullz-ink-tattoo-completo.html');
        fs.writeFileSync(distTarget, out, 'utf8');

        return out;
      },
    },
    closeBundle() {
      const tmpOut = path.resolve(import.meta.dirname, 'dist-singlefile');
      if (fs.existsSync(tmpOut)) {
        fs.rmSync(tmpOut, {recursive: true, force: true});
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    standaloneHtmlPlugin(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  build: {
    outDir: 'dist-singlefile',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100 * 1024 * 1024,
    rollupOptions: {
      output: {
        format: 'iife',
      },
    },
  },
});
