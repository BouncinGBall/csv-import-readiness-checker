import assert from 'node:assert/strict';
import test from 'node:test';

import { buildScopeRequest } from '../src/scope-request.js';

const result = {
  score: 59,
  dataRows: 4,
  metrics: {
    missingCells: 1,
    duplicateRows: 0,
    formatIssues: 5,
    inconsistentRows: 0,
  },
};

test('CRM request carries only aggregate check results and qualification fields', () => {
  const request = buildScopeRequest('crm', result);
  assert.match(request.subject, /CRM/);
  assert.match(request.body, /59\/100/);
  assert.match(request.body, /Целевая CRM:/);
  assert.match(request.body, /Правило дублей:/);
  assert.match(request.body, /5 900 ₽/);
  assert.match(request.body, /Без созвона/);
  assert.ok(request.mailto.startsWith('mailto:uria198816@gmail.com?'));
  assert.ok(!request.body.includes('SKU-001'));
});

test('catalog request uses catalog-specific qualification wording', () => {
  const request = buildScopeRequest('catalog', result);
  assert.match(request.subject, /товарного CSV\/XLSX/);
  assert.match(request.body, /Целевая CMS или маркетплейс:/);
  assert.match(request.body, /Полный объём товаров:/);
});

test('request remains useful before a mini-check is run', () => {
  const request = buildScopeRequest('crm');
  assert.match(request.body, /Мини-проверка: не запускалась/);
});

test('unknown profiles are rejected', () => {
  assert.throws(() => buildScopeRequest('orders'), /unknown scope request profile/i);
});
