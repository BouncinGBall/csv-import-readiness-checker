import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const out = path.join(root, 'projects', 'web-concepts');
await fs.mkdir(out, { recursive: true });

const concepts = [
  ['atlas', 'atlas-ai.html'],
  ['nord', 'nord-estate.html'],
  ['lumen', 'lumen-finance.html'],
  ['forma', 'forma-interior.html'],
  ['volterra', 'volterra-energy.html'],
  ['medora', 'medora-clinic.html'],
  ['arden', 'arden-market.html'],
  ['orbit', 'orbit-ops.html'],
];

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });

for (const [slug, file] of concepts) {
  await page.goto(`http://127.0.0.1:9317/concepts/${file}`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(out, `${slug}-01-home.png`) });
  for (let slide = 2; slide <= 3; slide++) {
    await page.goto(`http://127.0.0.1:9317/concepts/desktop-showcase.html?c=${slug}&s=${slide}`, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(out, `${slug}-0${slide}.png`) });
  }
  await page.goto(`http://127.0.0.1:9317/concepts/mobile-showcase.html?c=${slug}`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(out, `${slug}-04-mobile.png`) });
}

await browser.close();
console.log(`Rendered ${concepts.length * 4} portfolio images to ${out}`);
