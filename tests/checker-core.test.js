import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_ROWS,
  analyzeCsv,
  detectDelimiter,
  nonEmptyLines,
  parseLine,
} from '../src/checker-core.js';

test('parseLine handles quoted delimiters and escaped quotes', () => {
  assert.deepEqual(
    parseLine('Sample,"Acme, Inc.","said ""hello"""', ','),
    ['Sample', 'Acme, Inc.', 'said "hello"'],
  );
});

test('parseLine rejects an unmatched quote', () => {
  assert.throws(() => parseLine('name,"broken', ','), /unmatched quote/i);
});

test('detectDelimiter recognizes semicolon and tab files', () => {
  assert.equal(detectDelimiter(['name;email', 'A;a@example.com']), ';');
  assert.equal(detectDelimiter(['name\temail', 'A\ta@example.com']), '\t');
});

test('nonEmptyLines normalizes Windows newlines', () => {
  assert.deepEqual(nonEmptyLines('a,b\r\n1,2\r\n\r\n'), ['a,b', '1,2']);
});

test('analyzeCsv reports the synthetic sample deterministically', () => {
  const sample = [
    'name,email,phone,company',
    'Sample Alpha,alpha@example.com,+7 999 111-22-33,Example LLC',
    'Sample Beta,beta.example.com,8 (999) 222-33-44,Example LLC',
    'Sample Gamma,gamma@example.com,,Demo Inc',
    'Sample Alpha,alpha@example.com,+7 999 111-22-33,Example LLC',
    'Sample Delta,delta@example.com,123,Demo Inc',
  ].join('\n');

  const result = analyzeCsv(sample);
  assert.equal(result.dataRows, 5);
  assert.equal(result.columns, 4);
  assert.equal(result.delimiter, ',');
  assert.equal(result.metrics.missingCells, 1);
  assert.equal(result.metrics.duplicateRows, 1);
  assert.equal(result.metrics.emailIssues, 1);
  assert.equal(result.metrics.phoneIssues, 1);
  assert.equal(result.metrics.formulaLikeCells, 0);
  assert.equal(result.verdict, 'review');
});

test('analyzeCsv reports inconsistent widths and duplicate headers', () => {
  const result = analyzeCsv('Name, name ,email\nA,B,a@example.com\nC,c@example.com');
  assert.equal(result.metrics.duplicateHeaders, 1);
  assert.equal(result.metrics.inconsistentRows, 1);
  assert.equal(result.metrics.missingCells, 1);
});

test('formula-like detection excludes international phone prefixes', () => {
  const result = analyzeCsv('name,phone,note\nA,+79991112233,=IMPORTXML(A1)\nB,89991112233,@external');
  assert.equal(result.metrics.formulaLikeCells, 2);
  assert.equal(result.metrics.phoneIssues, 0);
});

test('analyzeCsv enforces the public row limit', () => {
  const lines = ['name,email'];
  for (let index = 0; index < MAX_ROWS + 1; index += 1) {
    lines.push(`Sample ${index},sample${index}@example.com`);
  }
  assert.throws(() => analyzeCsv(lines.join('\n')), /no more than 50 data rows/i);
});

test('analyzeCsv rejects one-column and header-only inputs', () => {
  assert.throws(() => analyzeCsv('name\nSample'), /detect columns/i);
  assert.throws(() => analyzeCsv('name,email'), /header row and at least one/i);
});
