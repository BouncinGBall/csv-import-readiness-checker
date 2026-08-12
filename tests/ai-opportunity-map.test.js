import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(here, '..', 'ai-opportunity-map.html'), 'utf8');

test('opportunity map measures the current manual baseline', () => {
  assert.match(html, /Сколько времени съедает одна рутина/);
  assert.match(html, /cases \* minutes \* days \* people \/ 60/);
  assert.match(html, /ч ручной работы в месяц/);
});

test('opportunity map does not promise invented savings', () => {
  assert.match(html, /без обещаний выдуманной экономии/i);
  assert.match(html, /эффект нельзя честно назвать до пилота/i);
  assert.match(html, /может требовать решения сотрудника/i);
});

test('opportunity map routes to a plain-language free assessment', () => {
  assert.match(html, /Получить бесплатную карту AI-возможности/);
  assert.match(html, /Опишите рутину обычными словами/);
  assert.match(html, /portfolio\.html#contact/);
});
