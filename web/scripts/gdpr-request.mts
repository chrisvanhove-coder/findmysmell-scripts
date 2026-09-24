/**
 * Запрос субъекта данных: показать и удалить то, что о человеке есть.
 *
 * ЗАЧЕМ. Политика обещает право на доступ и право на удаление
 * (privacy.en.json, раздел 8), но исполнять их было нечем: в админке
 * удаления нет, а лезть в прод-базу руками с DELETE — это способ однажды
 * удалить не то. Здесь запрос выполняется одной командой, по умолчанию
 * ничего не трогая.
 *
 *   npm run gdpr -- --email addr@example.com            # что есть
 *   npm run gdpr -- --email addr@example.com --erase --confirm
 *   npm run gdpr -- --browser-key <ключ>                # прохождения браузера
 *
 * ЧЕСТНО ПРО ГРАНИЦЫ. Адрес и прохождения в базе НЕ СВЯЗАНЫ: у подписчика
 * нет ссылки на прохождение, и это сделано нарочно — политика обещает, что
 * адрес хранится отдельно от ответов. Значит по адресу нельзя найти
 * прохождение, и наоборот. Скрипт это не обходит и не угадывает по времени:
 * подбирать «похожую по дате» строку и удалять её — значит с какой-то
 * вероятностью удалить чужую.
 *
 * Прохождение можно удалить по ключу браузера (`browser_key`), если человек
 * его назовёт. Сегодня узнать его человеку негде — панель согласия умеет
 * только «забыть этот браузер», не показывая ключ. Пока это так, удаление
 * прохождений по запросу невозможно, и в политике должно быть написано
 * именно это.
 */
import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from '../src/db/index.ts';

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
}
const ERASE = process.argv.includes('--erase');
const CONFIRM = process.argv.includes('--confirm');
const email = arg('email');
const browserKey = arg('browser-key');

if (!email && !browserKey) {
  console.error('Нужен --email или --browser-key. См. комментарий в начале файла.');
  process.exit(2);
}
if (ERASE && !CONFIRM) {
  console.error('Удаление необратимо: добавьте --confirm.');
  process.exit(2);
}

const db = getDb();

if (email) {
  const rows = await db.select({
    id: schema.subscribers.id,
    locale: schema.subscribers.locale,
    archetype: schema.subscribers.archetype,
    perfumeId: schema.subscribers.perfumeId,
    consentEmail: schema.subscribers.consentEmail,
    consentAt: schema.subscribers.consentAt,
    sentAt: schema.subscribers.sentAt,
    createdAt: schema.subscribers.createdAt,
  }).from(schema.subscribers).where(eq(schema.subscribers.email, email));

  console.log(`\nПодписка на «${email}»: ${rows.length === 0 ? 'нет такой' : 'найдена'}`);
  for (const r of rows) {
    /* Печатаем всё, что о нём хранится, — это и есть право на доступ.
       Сам адрес не повторяем: он и так в команде, а логи Railway читает
       не только тот, кто запрос обрабатывает. */
    console.log(JSON.stringify(r, null, 2));
  }

  if (ERASE && rows.length > 0) {
    await db.delete(schema.subscribers).where(eq(schema.subscribers.email, email));
    console.log('Удалено. Отдельно удалите адрес в Brevo, если он туда попал.');
  }

  console.log('\nПрохождения по адресу не ищутся: связи между ними нет (см. начало файла).');
}

if (browserKey) {
  const runs = await db.select({
    id: schema.submissions.id,
    createdAt: schema.submissions.createdAt,
    locale: schema.submissions.locale,
    winner: schema.submissions.winner,
    completed: schema.submissions.completed,
    consentResearch: schema.submissions.consentResearch,
    runIndex: schema.submissions.runIndex,
    openAnswerChars: sql<number>`coalesce(length(${schema.submissions.openAnswer}), 0)`,
  }).from(schema.submissions).where(eq(schema.submissions.browserKey, browserKey));

  console.log(`\nПрохождений с этим ключом браузера: ${runs.length}`);
  for (const r of runs) console.log(JSON.stringify(r, null, 2));

  if (ERASE && runs.length > 0) {
    /* Тексты «Other» уходят каскадом: внешний ключ объявлен
       on delete cascade, проверять отдельно нечего. */
    await db.delete(schema.submissions).where(eq(schema.submissions.browserKey, browserKey));
    console.log('Удалено вместе с текстами «Other».');
  }

  console.log('\nСобытия воронки не трогаются: в них нет ключа браузера, только');
  console.log('токен одного прохождения, который живёт до конца вкладки.');
}

process.exit(0);
