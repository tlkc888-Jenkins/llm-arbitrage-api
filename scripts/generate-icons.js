#!/usr/bin/env node
/**
 * Generate PWA icons for AutropicAI Admin
 * Creates simple gradient icons with "A" letter
 */

const fs = require('fs');
const path = require('path');

// Simple SVG icon template
function createSvgIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
        font-family="-apple-system, BlinkMacSystemFont, sans-serif" 
        font-size="${size * 0.5}" font-weight="700" fill="white">A</text>
</svg>`;
}

// Write icons
const publicDir = path.join(__dirname, '..', 'public');

// We can't generate PNGs without canvas/sharp, so use SVG with PNG extension
// Most browsers handle this fine for PWAs
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), createSvgIcon(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), createSvgIcon(512));

console.log('SVG icons generated. For production PNGs, convert these SVGs.');
