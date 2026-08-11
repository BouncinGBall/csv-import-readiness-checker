/**
 * AI Outreach Hub for Google Sheets.
 * Safety model: creates Gmail drafts only. It never sends email automatically.
 * Expected sheets: Leads, Activity Log, Rules, Templates.
 */

const HUB = Object.freeze({
  leadsSheet: 'Leads',
  activitySheet: 'Activity Log',
  rulesSheet: 'Rules',
  templatesSheet: 'Templates',
  headerRow: 5,
  maxDraftsPerRun: 8,
  coolingHours: 96,
  portfolioUrl: 'https://bouncingball.github.io/csv-import-readiness-checker/portfolio.html',
});

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AI Outreach Hub')
    .addItem('Validate selected lead', 'validateSelectedLead')
    .addItem('Create reviewed Gmail drafts', 'createDrafts')
    .addItem('Mark selected lead as sent', 'markSelectedLeadSent')
    .addItem('Refresh next actions', 'refreshNextActions')
    .addToUi();
}

function validateSelectedLead() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(HUB.leadsSheet);
  const row = sheet.getActiveRange().getRow();
  if (row <= HUB.headerRow) throw new Error('Select a lead row below the header.');
  const lead = readLead_(sheet, row);
  const issues = validateLead_(lead);
  SpreadsheetApp.getUi().alert(issues.length ? issues.join('\n') : 'Lead passes the current safety gate.');
}

function createDrafts() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(HUB.leadsSheet);
  const rowCount = Math.max(sheet.getLastRow() - HUB.headerRow, 0);
  if (!rowCount) {
    SpreadsheetApp.getUi().alert('No lead rows found.');
    return;
  }
  const values = sheet.getRange(HUB.headerRow + 1, 1, rowCount, 18).getValues();
  const seenDomains = new Set();
  let created = 0;

  values.forEach((row, index) => {
    if (created >= HUB.maxDraftsPerRun) return;
    const lead = rowToLead_(row, HUB.headerRow + 1 + index);
    if (lead.status !== 'DRAFT_READY') return;
    const issues = validateLead_(lead);
    const domain = domainFromEmail_(lead.email);
    if (domain && seenDomains.has(domain)) issues.push('Duplicate domain in this run.');
    if (issues.length) {
      appendActivity_(ss, lead, 'NOTE', 'Blocked', issues.join(' '));
      return;
    }

    const message = buildMessage_(lead);
    GmailApp.createDraft(lead.email, message.subject, message.body);
    if (domain) seenDomains.add(domain);
    created += 1;
    sheet.getRange(lead.row, 16).setValue('DRAFT_CREATED');
    sheet.getRange(lead.row, 17).clearContent();
    appendActivity_(ss, lead, 'DRAFTED', 'Draft created', message.subject);
  });

  SpreadsheetApp.getUi().alert(`${created} Gmail draft(s) created. Nothing was sent.`);
}

function markSelectedLeadSent() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(HUB.leadsSheet);
  const row = sheet.getActiveRange().getRow();
  if (row <= HUB.headerRow) throw new Error('Select a lead row below the header.');
  const lead = readLead_(sheet, row);
  if (lead.status !== 'DRAFT_CREATED') throw new Error('Only a DRAFT_CREATED lead can be marked SENT.');
  const nextAction = new Date(Date.now() + HUB.coolingHours * 60 * 60 * 1000);
  sheet.getRange(row, 16).setValue('SENT');
  sheet.getRange(row, 17).setValue(nextAction);
  appendActivity_(ss, lead, 'SENT', 'Recorded after manual send', `Next action after ${HUB.coolingHours} hours.`);
  SpreadsheetApp.getUi().alert('Lead marked SENT. Follow-up cooling period started.');
}

function refreshNextActions() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(HUB.leadsSheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= HUB.headerRow) return;
  const statuses = sheet.getRange(HUB.headerRow + 1, 16, lastRow - HUB.headerRow, 2).getValues();
  statuses.forEach((row, i) => {
    const [status, nextDate] = row;
    if (status === 'SENT' && !nextDate) {
      sheet.getRange(HUB.headerRow + 1 + i, 17).setValue(new Date(Date.now() + HUB.coolingHours * 60 * 60 * 1000));
    }
  });
}

function readLead_(sheet, row) {
  return rowToLead_(sheet.getRange(row, 1, 1, 18).getValues()[0], row);
}

function rowToLead_(row, sheetRow) {
  return {
    row: sheetRow,
    id: String(row[0] || '').trim(),
    company: String(row[1] || '').trim(),
    website: String(row[2] || '').trim(),
    name: String(row[3] || '').trim() || 'Коллеги',
    role: String(row[4] || '').trim(),
    email: String(row[5] || '').trim(),
    source: String(row[6] || '').trim(),
    process: String(row[7] || '').trim(),
    evidence: String(row[8] || '').trim(),
    offer: String(row[9] || '').trim(),
    scores: row.slice(10, 14).map(Number),
    price: Number(row[14] || 0),
    status: String(row[15] || '').trim(),
    nextAction: row[16],
    notes: String(row[17] || '').trim(),
  };
}

function validateLead_(lead) {
  const issues = [];
  if (!lead.company) issues.push('Company is required.');
  if (!/^https?:\/\//i.test(lead.source)) issues.push('Public source URL is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) issues.push('Valid public business email is required.');
  if (/^(gmail|mail|yandex|ya|outlook|hotmail)\./i.test(domainFromEmail_(lead.email))) issues.push('Use a clearly public business contact, not an unverified personal mailbox.');
  if (!lead.process || !lead.evidence || !lead.offer) issues.push('Process, evidence and pilot deliverable are required.');
  if (lead.scores.some(score => !Number.isFinite(score) || score < 0 || score > 5)) issues.push('All four scores must be between 0 and 5.');
  if (lead.scores.reduce((a, b) => a + b, 0) < 14) issues.push('Total score is below 14.');
  if (lead.price < 15000 || lead.price > 40000) issues.push('Pilot price must stay in the 15,000-40,000 RUB range.');
  if (/example\.(com|org|net)$/i.test(domainFromEmail_(lead.email))) issues.push('Synthetic demo rows must never be used for outreach.');
  return issues;
}

function buildMessage_(lead) {
  const subject = `Пилот автоматизации: ${lead.process}`;
  const body = [
    `${lead.name}, добрый день.`,
    '',
    `На ${lead.source} увидел, что ${lowerFirst_(lead.evidence)}.`,
    `Могу сделать фиксированный письменный пилот: ${lowerFirst_(lead.offer)}.`,
    `Срок - 3 рабочих дня после получения обезличенного примера. Стоимость - ${lead.price.toLocaleString('ru-RU')} ₽.`,
    '',
    'До старта письменно фиксируем входные данные, результат и критерии приёмки. Созвон не нужен.',
    `Примеры подхода: ${HUB.portfolioUrl}`,
    '',
    'Если актуально, пришлите один обезличенный пример входных данных.',
  ].join('\n');
  return { subject, body };
}

function appendActivity_(ss, lead, action, outcome, note) {
  ss.getSheetByName(HUB.activitySheet).appendRow([
    new Date(), lead.id, lead.company, action, 'Gmail', '', outcome, lead.nextAction || '', 'Hub', note,
  ]);
}

function domainFromEmail_(email) {
  return String(email).split('@')[1]?.toLowerCase() || '';
}

function lowerFirst_(text) {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}
