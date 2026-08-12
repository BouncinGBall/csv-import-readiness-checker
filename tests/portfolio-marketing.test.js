import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const html = readFileSync(resolve(root, 'portfolio.html'), 'utf8');

test('portfolio opens with a plain-language AI outcome promise', () => {
  const h1 = [...html.matchAll(/<h1>([\s\S]*?)<\/h1>/g)];
  assert.equal(h1.length, 1);
  assert.match(h1[0][1], /одну рутину/i);
  assert.match(h1[0][1], /AI даст пользу/i);
  assert.match(html, /Не нужно знать модели, сервисы и термины/i);
  assert.doesNotMatch(html, /бесконечн[^<]{0,40}созвон/i);
});

test('portfolio answers price, timing, deliverable, and next step', () => {
  assert.match(html, /от 19 000 ₽/);
  assert.match(html, /от 49 000 ₽/);
  assert.match(html, /Карта возможности[^<]*<br>— 0 ₽/i);
  assert.match(html, /1 рабочего дня/);
  assert.match(html, /исходные файлы/i);
  assert.match(html, /Метрика до старта/i);
  assert.match(html, /Получить карту AI-возможности/);
});

test('portfolio mirrors four concrete buyer situations before presenting packages', () => {
  assert.match(html, /id="fit"/);
  assert.equal((html.match(/class="signal"/g) || []).length, 4);
  assert.match(html, /Письма и заявки/);
  assert.match(html, /Документы и таблицы/);
  assert.match(html, /Знания компании/);
  assert.match(html, /Отчёты руководителю/);
});

test('public proof remains specific and auditable', () => {
  assert.equal((html.match(/class="work-card/g) || []).length, 5);
  assert.match(html, /Оплаченный этап принят/);
  assert.match(html, /Безопасная сделка/);
  assert.match(html, /Материалы и персонаж заказчика не публикуются/);
  assert.match(html, /не разработку художественного стиля/i);
  assert.match(html, /24[\s\S]{0,80}автотеста/i);
  assert.match(html, /17 автотестов/i);
  assert.match(html, /7\/7 тестов/i);
  assert.match(html, /github\.com\/BouncinGBall\/csv-import-readiness-checker/);
});

test('search and sharing metadata are complete', () => {
  assert.match(html, /<title>С чего начать AI-внедрение в бизнесе — Data Pilot<\/title>/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /application\/ld\+json/);
  assert.ok(existsSync(resolve(root, 'projects', 'portfolio-og.png')));
});

test('brand is distinctive and immediately explained', () => {
  assert.match(html, /<strong>Data Pilot<\/strong><small>AI-внедрение для бизнеса<\/small>/);
});

test('conversion links converge on one clear contact block', () => {
  const contactLinks = html.match(/href="#contact"/g) || [];
  const directEmailLinks = html.match(/<a[^>]+href="mailto:uria198816@gmail\.com"/g) || [];
  assert.ok(contactLinks.length >= 6);
  assert.equal(directEmailLinks.length, 2);
  assert.match(html, /<section class="contact" id="contact">/);
  assert.match(html, /id="business-ai-request"/);
  assert.match(html, /id="request-product"[^>]+type="text"[^>]+placeholder="test\.ru или https:\/\/test\.ru"/);
  assert.doesNotMatch(html, /id="request-product"[^>]+type="url"/);
  assert.match(html, /docs\.google\.com\/forms/);
  assert.match(html, /что сейчас приходится делать вручную/i);
  assert.match(html, /сколько раз это повторяется и сколько времени занимает/i);
  assert.doesNotMatch(html, /brief\.html/);
});

test('portfolio is safe for non-technical AI-curious buyers', () => {
  assert.match(html, /Пора внедрять AI — но с чего начать/);
  assert.match(html, /первый шаг непонятен — это нормально/i);
  assert.match(html, /Разбираться в AI не нужно/);
  assert.match(html, /Если AI не нужен, так и напишем/);
  assert.match(html, /Человек в контуре/);
  assert.match(html, /обычная автоматизация или их сочетание/);
  assert.doesNotMatch(html, /гарантируем[^<]{0,80}(эконом|рост|прибыл)/i);
});
