# Async AI Intake Bot

Deployable Telegram reference implementation for collecting a written scope for fixed-price AI automation pilots. It is a portfolio project, not a claimed client deployment.

## What it demonstrates

- an eight-step intake flow with `/new`, `/status` and `/cancel`;
- explicit input, output, volume, deadline, budget and acceptance criteria;
- no calls, voice notes, payment collection or work-start promises;
- secret-like value redaction and 1,500-character input limits;
- atomic JSON session storage and append-only completed intake records;
- optional administrator notification after a complete intake;
- dependency-free Node.js implementation and offline tests.

## Run locally without Telegram

```powershell
npm run mock
```

Type `/new`, answer the prompts, and inspect `data/intakes.ndjson`.

## Connect Telegram later

1. Create a bot through Telegram's official BotFather.
2. Copy `.env.example` to `.env` or set environment variables in the hosting service.
3. Set `TELEGRAM_BOT_TOKEN`; optionally set `ADMIN_CHAT_ID`.
4. Run `npm start` on Node.js 20+.

The token is read only from the environment and must never be committed. This repository has no hosting, production token or live customer data bundled with it.

## Test

```powershell
npm test
```
