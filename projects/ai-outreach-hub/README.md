# AI Outreach Hub

Google Sheets-ready pipeline for targeted, evidence-backed AI implementation outreach.

## What it does

- qualifies leads using four visible 0-5 scores;
- requires a public source URL and an observed manual process;
- keeps the pipeline, next actions and activity log in one workbook;
- creates Gmail drafts only through Apps Script;
- keeps created drafts separate from actually sent messages;
- blocks synthetic demo rows, duplicate domains, low scores and unverified personal mailboxes;
- caps each run at eight drafts and enforces a 96-hour follow-up window.

## Setup

1. Import `AI_Outreach_Hub.xlsx` into Google Sheets.
2. Open Extensions > Apps Script.
3. Paste `OutreachHub.gs`, save and reload the sheet.
4. Replace the three synthetic example rows with independently researched businesses.
5. Review every generated Gmail draft before sending.
6. After manual send, select the row and use **Mark selected lead as sent**; only then does the 96-hour follow-up clock start.

## Non-goals

- no automatic sending;
- no bought or scraped contact lists;
- no personal-email guessing;
- no fabricated results or bulk outreach.

This is an internal reference implementation used to operate a small async AI-automation pipeline. It is not presented as a client deployment.
