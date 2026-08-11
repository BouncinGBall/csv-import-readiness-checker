import { handleMessage, newSession, summarize } from "./intake.mjs";

export class IntakeApp {
  constructor({ store, sender, adminChatId = "" }) {
    this.store = store;
    this.sender = sender;
    this.adminChatId = String(adminChatId || "");
  }

  async process(chatId, text, now = new Date()) {
    const key = String(chatId);
    let session = await this.store.get(key);
    if (!session && /^\/(?:start|new)\b/i.test(String(text))) session = newSession(key, now);
    const result = handleMessage(session, text, now);
    await this.store.set(key, result.session);
    for (const reply of result.replies) await this.sender(key, reply);
    if (result.completed) {
      await this.store.appendIntake(result.session);
      if (this.adminChatId && this.adminChatId !== key) {
        await this.sender(this.adminChatId, `Новая заявка ${key}\n\n${summarize(result.session)}`);
      }
    }
    return result;
  }
}
