/**
 * Generate PWA maskable icons (192, 512 + maskable) from the brand clock.svg.
 * Uses Playwright's Chromium to rasterize SVG → PNG with a safe-zone padding.
 *
 * Usage: node scripts/gen-icons.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';

const SRC = readFileSync(new URL('../public/clock.svg', import.meta.url), 'utf8');
const OUT_DIR = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

/** Render an SVG string at a given pixel size (PNG buffer). */
async function rasterize(svg, px) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: px, height: px } });
  // Inject the SVG inline (page.setContent blocks external file:// loads), then
  // wrap it in a foreignObject on a canvas-sized svg and serialize to PNG via an
  // <img> created from an inline data URI (works because the inner content is already in-page).
  const html = `<!doctype html><html><body style="margin:0">
    <div id="stage" style="width:${px}px;height:${px}px">${svg}</div>
    <canvas id="c" width="${px}" height="${px}"></canvas>
    <script>
      const doRender = () => {
        const stage = document.getElementById('stage');
        const s = stage.querySelector('svg');
        s.setAttribute('width', '${px}');
        s.setAttribute('height', '${px}');
        const xml = new XMLSerializer().serializeToString(s);
        const img = new Image();
        img.onload = () => {
          const c = document.getElementById('c');
          const ctx = c.getContext('2d');
          ctx.clearRect(0, 0, ${px}, ${px});
          ctx.drawImage(img, 0, 0, ${px}, ${px});
          document.title = 'done';
        };
        img.onerror = () => { document.title = 'error'; };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
      };
      if (document.readyState === 'loading') addEventListener('DOMContentLoaded', doRender);
      else doRender();
    </script>
  </body></html>`;
  await page.setContent(html);
  await page.waitForFunction(() => document.title !== '');
  const done = await page.evaluate(() => document.title);
  if (done !== 'done') throw new Error('SVG load failed: ' + done);
  const img = await page.evaluate(() => {
    const c = document.getElementById('c');
    return c.toDataURL('image/png').split(',')[1];
  });
  await browser.close();
  return Buffer.from(img, 'base64');
}

/** Build an SVG with the icon scaled into the maskable safe zone (80% circle). */
function maskableSvg(base, px) {
  const pad = px * 0.1; // 10% safe margin each side
  const inner = px - pad * 2;
  // Wrap the base icon, scaled to inner box, centered on a solid background
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px} ${px}" width="${px}" height="${px}">
    <rect width="${px}" height="${px}" fill="#f8f9ff"/>
    <g transform="translate(${pad} ${pad}) scale(${inner / 32})">${base.replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
  </svg>`;
}

// Standard (any) + maskable versions at 192 & 512
for (const px of [192, 512]) {
  const std = await rasterize(SRC, px);
  writeFileSync(new URL(`../public/icons/icon-${px}.png`, import.meta.url), std);
  console.log(`icon-${px}.png (standard)  ${std.length} bytes`);

  const mask = await rasterize(maskableSvg(SRC, px), px);
  writeFileSync(new URL(`../public/icons/icon-${px}-maskable.png`, import.meta.url), mask);
  console.log(`icon-${px}-maskable.png  ${mask.length} bytes`);
}

console.log('Done.');