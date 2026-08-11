const API_ROOT = "https://api.telegram.org";

export class TelegramClient {
  constructor(token, fetchImpl = globalThis.fetch) {
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required outside mock mode.");
    if (!fetchImpl) throw new Error("Fetch implementation is unavailable.");
    this.base = `${API_ROOT}/bot${token}`;
    this.fetch = fetchImpl;
  }

  async call(method, payload) {
    const response = await this.fetch(`${this.base}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(`Telegram ${method} failed: ${body.description || response.status}`);
    return body.result;
  }

  getUpdates(offset, timeout = 25) {
    return this.call("getUpdates", { offset, timeout, allowed_updates: ["message"] });
  }

  sendMessage(chatId, text) {
    return this.call("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
  }
}
