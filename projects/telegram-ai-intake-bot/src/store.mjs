import fs from "node:fs/promises";
import path from "node:path";

export class JsonStore {
  constructor(directory) {
    this.directory = path.resolve(directory);
    this.sessionsPath = path.join(this.directory, "sessions.json");
    this.intakesPath = path.join(this.directory, "intakes.ndjson");
  }

  async init() {
    await fs.mkdir(this.directory, { recursive: true });
    try { await fs.access(this.sessionsPath); }
    catch { await fs.writeFile(this.sessionsPath, "{}\n", { encoding: "utf8", flag: "wx" }).catch(() => {}); }
  }

  async readSessions() {
    await this.init();
    const raw = await fs.readFile(this.sessionsPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Invalid sessions store.");
    return parsed;
  }

  async get(chatId) {
    const sessions = await this.readSessions();
    return sessions[String(chatId)] ?? null;
  }

  async set(chatId, session) {
    const sessions = await this.readSessions();
    const key = String(chatId);
    if (session) sessions[key] = session;
    else delete sessions[key];
    const temp = `${this.sessionsPath}.${Date.now()}.tmp`;
    await fs.writeFile(temp, `${JSON.stringify(sessions, null, 2)}\n`, "utf8");
    await fs.rename(temp, this.sessionsPath);
  }

  async appendIntake(session) {
    await this.init();
    const record = { ...session, storedAt: new Date().toISOString() };
    await fs.appendFile(this.intakesPath, `${JSON.stringify(record)}\n`, "utf8");
  }
}
