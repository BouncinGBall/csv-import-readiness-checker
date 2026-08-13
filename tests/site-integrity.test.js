import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === '.git' || name === 'node_modules') return [];
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const htmlFiles = walk(root).filter((file) => extname(file).toLowerCase() === '.html');

test('enterprise AI release gate has explicit scope, price and boundaries', () => {
  const html = readFileSync(resolve(root, 'ai-release-gate.html'), 'utf8');
  assert.match(html, /49 000 ₽/);
  assert.match(html, /90 000 ₽/);
  assert.match(html, /от 150 000 ₽/);
  assert.match(html, /до 500 результатов/i);
  assert.match(html, /Не входит/);
  assert.match(html, /production-данными/i);
  assert.match(html, /письменный scope/i);
});

test('enterprise AI page exposes a verifiable synthetic evidence pack before the packages', () => {
  const html = readFileSync(resolve(root, 'ai-release-gate.html'), 'utf8');
  const evidencePosition = html.indexOf('id="evidence-demo"');
  const packagesPosition = html.indexOf('id="packages"');
  assert.ok(evidencePosition > 0, 'missing prominent evidence demo section');
  assert.ok(evidencePosition < packagesPosition, 'evidence should appear before pricing packages');
  assert.match(html, /href="\.\/downloads\/AI_Assistant_Evaluation_Pack_Demo\.xlsx" download/);
  assert.match(html, /собственный синтетический пример/i);
  assert.match(html, /не клиентский кейс/i);
});

test('enterprise AI page has a working contact-form contract and email fallback', () => {
  const html = readFileSync(resolve(root, 'ai-release-gate.html'), 'utf8');
  assert.match(html, /<form[^>]+id="release-request-form"[^>]+action="https:\/\/docs\.google\.com\/forms\/d\/e\/[^"/]+\/formResponse"[^>]+method="post"[^>]+target="request-form-target"/);
  assert.match(html, /name="entry\.1690196027"[^>]+type="email"[^>]+required/);
  assert.match(html, /name="entry\.764456503"[^>]+required/);
  assert.match(html, /id="company-site"[^>]+name="website"/);
  assert.match(html, /role="status"[^>]+aria-live="polite"/);
  assert.match(html, /<iframe[^>]+name="request-form-target"[^>]+hidden/);
  assert.match(html, /target\?\.addEventListener\('load'/);
  assert.doesNotMatch(html, /formsubmit\.co/i);
  assert.equal((html.match(/mailto:uria198816@gmail\.com/g) || []).length, 1);
});

function localReferences(html) {
  return [...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((value) => !value.includes('${'))
    .filter((value) => !/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value));
}

test('all local links, assets and fragment targets resolve', () => {
  for (const htmlFile of htmlFiles) {
    const html = readFileSync(htmlFile, 'utf8');
    for (const reference of localReferences(html)) {
      const [pathname, fragment] = reference.split('#', 2);
      const target = pathname ? resolve(dirname(htmlFile), decodeURIComponent(pathname.split('?')[0])) : htmlFile;
      assert.ok(existsSync(target), `${relative(root, htmlFile)} points to missing ${reference}`);

      if (fragment) {
        assert.equal(extname(target).toLowerCase(), '.html', `${reference} has a fragment on a non-HTML file`);
        const targetHtml = readFileSync(target, 'utf8');
        const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        assert.match(targetHtml, new RegExp(`\\bid=["']${escaped}["']`), `${reference} points to a missing id`);
      }
    }
  }
});

test('downloadable binary assets have the expected file signatures', () => {
  for (const file of walk(root)) {
    const extension = extname(file).toLowerCase();
    if (extension === '.xlsx') {
      const signature = readFileSync(file).subarray(0, 4).toString('hex');
      assert.equal(signature, '504b0304', `${relative(root, file)} is not an XLSX ZIP package`);
    }
    if (extension === '.png') {
      const signature = readFileSync(file).subarray(0, 8).toString('hex');
      assert.equal(signature, '89504e470d0a1a0a', `${relative(root, file)} is not a PNG file`);
    }
  }
});
