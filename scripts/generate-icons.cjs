const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const svgPath = path.resolve(__dirname, '../public/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve(__dirname, '../public/pwa-192x192.png'));
  console.log('Generated pwa-192x192.png');

  // 2. 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve(__dirname, '../public/pwa-512x512.png'));
  console.log('Generated pwa-512x512.png');

  // 3. 512x512 Maskable PNG (with 10% padding for safe zone)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 2, g: 6, b: 23, alpha: 1 } // #020617
    })
    .png()
    .toFile(path.resolve(__dirname, '../public/pwa-maskable-512x512.png'));
  console.log('Generated pwa-maskable-512x512.png');

  // 4. Apple Touch Icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.resolve(__dirname, '../public/apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 5. Favicon 64x64
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.resolve(__dirname, '../public/favicon.png'));
  console.log('Generated favicon.png');
}

generateIcons().catch(console.error);
