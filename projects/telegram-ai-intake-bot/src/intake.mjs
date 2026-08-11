const MAX_TEXT = 1500;

export const STEPS = Object.freeze([
  { key: "company", prompt: "Как называется компания или проект?" },
  { key: "process", prompt: "Какой ручной процесс нужно автоматизировать? Опишите в 1-3 предложениях." },
  { key: "input", prompt: "Что поступает на вход: таблицы, письма, документы, API или другое? Не отправляйте персональные и секретные данные." },
  { key: "output", prompt: "Какой проверяемый результат должен получиться?" },
  { key: "volume", prompt: "Какой примерный объём: строк, документов, обращений или операций в неделю?" },
  { key: "deadline", prompt: "Когда нужен первый рабочий результат?" },
  { key: "budget", prompt: "Какой ориентир бюджета на фиксированный пилот? Можно написать «нужна оценка»." },
  { key: "acceptance", prompt: "По каким 1-3 критериям вы примете пилот?" },
]);

export function newSession(chatId, now = new Date()) {
  return {
    chatId: String(chatId),
    status: "collecting",
    step: 0,
    answers: {},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function sanitizeText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, MAX_TEXT);
}

export function redactLikelySecrets(value) {
  const text = sanitizeText(value);
  const patterns = [
    /\b(?:sk|rk|pk)-[a-z0-9_-]{16,}\b/gi,
    /\b\d{16,19}\b/g,
    /\b(?:password|пароль|token|токен|api[_ -]?key)\s*[:=]\s*\S+/gi,
  ];
  return patterns.reduce((result, pattern) => result.replace(pattern, "[REDACTED]"), text);
}

export function summarize(session) {
  const lines = STEPS.map(({ key, prompt }, index) => {
    const label = prompt.split(":")[0].replace(/\?$/, "");
    return `${index + 1}. ${label}: ${session.answers[key] || "-"}`;
  });
  return ["Заявка на async-пилот", ...lines].join("\n");
}

export function handleMessage(session, rawText, now = new Date()) {
  const text = sanitizeText(rawText);
  const command = text.toLowerCase().split(/\s+/)[0];

  if (command === "/cancel") {
    return { session: null, replies: ["Черновик удалён. Чтобы начать заново, отправьте /new."] };
  }
  if (command === "/new" || command === "/start") {
    const fresh = newSession(session?.chatId ?? "unknown", now);
    return {
      session: fresh,
      replies: [
        "Соберу письменный scope для фиксированного пилота автоматизации. Созвон не нужен. Не присылайте пароли, токены, платёжные или персональные данные.",
        STEPS[0].prompt,
      ],
    };
  }
  if (command === "/status") {
    if (!session) return { session: null, replies: ["Активной заявки нет. Отправьте /new."] };
    return { session, replies: [`Заполнено ${session.step} из ${STEPS.length}.\n\n${summarize(session)}`] };
  }
  if (!session) return { session: null, replies: ["Отправьте /new, чтобы оформить заявку."] };
  if (!text) return { session, replies: ["Нужен текстовый ответ."] };
  if (session.status !== "collecting") return { session, replies: ["Заявка уже зафиксирована. Для новой отправьте /new."] };

  const safeText = redactLikelySecrets(text);
  if (safeText === "[REDACTED]") {
    return { session, replies: ["Похоже, сообщение содержит секрет. Я его не сохраняю. Опишите тип данных без значения."] };
  }

  const current = STEPS[session.step];
  const next = {
    ...session,
    answers: { ...session.answers, [current.key]: safeText },
    step: session.step + 1,
    updatedAt: now.toISOString(),
  };
  if (next.step < STEPS.length) return { session: next, replies: [STEPS[next.step].prompt] };

  next.status = "ready_for_review";
  next.completedAt = now.toISOString();
  return {
    session: next,
    replies: [
      `${summarize(next)}\n\nЗаявка сохранена. Следующий шаг - письменная оценка границ, срока и цены. Работа начинается только после согласования scope и безопасной оплаты.`,
    ],
    completed: true,
  };
}
