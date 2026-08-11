import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const html = readFileSync(resolve(root, 'portfolio.html'), 'utf8');

test('portfolio opens with one concrete, outcome-led promise', () => {
  const h1 = [...html.matchAll(/<h1>([\s\S]*?)<\/h1>/g)];
  assert.equal(h1.length, 1);
  assert.match(h1[0][1], /ручной процесс/i);
  assert.match(h1[0][1], /автоматизац/i);
  assert.match(h1[0][1], /2–5 дней/i);
  assert.doesNotMatch(html, /бесконечн[^<]{0,40}созвон/i);
});

test('portfolio answers price, timing, deliverable, and next step', () => {
  assert.match(html, /от 15 000 ₽/);
  assert.match(html, /5 900 ₽/);
  assert.match(html, /1 рабочего дня/);
  assert.match(html, /исходники/i);
  assert.match(html, /критерии приёмки/i);
  assert.match(html, /Получить план и цену/);
});

test('public proof remains specific and auditable', () => {
  assert.equal((html.match(/class="work-card/g) || []).length, 4);
  assert.match(html, /24[\s\S]{0,80}автотеста/i);
  assert.match(html, /17 автотестов/i);
  assert.match(html, /7\/7 тестов/i);
  assert.match(html, /github\.com\/BouncinGBall\/csv-import-readiness-checker/);
});

test('search and sharing metadata are complete', () => {
  assert.match(html, /<title>AI-автоматизация ручных процессов — Data Pilot<\/title>/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /application\/ld\+json/);
  assert.ok(existsSync(resolve(root, 'projects', 'portfolio-og.png')));
});

test('conversion links use a qualified written brief', () => {
  const mailtoCount = (html.match(/mailto:uria198816@gmail\.com/g) || []).length;
  assert.ok(mailtoCount >= 8);
  assert.match(html, /Ручной%20процесс/);
  assert.match(html, /Желаемый%20результат/);
  assert.match(html, /Пример%20входных%20данных/);
});
