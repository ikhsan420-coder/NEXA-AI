// Generates every icon / splash asset from one SVG mark. Run: npm run assets:icons
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (...p) => path.join(root, ...p);

const DEFS = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#121733"/>
      <stop offset="1" stop-color="#080A10"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.25" cy="0.15" r="0.9">
      <stop offset="0" stop-color="#7C8CFF" stop-opacity="0.55"/>
      <stop offset="0.55" stop-color="#38BDF8" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#080A10" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#A5B4FF"/>
      <stop offset="1" stop-color="#38BDF8"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>`;

// The NEXA mark: a bold "N" with a four-point spark. Drawn in a 512x512 space.
const MARK = `
  <path d="M152 362 V150 L360 362 V150" fill="none" stroke="url(#stroke)" stroke-width="54" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M398 104 l11 29 29 11 -29 11 -11 29 -11 -29 -29 -11 29 -11z" fill="#ffffff" fill-opacity="0.95"/>`;

const BG = (radius) => `
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  <rect width="512" height="512" rx="${radius}" fill="url(#glow)"/>
  <rect x="1" y="1" width="510" height="255" rx="${radius}" fill="url(#sheen)"/>
  <rect x="1.5" y="1.5" width="509" height="509" rx="${radius}" fill="none" stroke="#fff" stroke-opacity="0.14" stroke-width="3"/>`;

function svg({ bg = true, radius = 116, scale = 1, extra = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${DEFS}${bg ? BG(radius) : ''}${extra}
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${MARK}</g></svg>`;
}

async function png(svgString, size, file) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svgString), { density: 384 }).resize(size, size).png().toFile(file);
  console.log('  wrote', path.relative(root, file));
}

await fs.mkdir(out('public/icons'), { recursive: true });
await fs.mkdir(out('assets'), { recursive: true });

// Web / PWA
await fs.writeFile(out('public/favicon.svg'), svg({ radius: 116 }));
await png(svg({ radius: 116 }), 192, out('public/icons/icon-192.png'));
await png(svg({ radius: 116 }), 512, out('public/icons/icon-512.png'));
await png(svg({ radius: 0, scale: 0.68 }), 512, out('public/icons/maskable-512.png'));
await png(svg({ radius: 0, scale: 0.82 }), 180, out('public/icons/apple-touch-icon.png'));

// Capacitor assets (@capacitor/assets expects these exact names in /assets)
await png(svg({ radius: 0, scale: 0.8 }), 1024, out('assets/icon-only.png'));
await png(svg({ bg: false, scale: 0.56 }), 1024, out('assets/icon-foreground.png'));
await png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${DEFS}<rect width="512" height="512" fill="url(#bg)"/><rect width="512" height="512" fill="url(#glow)"/></svg>`, 1024, out('assets/icon-background.png'));

// Splash: brand mark centred on the app background colour
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${DEFS}
  <rect width="512" height="512" fill="#080A10"/>
  <circle cx="256" cy="256" r="210" fill="url(#glow)" opacity="0.7"/>
  <g transform="translate(256 256) scale(0.34) translate(-256 -256)">
    <rect width="512" height="512" rx="116" fill="url(#bg)"/>
    <rect x="1.5" y="1.5" width="509" height="509" rx="116" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="3"/>
    ${MARK}
  </g></svg>`;
await png(splash, 2732, out('assets/splash.png'));
await png(splash, 2732, out('assets/splash-dark.png'));
console.log('Done.');
