import assert from "node:assert/strict";
import test from "node:test";
import { handleMessage, newSession, STEPS } from "../src/intake.mjs";

test("collects all fields and completes exactly once", () => {
  const now = new Date("2026-08-11T17:00:00Z");
  let session = newSession("42", now);
  const answers = ["Acme", "Сверка счетов", "PDF", "Таблица расхождений", "100 в неделю", "3 дня", "30 000 ₽", "95% полей и журнал ошибок"];
  let result;
  for (const answer of answers) {
    result = handleMessage(session, answer, now);
    session = result.session;
  }
  assert.equal(STEPS.length, answers.length);
  assert.equal(result.completed, true);
  assert.equal(session.status, "ready_for_review");
  assert.equal(session.answers.acceptance, answers.at(-1));
});

test("status does not mutate progress", () => {
  const session = { ...newSession("42"), step: 2, answers: { company: "Acme", process: "Сверка" } };
  const result = handleMessage(session, "/status");
  assert.deepEqual(result.session, session);
  assert.match(result.replies[0], /2 из 8/);
});

test("cancel removes the draft", () => {
  const result = handleMessage(newSession("42"), "/cancel");
  assert.equal(result.session, null);
});

test("likely secrets are redacted before storage", () => {
  const session = newSession("42");
  const syntheticSecret = ["pass", "word", "=", "super-secret"].join("");
  const result = handleMessage(session, syntheticSecret);
  assert.equal(result.session.step, 0);
  assert.equal(result.session.answers.company, undefined);
  assert.doesNotMatch(JSON.stringify(result.session), /super-secret/);
  assert.match(result.replies[0], /не сохраняю/);
});

test("control characters and oversized content are constrained", () => {
  const result = handleMessage(newSession("42"), `A\u0000${"x".repeat(2000)}`);
  assert.equal(result.session.answers.company.length, 1500);
  assert.doesNotMatch(result.session.answers.company, /\u0000/);
});
