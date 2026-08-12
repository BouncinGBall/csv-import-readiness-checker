import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeWebsiteUrl } from '../src/website-url.js';

test('accepts a bare domain and adds HTTPS for submission', () => {
  assert.equal(normalizeWebsiteUrl('test.ru'), 'https://test.ru/');
});

test('preserves a complete HTTP or HTTPS URL', () => {
  assert.equal(normalizeWebsiteUrl('https://example.ru/path'), 'https://example.ru/path');
  assert.equal(normalizeWebsiteUrl('http://example.ru'), 'http://example.ru/');
});

test('rejects malformed and non-web addresses', () => {
  assert.equal(normalizeWebsiteUrl('not a website'), null);
  assert.equal(normalizeWebsiteUrl('ftp://example.ru'), null);
  assert.equal(normalizeWebsiteUrl('https://user:secret@example.ru'), null);
});
