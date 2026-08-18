import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const html = readFileSync(resolve(root, 'portfolio.html'), 'utf8');
const notFoundHtml = readFileSync(resolve(root, '404.html'), 'utf8');
const languageScript = readFileSync(resolve(root, 'src', 'site-language.js'), 'utf8');

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
  assert.equal((html.match(/class="work-card/g) || []).length, 8);
  assert.match(html, /Оплаченный этап принят/);
  assert.match(html, /Безопасная сделка/);
  assert.match(html, /Материалы и персонаж заказчика не публикуются/);
  assert.match(html, /не разработку художественного стиля/i);
  assert.match(html, /30[\s\S]{0,80}автотестов/i);
  assert.match(html, /17 автотестов/i);
  assert.match(html, /7\/7 тестов/i);
  assert.match(html, /baseline 9\/9 PASS/i);
  assert.match(html, /recovery 9\/9 PASS/i);
  assert.match(html, /6\/6 unit-тестов/i);
  assert.match(html, /контролируемый локальный process proof, не клиентский кейс/i);
  assert.match(html, /href="\.\/docker-swarm-proof\.html"/);
  assert.match(html, /id="listing-bot"/);
  assert.match(html, /Fox Box Listing Bot/);
  assert.match(html, /Пилот до 20 карточек: 5 900 ₽ и 2 рабочих дня/);
  assert.match(html, /Подлинность товара, просмотры и продажи не обещаются/);
  assert.match(html, /без входа в аккаунт/);
  assert.match(html, /href="\.\/listing-bot-proof\.html"/);
  assert.match(html, /id="wordpress-proof"/);
  assert.match(html, /WordPress Performance Lab/);
  assert.match(html, /3 прогона на режим/);
  assert.match(html, /raw JSON опубликован/);
  assert.match(html, /не клиентский кейс и не гарантия конкретного результата/i);
  assert.match(html, /href="\.\/wordpress-proof\.html"/);
  assert.doesNotMatch(html, /github\.com\/BouncinGBall\/csv-import-readiness-checker/);
  assert.match(html, /href="\.\/">Запустить инструмент/);
});

test('WordPress process proof is public, bounded and auditable', () => {
  const proof = readFileSync(resolve(root, 'wordpress-proof.html'), 'utf8');
  assert.match(proof, /Контролируемый WordPress benchmark/);
  assert.match(proof, /не клиентский кейс/i);
  assert.match(proof, /не гарантия конкретного PageSpeed/i);
  assert.match(proof, /1804 &gt; 1316 ms|1804 > 1316 ms/);
  assert.match(proof, /1816 &gt; 1300 ms|1816 > 1300 ms/);
  assert.match(proof, /comparison\.json/);
  assert.match(proof, /before\.json/);
  assert.match(proof, /after\.json/);
  assert.ok(existsSync(resolve(root, 'projects', 'wordpress-proof', 'before-desktop.png')));
  assert.ok(existsSync(resolve(root, 'projects', 'wordpress-proof', 'after-desktop.png')));
  assert.ok(existsSync(resolve(root, 'projects', 'wordpress-proof', 'before-mobile.png')));
  assert.ok(existsSync(resolve(root, 'projects', 'wordpress-proof', 'after-mobile.png')));
  assert.ok(existsSync(resolve(root, 'projects', 'wordpress-proof', 'comparison.json')));
});

test('Listing Bot proof is explicit, synthetic and reproducible', () => {
  const proof = readFileSync(resolve(root, 'listing-bot-proof.html'), 'utf8');
  assert.match(proof, /Synthetic process proof/);
  assert.match(proof, /все исходные данные и изображения синтетические/i);
  assert.match(proof, /не клиентский кейс/i);
  assert.match(proof, /не подтверждает подлинность товара, реальные просмотры, продажи/i);
  assert.match(proof, /production-source-manifest\.json/);
  assert.match(proof, /SHA256SUMS\.txt/);
  assert.match(proof, /listing-package\.zip/);
});

test('legacy portfolio links with a trailing dot recover safely', () => {
  assert.match(notFoundHtml, /\/portfolio\.html\./);
  assert.match(notFoundHtml, /pathname\.slice\(0, -1\)/);
  assert.match(notFoundHtml, /location\.replace/);
  assert.match(notFoundHtml, /href="\.\/portfolio\.html"/);
});

test('portfolio presents the multi-screen web concept collection honestly', () => {
  assert.match(html, /id="web-concepts"/);
  assert.equal((html.match(/class="concept-card"/g) || []).length, 8);
  assert.equal((html.match(/-01-home-en\.png/g) || []).length, 8);
  assert.equal((html.match(/data-ru-src=/g) || []).length, 8);
  assert.match(html, /собственные концепт-проекты, а не работы для вымышленных клиентов/i);
  assert.match(html, /concepts\/atlas-ai\.html/);
  assert.match(html, /concepts\/orbit-ops\.html/);
});

test('search and sharing metadata are complete', () => {
  assert.match(html, /<title>AI Automation & Full-Stack Delivery — Fox Box<\/title>/);
  assert.match(html, /<script src="\.\/src\/site-language\.js" defer><\/script>/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /application\/ld\+json/);
  assert.ok(existsSync(resolve(root, 'projects', 'portfolio-og.png')));
});

test('mobile language switch stays in the header instead of covering page actions', () => {
  assert.match(languageScript, /\.foxbox-language\.floating\{position:relative/);
  assert.doesNotMatch(languageScript, /\.foxbox-language\.floating\{position:fixed/);
  assert.match(languageScript, /\.topbar \.foxbox-language\{position:static/);
  assert.doesNotMatch(languageScript, /\.topbar \.foxbox-language\{position:(?:fixed|absolute)/s);
});

test('brand is distinctive and immediately explained', () => {
  assert.match(html, /<strong>Fox Box<\/strong><small>сайты · AI · автоматизация<\/small>/);
  assert.match(html, /assets\/foxbox-mark\.svg/);
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
