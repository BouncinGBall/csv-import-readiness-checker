import assert from "node:assert/strict";
import test from "node:test";
import { IntakeApp } from "../src/app.mjs";
import { STEPS } from "../src/intake.mjs";

function memoryStore() {
  const sessions = new Map();
  const intakes = [];
  return {
    intakes,
    get: async id => sessions.get(id) ?? null,
    set: async (id, value) => value ? sessions.set(id, value) : sessions.delete(id),
    appendIntake: async value => intakes.push(value),
  };
}

test("app sends prompts, stores one intake and notifies configured admin", async () => {
  const store = memoryStore();
  const sent = [];
  const app = new IntakeApp({ store, sender: async (id, text) => sent.push({ id, text }), adminChatId: "admin" });
  await app.process("client", "/new");
  for (let i = 0; i < STEPS.length; i += 1) await app.process("client", `answer-${i}`);
  assert.equal(store.intakes.length, 1);
  assert.ok(sent.some(item => item.id === "admin" && item.text.includes("Новая заявка")));
});
