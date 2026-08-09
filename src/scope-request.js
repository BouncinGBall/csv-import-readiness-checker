const PROFILE_COPY = {
  crm: {
    name: 'CRM-контакты',
    subject: 'Подготовка CSV/XLSX для CRM - письменный scope',
    targetLabel: 'Целевая CRM',
    entityLabel: 'Сущность (контакты, компании или сделки)',
    volumeLabel: 'Полный объём строк',
  },
  catalog: {
    name: 'Товарный каталог',
    subject: 'Подготовка товарного CSV/XLSX - письменный scope',
    targetLabel: 'Целевая CMS или маркетплейс',
    entityLabel: 'Тип каталога и варианты товаров',
    volumeLabel: 'Полный объём товаров',
  },
};

function resultSummary(result) {
  if (!result) return 'Мини-проверка: не запускалась.';

  return [
    `Мини-проверка: ${result.score}/100`,
    `строк: ${result.dataRows}`,
    `пустых ячеек: ${result.metrics.missingCells}`,
    `точных дублей строк: ${result.metrics.duplicateRows}`,
    `форматных проблем: ${result.metrics.formatIssues}`,
    `строк другой ширины: ${result.metrics.inconsistentRows}`,
  ].join(', ') + '.';
}

export function buildScopeRequest(profile, result = null) {
  const copy = PROFILE_COPY[profile];
  if (!copy) throw new Error('Unknown scope request profile.');

  const body = [
    'Здравствуйте!',
    '',
    'Хочу письменно согласовать подготовку одного CSV/XLSX.',
    `Профиль: ${copy.name}.`,
    resultSummary(result),
    '',
    `${copy.targetLabel}: `,
    `${copy.entityLabel}: `,
    `${copy.volumeLabel}: `,
    'Обязательные поля: ',
    'Правило дублей: ',
    '',
    'Ориентир: до 10 000 строк, 5 900 ₽, 24 часа после оплаты и согласования scope. Без созвона и доступа к CRM/CMS.',
    'В первом письме реальные клиентские и персональные данные не прикладываю.',
  ].join('\n');

  return {
    subject: copy.subject,
    body,
    mailto: `mailto:uria198816@gmail.com?subject=${encodeURIComponent(copy.subject)}&body=${encodeURIComponent(body)}`,
  };
}
