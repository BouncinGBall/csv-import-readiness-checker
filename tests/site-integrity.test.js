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

function localReferences(html) {
  return [...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
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
