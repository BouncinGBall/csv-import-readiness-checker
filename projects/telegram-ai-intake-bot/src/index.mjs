import readline from "node:readline/promises";
import process from "node:process";
import { IntakeApp } from "./app.mjs";
import { JsonStore } from "./store.mjs";
import { TelegramClient } from "./telegram.mjs";

const mock = process.argv.includes("--mock");
const store = new JsonStore(process.env.DATA_DIR || "./data");
await store.init();

if (mock) {
  const chatId = "mock-user";
  const app = new IntakeApp({ store, sender: async (_id, text) => console.log(`\nBOT> ${text}`) });
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("Mock mode. Type /new to begin, /status to inspect, /cancel to delete the draft, or exit.");
  while (true) {
    const text = await terminal.question("\nYOU> ");
    if (text.trim().toLowerCase() === "exit") break;
    await app.process(chatId, text);
  }
  terminal.close();
} else {
  const client = new TelegramClient(process.env.TELEGRAM_BOT_TOKEN);
  const app = new IntakeApp({
    store,
    sender: (chatId, text) => client.sendMessage(chatId, text),
    adminChatId: process.env.ADMIN_CHAT_ID,
  });
  let offset = 0;
  const timeout = Math.max(5, Math.min(50, Number(process.env.POLL_TIMEOUT_SECONDS || 25)));
  console.log("Telegram polling started.");
  while (true) {
    try {
      const updates = await client.getUpdates(offset, timeout);
      for (const update of updates) {
        offset = Math.max(offset, update.update_id + 1);
        const message = update.message;
        if (!message?.chat?.id || typeof message.text !== "string") continue;
        await app.process(message.chat.id, message.text);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
}
