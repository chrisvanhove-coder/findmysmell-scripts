import type { Locale } from './i18n';
import type { ArchetypeKey } from './archetype-colors';
import { ARCHETYPE_PALETTES } from './archetype-colors';
import { getArchetype } from './content';
import type { Match } from './matching';
import { cld } from '@/lib/cloudinary';

/**
 * Отправка письма с результатом через Brevo.
 *
 * Brevo выбран не по вкусу: он уже назван в политике приватности как
 * обработчик почты, с оговоркой про хранение внутри ЕС. Поменять
 * провайдера — значит править политику и вычитывать её заново.
 *
 * Ключ и отправитель приходят из переменных окружения. Если ключа нет,
 * отправка не происходит и НИЧЕГО НЕ ПАДАЕТ: адрес всё равно сохранён,
 * а вызывающий код узнаёт по результату, что письма не было, и говорит
 * человеку правду вместо «проверьте почту».
 */

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export type SendOutcome = 'sent' | 'not-configured' | 'failed';

interface Config {
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

function readConfig(): Config | null {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!apiKey || !senderEmail) return null;
  return {
    apiKey,
    senderEmail,
    senderName: process.env.BREVO_SENDER_NAME?.trim() || 'Find My Smell',
  };
}

/** Настроена ли отправка. Нужно, чтобы форма не обещала того, чего не будет. */
export function emailConfigured(): boolean {
  return readConfig() !== null;
}

export interface ResultEmail {
  email: string;
  locale: Locale;
  archetype: ArchetypeKey;
  /** Подобранный флакон. Может не прийти — тогда письмо только про архетип. */
  match: Match | null;
  /** Адрес сайта для ссылок в письме. */
  origin: string;
  /* Пропуск на страницу результата — id строки подписки. Без него ссылка
     из письма не откроется на устройстве, где человек квиз не проходил:
     результат закрыт (см. components/ResultGate.tsx). null — ссылка
     останется голой и сработает только там, где ответы уже есть. */
  pass?: string | null;
}

export async function sendResultEmail(input: ResultEmail): Promise<SendOutcome> {
  const config = readConfig();
  if (!config) return 'not-configured';

  const { subject, html, text } = buildResultEmail(input);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': config.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: config.senderName, email: config.senderEmail },
        to: [{ email: input.email }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
      // Письмо не должно держать ответ формы: человек ждёт.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // Тело ответа Brevo объясняет отказ (неподтверждённый отправитель,
      // просроченный ключ, лимит) — без него причину не найти.
      const body = await response.text().catch(() => '');
      console.error('brevo send failed', response.status, body.slice(0, 500));
      return 'failed';
    }
    return 'sent';
  } catch (error) {
    console.error('brevo send threw', error);
    return 'failed';
  }
}

// ─────────────────────────── шаблон письма ───────────────────────────

/**
 * Тексты письма.
 *
 * Заголовок — НЕ «You are …». Эту формулировку заказчик сняла со всех
 * страниц результата, и тащить её в письмо значило бы вернуть снятое
 * через другую дверь. Письмо повторяет нынешнюю структуру страницы:
 * «your scent dna» и главная фраза, потом текст, потом флакон.
 *
 * Тема письма поэтому ведётся парфюмом, а не архетипом.
 */
const COPY: Record<Locale, {
  subject: (perfume: string | null) => string;
  preheader: string;
  dna: string;
  yourScent: string;
  discover: string;
  ingredients: string;
  openResult: string;
  why: string;
  footer: string;
  privacy: string;
}> = {
  en: {
    subject: (perfume) => (perfume ? `Your scent: ${perfume}` : 'Your Find My Smell result'),
    preheader: 'Your scent DNA, your perfume, and the ingredients that chose you.',
    dna: 'your scent dna',
    yourScent: 'Your scent',
    discover: 'Discover it',
    ingredients: 'Ingredients worth discovering',
    openResult: 'Open your full result',
    why: 'You asked us to send your quiz result. This is that one email — nothing else follows.',
    footer: 'Find My Smell',
    privacy: 'Privacy',
  },
  fr: {
    subject: (perfume) => (perfume ? `Votre parfum : ${perfume}` : 'Votre résultat Find My Smell'),
    preheader: 'Votre ADN olfactif, votre parfum et les ingrédients qui vous ont choisi.',
    dna: 'votre adn olfactif',
    yourScent: 'Votre parfum',
    discover: 'Le découvrir',
    ingredients: 'Des ingrédients à découvrir',
    openResult: 'Voir votre résultat complet',
    why: 'Vous nous avez demandé de vous envoyer votre résultat. C’est cet unique e-mail — rien ne suivra.',
    footer: 'Find My Smell',
    privacy: 'Confidentialité',
  },
  ru: {
    subject: (perfume) => (perfume ? `Your scent: ${perfume}` : 'Your Find My Smell result'),
    preheader: 'Your scent DNA, your perfume, and the ingredients that chose you.',
    dna: 'your scent dna',
    yourScent: 'Your scent',
    discover: 'Discover it',
    ingredients: 'Ingredients worth discovering',
    openResult: 'Open your full result',
    why: 'You asked us to send your quiz result. This is that one email — nothing else follows.',
    footer: 'Find My Smell',
    privacy: 'Privacy',
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Собирает письмо. Разметка намеренно простая и со стилями в атрибутах:
 * почтовые клиенты выбрасывают внешний и часто вложенный CSS, поэтому
 * ничего сложнее таблиц и inline-стилей здесь быть не должно.
 */
export function buildResultEmail(input: ResultEmail): {
  subject: string;
  html: string;
  text: string;
} {
  const copy = COPY[input.locale];
  const a = getArchetype(input.locale, input.archetype);
  const palette = ARCHETYPE_PALETTES[input.archetype];
  const resultUrl = `${input.origin}/${input.locale}/result/${input.archetype.toLowerCase()}`
    + (input.pass ? `?r=${encodeURIComponent(input.pass)}` : '');
  const main = input.match?.main ?? null;

  // Первый абзац desc — главная фраза над диаграммой на странице,
  // а не начало текста. В письме она играет ту же роль.
  const [pullQuote, ...rest] = a.desc;
  const ingredientLines = a.ingredients.map((i) => `${i.name} — ${i.desc}`);

  const html = `<!doctype html>
<html lang="${input.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f2ec;">
<div style="display:none;font-size:1px;color:#f4f2ec;">${escapeHtml(copy.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">

  <tr><td style="background:${palette.brand};padding:40px 32px;text-align:center;color:#ffffff;">
    <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:.06em;text-transform:uppercase;line-height:1.1;">${escapeHtml(copy.dna)}</div>
    <div style="font-family:Georgia,serif;font-size:19px;line-height:1.45;font-weight:bold;margin-top:20px;">${escapeHtml(pullQuote ?? '')}</div>
  </td></tr>

  <tr><td style="padding:32px;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#2a2a2a;">
    ${rest.slice(0, 3).map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`).join('')}
  </td></tr>

  ${main ? `<tr><td style="background:${palette.stage};padding:32px;text-align:center;color:${palette.stageInk};">
    <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.6;">${escapeHtml(copy.yourScent)}</div>
    ${main.imageUrl ? `<img src="${escapeHtml(cld(main.imageUrl, 'bottleEmail'))}" alt="${escapeHtml(main.name)}" width="180" style="display:block;margin:20px auto;max-width:180px;height:auto;">` : ''}
    <div style="font-family:Georgia,serif;font-size:24px;line-height:1.2;">${escapeHtml(main.name)}</div>
    <div style="font-family:Georgia,serif;font-size:15px;line-height:1.6;margin-top:12px;opacity:.75;">${escapeHtml(main.description)}</div>
    ${main.shopUrl ? `<a href="${escapeHtml(main.shopUrl)}" style="display:inline-block;margin-top:22px;padding:14px 28px;border:1px solid ${palette.stageInk};color:${palette.stageInk};font-family:Georgia,serif;font-size:12px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;">${escapeHtml(copy.discover)}</a>` : ''}
  </td></tr>` : ''}

  <tr><td style="padding:32px;font-family:Georgia,serif;color:#2a2a2a;">
    <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.55;">${escapeHtml(copy.ingredients)}</div>
    <ul style="margin:14px 0 0;padding-left:18px;font-size:15px;line-height:1.7;">
      ${a.ingredients.map((i) => `<li style="margin-bottom:8px;"><strong>${escapeHtml(i.name)}</strong> — ${escapeHtml(i.desc)}</li>`).join('')}
    </ul>
  </td></tr>

  <tr><td style="padding:0 32px 32px;text-align:center;">
    <a href="${escapeHtml(resultUrl)}" style="font-family:Georgia,serif;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${palette.brand};">${escapeHtml(copy.openResult)}</a>
  </td></tr>

  <tr><td style="padding:22px 32px;background:#f4f2ec;font-family:Georgia,serif;font-size:12px;line-height:1.6;color:#6a6a6a;text-align:center;">
    <p style="margin:0 0 8px;">${escapeHtml(copy.why)}</p>
    <p style="margin:0;">${escapeHtml(copy.footer)} · <a href="${escapeHtml(input.origin)}/${input.locale}/privacy-policy" style="color:#6a6a6a;">${escapeHtml(copy.privacy)}</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  // Текстовая версия — не формальность: часть клиентов и почти все
  // спам-фильтры смотрят именно на неё.
  const text = [
    copy.dna.toUpperCase(),
    pullQuote ?? '',
    '',
    ...rest.slice(0, 3),
    '',
    ...(main
      ? [`${copy.yourScent}: ${main.name}`, main.description, main.shopUrl ? `${copy.discover}: ${main.shopUrl}` : '', '']
      : []),
    `${copy.ingredients}:`,
    ...ingredientLines,
    '',
    `${copy.openResult}: ${resultUrl}`,
    '',
    copy.why,
    copy.footer,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { subject: copy.subject(main?.name ?? null), html, text };
}
