import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(here, '..', 'when-not-to-use-ai.html'), 'utf8');

test('anti-hype guide contains exactly seven decision cases', () => {
  assert.equal((html.match(/class="case"/g) || []).length, 7);
  assert.match(html, /7 случаев, когда вам не нужен AI/);
});

test('guide distinguishes AI from simpler and safer options', () => {
  assert.match(html, /формула, валидатор, скрипт или workflow/i);
  assert.match(html, /сначала стандартизировать/i);
  assert.match(html, /финальное действие подтверждает человек/i);
  assert.match(html, /синтетических или обезличенных примерах/i);
});

test('guide requires baseline and routes to the free map', () => {
  assert.match(html, /замерить текущий baseline/i);
  assert.match(html, /Получить карту — 0 ₽/);
  assert.match(html, /portfolio\.html#contact/);
});
