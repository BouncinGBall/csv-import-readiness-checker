export const MAX_ROWS = 50;
export const MAX_CHARACTERS = 200_000;

const DELIMITERS = [',', ';', '\t', '|'];
const DELIMITER_NAMES = {
  ',': 'comma',
  ';': 'semicolon',
  '\t': 'tab',
  '|': 'pipe',
};

function normalizeNewlines(value) {
  return value.replace(/\r\n?/g, '\n');
}

export function nonEmptyLines(value) {
  return normalizeNewlines(value)
    .split('\n')
    .filter((line) => line.trim() !== '');
}

export function parseLine(line, delimiter) {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }

  if (quoted) {
    throw new Error('An unmatched quote was found. Check the CSV formatting.');
  }

  cells.push(cell.trim());
  return cells;
}

function mode(values) {
  const frequencies = new Map();
  for (const value of values) {
    frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
  }

  let bestValue = null;
  let bestFrequency = -1;
  for (const [value, frequency] of frequencies) {
    if (frequency > bestFrequency || (frequency === bestFrequency && value > bestValue)) {
      bestValue = value;
      bestFrequency = frequency;
    }
  }
  return { value: bestValue, frequency: bestFrequency };
}

export function detectDelimiter(lines) {
  let best = null;
  let bestScore = -1;

  for (const delimiter of DELIMITERS) {
    try {
      const counts = lines.slice(0, 8).map((line) => parseLine(line, delimiter).length);
      const common = mode(counts);
      if (common.value < 2) continue;
      const score = common.frequency * 100 + common.value;
      if (score > bestScore) {
        best = delimiter;
        bestScore = score;
      }
    } catch {
      // Another delimiter may still parse the sample correctly.
    }
  }

  if (!best) {
    throw new Error('Could not detect columns. Use comma, semicolon, tab or pipe separators.');
  }
  return best;
}

function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function isEmailHeader(value) {
  return /^(email|e-mail|почта|элпочта|emailaddress)$/i.test(value.trim());
}

function isPhoneHeader(value) {
  return /^(phone|telephone|tel|mobile|телефон|тел|мобильный)$/i.test(value.trim());
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function validPhone(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function makeFinding(code, severity, message) {
  return { code, severity, message };
}

export function analyzeCsv(input, options = {}) {
  if (typeof input !== 'string') throw new TypeError('CSV input must be a string.');
  if (input.length > MAX_CHARACTERS) {
    throw new Error(`Use no more than ${MAX_CHARACTERS.toLocaleString('en-US')} characters.`);
  }

  const maxRows = options.maxRows ?? MAX_ROWS;
  const rawLines = normalizeNewlines(input).split('\n');
  const blankLines = rawLines.filter((line, index) => index > 0 && line.trim() === '').length;
  const lines = rawLines.filter((line) => line.trim() !== '');

  if (lines.length < 2) {
    throw new Error('Add a header row and at least one anonymized data row.');
  }

  const dataRows = lines.length - 1;
  if (dataRows > maxRows) {
    throw new Error(`Use no more than ${maxRows} data rows for this mini-check.`);
  }

  const delimiter = detectDelimiter(lines);
  const parsed = lines.map((line) => parseLine(line, delimiter));
  const headers = parsed[0];
  const rows = parsed.slice(1);
  const columns = headers.length;

  if (columns < 2) throw new Error('At least two columns are needed for a meaningful check.');

  const normalizedHeaders = headers.map(normalizeHeader);
  const emptyHeaders = normalizedHeaders.filter((header) => header === '').length;
  const duplicateHeaders = normalizedHeaders.filter(
    (header, index) => header && normalizedHeaders.indexOf(header) !== index,
  ).length;
  const inconsistentRows = rows.filter((row) => row.length !== columns).length;
  const emailIndexes = [];
  const phoneIndexes = [];

  headers.forEach((header, index) => {
    if (isEmailHeader(header)) emailIndexes.push(index);
    if (isPhoneHeader(header)) phoneIndexes.push(index);
  });

  let missingCells = 0;
  let emailIssues = 0;
  let phoneIssues = 0;
  let formulaLikeCells = 0;

  rows.forEach((row) => {
    for (let index = 0; index < columns; index += 1) {
      const value = row[index] ?? '';
      if (!value.trim()) missingCells += 1;
      if (!phoneIndexes.includes(index) && /^[=@]/.test(value.trim())) formulaLikeCells += 1;
    }

    emailIndexes.forEach((index) => {
      const value = row[index] ?? '';
      if (value && !validEmail(value)) emailIssues += 1;
    });
    phoneIndexes.forEach((index) => {
      const value = row[index] ?? '';
      if (value && !validPhone(value)) phoneIssues += 1;
    });
  });

  const rowKeys = rows.map((row) => row.map((value) => (value ?? '').trim().toLowerCase()).join('\u241f'));
  const seenRows = new Set();
  let duplicateRows = 0;
  rowKeys.forEach((key) => {
    if (seenRows.has(key)) duplicateRows += 1;
    else seenRows.add(key);
  });

  const formatIssues = emailIssues + phoneIssues;
  const possibleCells = Math.max(1, dataRows * columns);
  let score = 100;
  score -= Math.min(28, Math.round((missingCells / possibleCells) * 100));
  score -= Math.min(24, duplicateRows * 8);
  score -= Math.min(24, formatIssues * 6);
  score -= Math.min(20, inconsistentRows * 10);
  score -= Math.min(10, duplicateHeaders * 5);
  score -= Math.min(10, emptyHeaders * 5);
  score -= Math.min(10, formulaLikeCells * 5);
  score -= Math.min(5, blankLines);
  score = clamp(score, 0, 100);

  let verdict;
  if (score >= 85) verdict = 'structurally-close';
  else if (score >= 60) verdict = 'review';
  else verdict = 'cleanup';

  const findings = [makeFinding(
    'delimiter',
    'info',
    `Detected ${columns} columns with a ${DELIMITER_NAMES[delimiter]} separator.`,
  )];
  if (missingCells) findings.push(makeFinding('missing-cells', 'warning', `${missingCells} empty cell(s) found. Confirm which fields are required before import.`));
  if (duplicateRows) findings.push(makeFinding('duplicate-rows', 'warning', `${duplicateRows} repeated full row(s) found. Review exact duplicates instead of deleting them silently.`));
  if (emailIssues) findings.push(makeFinding('email-format', 'warning', `${emailIssues} email value(s) do not match a basic address format.`));
  if (phoneIssues) findings.push(makeFinding('phone-format', 'warning', `${phoneIssues} phone value(s) have fewer than 10 or more than 15 digits.`));
  if (inconsistentRows) findings.push(makeFinding('row-width', 'error', `${inconsistentRows} row(s) have a different number of columns than the header.`));
  if (duplicateHeaders) findings.push(makeFinding('duplicate-headers', 'warning', `${duplicateHeaders} repeated header name(s) found. CRM field mapping may be ambiguous.`));
  if (emptyHeaders) findings.push(makeFinding('empty-headers', 'error', `${emptyHeaders} column(s) have an empty header.`));
  if (formulaLikeCells) findings.push(makeFinding('formula-like', 'warning', `${formulaLikeCells} non-phone cell(s) start with '=' or '@'. Review them before opening the file in spreadsheet software.`));
  if (blankLines) findings.push(makeFinding('blank-lines', 'info', `${blankLines} blank line(s) found inside or after the data fragment.`));
  if (findings.length === 1) {
    findings.push(makeFinding('no-basic-issues', 'success', 'No basic structural issue was detected in this small sample. Full-file and business-rule validation are still required.'));
  }

  return {
    score,
    verdict,
    delimiter,
    delimiterName: DELIMITER_NAMES[delimiter],
    columns,
    dataRows,
    metrics: {
      missingCells,
      duplicateRows,
      emailIssues,
      phoneIssues,
      formatIssues,
      inconsistentRows,
      duplicateHeaders,
      emptyHeaders,
      formulaLikeCells,
      blankLines,
    },
    findings,
  };
}
