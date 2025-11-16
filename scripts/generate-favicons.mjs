import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const svgBuffer = readFileSync(join(rootDir, 'public', 'stashly-icon.svg'));

// Generate different sizes
const sizes = [16, 32, 180, 192, 512];

async function generateFavicons() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(rootDir, 'public', `favicon-${size}x${size}.png`));
    console.log(`Generated favicon-${size}x${size}.png`);
  }

  // Generate apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(rootDir, 'public', 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Generate ICO (using 32x32)
  const ico32 = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();

  writeFileSync(join(rootDir, 'public', 'favicon.ico'), ico32);
  console.log('Generated favicon.ico');
}

generateFavicons().catch(console.error);
