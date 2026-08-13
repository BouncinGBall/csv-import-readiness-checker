import { chromium } from 'playwright';

const base = 'http://127.0.0.1:9317';
const pages = [
  '/portfolio.html',
  '/concepts/atlas-ai.html',
  '/concepts/nord-estate.html',
  '/concepts/lumen-finance.html',
  '/concepts/forma-interior.html',
  '/concepts/volterra-energy.html',
  '/concepts/medora-clinic.html',
  '/concepts/arden-market.html',
  '/concepts/orbit-ops.html',
];

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

for (const viewport of [{ width: 390, height: 844 }, { width: 1600, height: 1000 }]) {
  const page = await browser.newPage({ viewport });
  for (const path of pages) {
    const response = await page.goto(`${base}${path}`, { waitUntil: 'load' });
    if (!response?.ok()) throw new Error(`${path}: HTTP ${response?.status()}`);
    await page.evaluate(() => { for (const image of document.images) image.loading = 'eager'; });
    await page.waitForTimeout(350);
    const result = await page.evaluate(() => ({
      title: document.title,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      brokenImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
    }));
    if (!result.title.trim()) throw new Error(`${path}: empty title`);
    if (result.overflow > 1) throw new Error(`${path}: horizontal overflow ${result.overflow}px at ${viewport.width}px`);
    if (result.brokenImages.length) throw new Error(`${path}: broken images: ${result.brokenImages.join(', ')}`);
  }
  await page.close();
}

await browser.close();
console.log(`QA passed: ${pages.length} pages at desktop and mobile widths`);
