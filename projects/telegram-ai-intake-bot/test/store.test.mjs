import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { JsonStore } from "../src/store.mjs";

test("store persists sessions and append-only completed intakes", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "intake-store-"));
  const store = new JsonStore(dir);
  const session = { chatId: "42", status: "collecting", answers: {} };
  await store.set("42", session);
  assert.deepEqual(await store.get("42"), session);
  await store.appendIntake(session);
  const lines = (await fs.readFile(path.join(dir, "intakes.ndjson"), "utf8")).trim().split("\n");
  assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0]).chatId, "42");
  await store.set("42", null);
  assert.equal(await store.get("42"), null);
});
