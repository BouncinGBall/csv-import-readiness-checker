import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const assets = path.join(root, 'assets');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });

for (const size of [1024, 256, 64]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.goto(new URL(`file:///${path.join(assets, 'foxbox-avatar.svg').replaceAll('\\', '/')}`).href, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(assets, `foxbox-avatar-${size}.png`) });
  await page.close();
}

await browser.close();
await fs.copyFile(path.join(assets, 'foxbox-avatar-1024.png'), path.join(assets, 'foxbox-avatar.png'));
console.log('Rendered Fox Box avatar at 1024, 256 and 64 px');
