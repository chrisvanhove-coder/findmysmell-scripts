/**
 * Проверка приёма прохождений и подписки.
 *
 * Запуск:  cd web && npm run check:submissions
 *
 * Postgres поднимается в самом процессе через pglite, поэтому ни Railway,
 * ни локальная база не нужны. Проверяются две вещи:
 *
 *   1. Чистая логика из src/lib/submission.ts — разбор, пересчёт баллов,
 *      политика согласия.
 *   2. Реальная схема и реальные запросы drizzle на настоящем Postgres:
 *      применяются те же миграции из drizzle/, что поедут в прод, и та же
 *      таблица, что использует route handler.
 *
 * Не покрыто: HTTP-обвязка в src/app/api/*\/route.ts — это ~15 строк
 * разбора JSON и раскладки кодов ответа поверх проверенной здесь логики.
 * Её проверяет сквозной прогон e2e/funnel.mjs.
 */

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { sql, eq, isNull } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import {
  parseSubmission, buildRecord, parseSubscriber, buildQuestionOpenRows,
} from '../src/lib/submission';
import { emailConfigured, sendResultEmail, buildResultEmail } from '../src/lib/email';
import { match } from '../src/lib/matching';
import { resolve } from '../src/lib/scoring';

let failures = 0;

function check(label: string, condition: boolean, detail = '') {
  const mark = condition ? '✓' : '✗';
  if (!condition) failures += 1;
  console.log(`  ${mark} ${label}${detail ? `  — ${detail}` : ''}`);
}

/** Ответы полного прохождения: хватает, чтобы получить архетип. */
const ANSWERS = {
  Q_GENDER: 'Q_GENDER__WOMAN',
  Q_REGION_NOW: 'France',
  Q_GENERATION: 'Q_GENERATION__1990S',
  Q_DAYTDAY: 'Q_DAYTDAY__CALM',
  Q_STAYWELL: 'Q_STAYWELL__LONG',
  Q_ATMOS: 'Q_ATMOS__COSY',
  Q_YOURSELF: 'Q_YOURSELF__SOFT',
  Q_EMO: 'Q_EMO__COZY',
  Q_COZY: 'Q_COZY__BLANKET',
  Q_ENV_CHILD: 'Q_ENV_CHILD__CITY',
  Q_REGION_CHILD: 'France',
  Q_CELEBRATE: 'Q_CELEBRATE__CAKE',
  Q_CALM_NOW: 'Q_CALM_NOW__TEA',
  Q_SWEET: 'Q_SWEET__MODER_SW',
  Q_WILD: 'Q_WILD__LITTLE_WILD',
  Q_SKIN_BEHAVIOR: 'Q_SKIN_BEHAVIOR__SWEETER',
  Q_RADIUS: 'Q_RADIUS__SOFT',
};

function base(extra: Record<string, unknown> = {}) {
  return {
    locale: 'fr',
    answers: ANSWERS,
    openAnswer: 'smells like my grandmother kitchen',
    consentResearch: true,
    clientToken: 'token-1',
    ...extra,
  };
}

/* ------------------------------ 1. разбор ------------------------------ */

console.log('\nРазбор и проверка входа');
{
  check('полное прохождение принимается', parseSubmission(base()).ok);

  const cases: Array<[string, unknown]> = [
    ['не объект', 'nope'],
    ['неизвестная локаль', base({ locale: 'de' })],
    ['пустые ответы', base({ answers: {} })],
    ['ответ не строка', base({ answers: { ...ANSWERS, Q_GENDER: 7 } })],
    ['согласие не boolean', base({ consentResearch: 'yes' })],
    ['без clientToken', base({ clientToken: '' })],
    ['квиз не дошёл до конца', base({ answers: { Q_GENDER: 'Q_GENDER__WOMAN' } })],
    ['слишком длинный открытый ответ', base({ openAnswer: 'x'.repeat(2001) })],
    ['слишком много ответов', base({
      answers: Object.fromEntries(
        Array.from({ length: 41 }, (_, i) => [`Q_${i}`, 'x']).concat([['Q_RADIUS', 'x']]),
      ),
    })],
  ];

  for (const [label, body] of cases) {
    const parsed = parseSubmission(body);
    check(`отклоняется: ${label}`, !parsed.ok, parsed.ok ? '' : parsed.error);
  }
}

/* --------------------- 2. пересчёт баллов на сервере --------------------- */

console.log('\nБаллы считаются на сервере, а не принимаются от клиента');
{
  // Прод принимал winner и scores готовыми от клиента. Здесь они
  // пересчитываются, поэтому подделать результат нельзя.
  const tampered = parseSubmission(
    base({ winner: 'CEO', scores: { CEO: 999 } } as Record<string, unknown>),
  );
  if (!tampered.ok) {
    check('подделанный вход разобрался', false);
  } else {
    const record = buildRecord(tampered.input);
    const honest = resolve(ANSWERS);
    check('присланный winner проигнорирован', record.winner === honest.winner,
      `winner=${record.winner}`);
    check('присланные scores проигнорированы',
      JSON.stringify(record.scores) === JSON.stringify(honest.scores));
    check('баллы совпадают с resolve()', record.scores[honest.winner] === honest.scores[honest.winner]);
  }
}

/* ------------------------- 3. политика согласия ------------------------- */

console.log('\nСогласие на исследование');
{
  const agreed = parseSubmission(base({ consentResearch: true }));
  const refused = parseSubmission(base({ consentResearch: false }));
  if (!agreed.ok || !refused.ok) {
    check('оба варианта разобрались', false);
  } else {
    // Как в проде: отказ ничего не отменяет, он только фиксируется флагом.
    const yes = buildRecord(agreed.input);
    const no = buildRecord(refused.input);

    check('при согласии флаг true', yes.consentResearch === true);
    check('при отказе флаг false', no.consentResearch === false);

    check('при согласии ответы сохранены', Object.keys(yes.answers).length === 17);
    check('при отказе ответы тоже сохранены', Object.keys(no.answers).length === 17);

    check('при согласии открытый текст сохранён', yes.openAnswer !== null);
    check('при отказе открытый текст тоже сохранён', no.openAnswer === yes.openAnswer);

    check('результат одинаковый в обоих случаях', no.winner === yes.winner);
    check('баллы одинаковые в обоих случаях',
      JSON.stringify(no.scores) === JSON.stringify(yes.scores));
  }
}

/* ------------------- 3.1 ключ браузера и номер прохода ------------------- */

console.log('\nПовторные прохождения: ключ браузера и номер прохода');
{
  const KEY = 'a'.repeat(32);

  // Пара живёт или целиком, или никак. Один ключ без номера бесполезен:
  // он говорит «это тот же браузер» и молчит о том, какой это по счёту
  // проход, а номер без ключа не с чем сопоставить.
  const pair = parseSubmission(base({ browserKey: KEY, runIndex: 2 }));
  check('пара ключ+номер принимается', pair.ok);
  if (pair.ok) {
    const r = buildRecord(pair.input);
    check('ключ доехал до записи', r.browserKey === KEY);
    check('номер прохода доехал до записи', r.runIndex === 2);
  }

  // Каждый из этих входов должен дать пустую пару, а не отказ: без
  // хранилища (приватный режим) прохождение обязано уехать всё равно.
  const dropped: Array<[string, Record<string, unknown>]> = [
    ['без ключа и номера', {}],
    ['только ключ', { browserKey: KEY }],
    ['только номер', { runIndex: 3 }],
    ['ключ не строка', { browserKey: 42, runIndex: 1 }],
    ['пустой ключ', { browserKey: '', runIndex: 1 }],
    ['ключ длиннее 64', { browserKey: 'x'.repeat(65), runIndex: 1 }],
    ['номер нулевой', { browserKey: KEY, runIndex: 0 }],
    ['номер отрицательный', { browserKey: KEY, runIndex: -5 }],
    ['номер дробный', { browserKey: KEY, runIndex: 1.5 }],
    ['номер строкой', { browserKey: KEY, runIndex: '2' }],
    ['номер за потолком', { browserKey: KEY, runIndex: 10_001 }],
  ];

  for (const [label, extra] of dropped) {
    const parsed = parseSubmission(base(extra));
    if (!parsed.ok) {
      check(`${label}: прохождение всё равно принято`, false, parsed.error);
      continue;
    }
    const r = buildRecord(parsed.input);
    check(`${label} → пара пустая, прохождение записано`,
      r.browserKey === null && r.runIndex === null,
      `key=${r.browserKey} index=${r.runIndex}`);
  }

  // Потолок — ровно 64 и ровно 10000, границы включительно.
  const edge = parseSubmission(base({ browserKey: 'x'.repeat(64), runIndex: 10_000 }));
  check('граничные значения принимаются',
    edge.ok && buildRecord(edge.input).runIndex === 10_000);

  // Ключ не должен влиять ни на результат, ни на согласие.
  const plain = parseSubmission(base());
  if (pair.ok && plain.ok) {
    check('ключ не меняет архетип',
      buildRecord(pair.input).winner === buildRecord(plain.input).winner);
  }
}

/* ----------------------- 4. база: схема и запись ----------------------- */

console.log('\nЗапись в Postgres (pglite, миграции из drizzle/)');
{
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  check('миграции применились', true);

  const parsed = parseSubmission(base());
  if (!parsed.ok) throw new Error('неожиданно: базовый вход не разобрался');
  const record = buildRecord(parsed.input);

  const first = await db
    .insert(schema.submissions)
    .values(record)
    .onConflictDoNothing({ target: schema.submissions.clientToken })
    .returning({ id: schema.submissions.id });
  check('прохождение записалось', first.length === 1);

  // Повтор того же прохождения — потерянный флаг quiz_sent, перезагрузка.
  const again = await db
    .insert(schema.submissions)
    .values(record)
    .onConflictDoNothing({ target: schema.submissions.clientToken })
    .returning({ id: schema.submissions.id });
  check('повтор с тем же токеном не создал второй строки', again.length === 0);

  // Новое прохождение в том же браузере — новый токен, новая строка.
  const second = await db
    .insert(schema.submissions)
    .values({ ...record, clientToken: 'token-2' })
    .onConflictDoNothing({ target: schema.submissions.clientToken })
    .returning({ id: schema.submissions.id });
  check('новый токен создаёт новую строку', second.length === 1);

  // Прохождение с отказом от исследования: пишется так же, флаг false.
  const refusedParsed = parseSubmission(base({ consentResearch: false, clientToken: 'token-3' }));
  if (!refusedParsed.ok) throw new Error('неожиданно: отказ не разобрался');
  const refusedRows = await db
    .insert(schema.submissions)
    .values(buildRecord(refusedParsed.input))
    .onConflictDoNothing({ target: schema.submissions.clientToken })
    .returning({ id: schema.submissions.id });
  check('прохождение с отказом записалось', refusedRows.length === 1);

  const rows = await db.select().from(schema.submissions);
  check('всего строк 3', rows.length === 3, `есть ${rows.length}`);

  const refusedStored = rows.find((r) => r.clientToken === 'token-3');
  check('у отказа флаг false в базе', refusedStored?.consentResearch === false);
  check('у отказа ответы лежат в базе',
    Object.keys((refusedStored?.answers ?? {}) as Record<string, string>).length === 17);
  check('у отказа открытый текст лежит в базе',
    refusedStored?.openAnswer === base().openAnswer);
  check('у отказа победитель посчитан', refusedStored?.winner === record.winner);

  const stored = rows.find((r) => r.clientToken === 'token-1');
  check('локаль сохранена', stored?.locale === 'fr');
  check('победитель сохранён', stored?.winner === record.winner);
  check('согласие сохранено', stored?.consentResearch === true);
  check('ответы сохранены как jsonb',
    Object.keys((stored?.answers ?? {}) as Record<string, string>).length === 17);
  check('открытый текст сохранён', stored?.openAnswer === base().openAnswer);
  check('createdAt проставился сам', stored?.createdAt instanceof Date);

  /* ------------------- повторы в реальной таблице ------------------- */
  // То же, что проверяет e2e/repeat-runs.mjs в браузере, но здесь на
  // настоящей схеме: два прохода одного браузера должны лежать двумя
  // строками с одним ключом и номерами 1 и 2, а выборка для
  // исследования — это run_index = 1.
  const KEY = 'browser-key-for-db-test';
  for (const i of [1, 2, 3]) {
    const p = parseSubmission(base({ clientToken: `repeat-${i}`, browserKey: KEY, runIndex: i }));
    if (!p.ok) throw new Error(`неожиданно: проход ${i} не разобрался`);
    await db.insert(schema.submissions).values(buildRecord(p.input));
  }

  const runs = await db
    .select({ runIndex: schema.submissions.runIndex })
    .from(schema.submissions)
    .where(eq(schema.submissions.browserKey, KEY))
    .orderBy(schema.submissions.runIndex);
  check('три прохода одного браузера легли тремя строками', runs.length === 3,
    `есть ${runs.length}`);
  check('номера прохождений 1, 2, 3',
    runs.map((r) => r.runIndex).join(',') === '1,2,3', runs.map((r) => r.runIndex).join(','));

  const firstRuns = await db
    .select({ id: schema.submissions.id })
    .from(schema.submissions)
    .where(eq(schema.submissions.runIndex, 1));
  check('выборка run_index = 1 отсекает повторы', firstRuns.length === 1,
    `есть ${firstRuns.length}`);

  const noKey = await db
    .select({ id: schema.submissions.id })
    .from(schema.submissions)
    .where(isNull(schema.submissions.browserKey));
  check('прохождения без ключа тоже в таблице', noKey.length === 3, `есть ${noKey.length}`);

  /* --------------- «Other» внутри вопросов, своим полем --------------- */
  /* На живом сайте эти тексты писались в то же поле, что и финальный
     открытый вопрос, и одно затирало другое. Здесь проверяется, что у
     одного прохождения их может лежать несколько, что второй раз то же
     самое не удваивается, и что они уходят вместе с прохождением —
     иначе ежедневная очистка по срокам оставила бы их в базе. */
  console.log('\n«Other» внутри вопросов');
  {
    const p = parseSubmission(base({
      clientToken: 'token-opens',
      questionOpens: {
        Q_CALM: 'cold linen on a window',
        Q_CELEBRATE: 'mandarins and cold stairwell',
      },
    }));
    if (!p.ok) throw new Error(`неожиданно: прохождение с «Other» не разобралось: ${p.error}`);

    const [run] = await db
      .insert(schema.submissions)
      .values(buildRecord(p.input))
      .returning({ id: schema.submissions.id });

    const rowsToWrite = buildQuestionOpenRows(run.id, p.input.questionOpens);
    check('строк для базы столько же, сколько текстов', rowsToWrite.length === 2,
      String(rowsToWrite.length));
    await db.insert(schema.questionOpenAnswers).values(rowsToWrite);

    const written = await db
      .select()
      .from(schema.questionOpenAnswers)
      .where(eq(schema.questionOpenAnswers.submissionId, run.id));
    check('два текста у одного прохождения лежат рядом', written.length === 2,
      String(written.length));
    check('и каждый под своим вопросом',
      written.find((r) => r.questionId === 'Q_CALM')?.text === 'cold linen on a window'
      && written.find((r) => r.questionId === 'Q_CELEBRATE')?.text
        === 'mandarins and cold stairwell',
      JSON.stringify(written.map((r) => [r.questionId, r.text])));

    // Повторная отправка того же прохождения не должна удваивать текст.
    await db
      .insert(schema.questionOpenAnswers)
      .values(rowsToWrite)
      .onConflictDoNothing();
    const afterRetry = await db
      .select()
      .from(schema.questionOpenAnswers)
      .where(eq(schema.questionOpenAnswers.submissionId, run.id));
    check('повтор не удвоил тексты', afterRetry.length === 2, String(afterRetry.length));

    // Удаление прохождения обязано уносить тексты: ежедневная очистка по
    // срокам хранения удаляет строки submissions, и без cascade самые
    // личные ответы остались бы в базе навсегда.
    await db.delete(schema.submissions).where(eq(schema.submissions.id, run.id));
    const orphans = await db
      .select()
      .from(schema.questionOpenAnswers)
      .where(eq(schema.questionOpenAnswers.submissionId, run.id));
    check('тексты ушли вместе с прохождением', orphans.length === 0, String(orphans.length));
  }

  /* ---------------------------- подписка ---------------------------- */

  console.log('\nПодписка на письмо');
  check('без согласия на письмо не принимается',
    !parseSubscriber({ email: 'a@b.co', locale: 'fr', archetype: 'CEO' }).ok);
  check('битый адрес не принимается',
    !parseSubscriber({ email: 'not-an-email', locale: 'fr', consentEmail: true }).ok);
  check('неизвестный архетип не принимается',
    !parseSubscriber({ email: 'a@b.co', locale: 'fr', archetype: 'NOPE', consentEmail: true }).ok);

  const sub = parseSubscriber({
    email: '  Person@Example.COM ',
    locale: 'fr',
    archetype: 'ceo',
    consentEmail: true,
  });
  check('корректная подписка принимается', sub.ok);
  if (sub.ok) {
    check('адрес приведён к нижнему регистру и обрезан',
      sub.input.email === 'person@example.com', sub.input.email);
    check('архетип нормализован', sub.input.archetype === 'CEO');

    await db.insert(schema.subscribers).values(sub.input);

    // Тот же адрес повторно — обновление, а не падение на уникальном индексе.
    await db
      .insert(schema.subscribers)
      .values({ ...sub.input, locale: 'en', archetype: 'HUG' })
      .onConflictDoUpdate({
        target: schema.subscribers.email,
        set: { locale: sql`excluded.locale`, archetype: sql`excluded.archetype` },
      });

    const subs = await db.select().from(schema.subscribers);
    check('подписчик один, а не два', subs.length === 1, `есть ${subs.length}`);
    check('повторная подписка обновила архетип', subs[0]?.archetype === 'HUG');
    check('повторная подписка обновила локаль', subs[0]?.locale === 'en');

    // Согласие должно быть доказуемо: раньше оно проверялось на входе
    // и нигде не сохранялось.
    check('согласие на письмо записано', subs[0]?.consentEmail === true);
    check('время согласия записано', subs[0]?.consentAt instanceof Date);
    check('письмо ещё не отмечено отправленным', subs[0]?.sentAt === null);
  }

  /* ------------------------ флакон для письма ------------------------ */
  console.log('\nПодобранный флакон в подписке');
  {
    const withPerfume = parseSubscriber({
      email: 'bottle@example.com', locale: 'en', archetype: 'CEO',
      consentEmail: true, perfumeId: 'abc-123',
    });
    check('флакон принимается', withPerfume.ok && withPerfume.input.perfumeId === 'abc-123');

    const without = parseSubscriber({
      email: 'nobottle@example.com', locale: 'en', archetype: 'CEO', consentEmail: true,
    });
    check('без флакона тоже принимается', without.ok && without.input.perfumeId === null);

    const tooLong = parseSubscriber({
      email: 'x@example.com', locale: 'en', archetype: 'CEO',
      consentEmail: true, perfumeId: 'x'.repeat(65),
    });
    check('слишком длинный id отклоняется', !tooLong.ok);

    const wrongType = parseSubscriber({
      email: 'x@example.com', locale: 'en', archetype: 'CEO',
      consentEmail: true, perfumeId: 42,
    });
    check('id не строкой отклоняется', !wrongType.ok);
  }

  /* --------------------------- письмо --------------------------- */
  // Сеть Brevo из песочницы закрыта, поэтому проверяется то, что от неё
  // не зависит: что без ключа отправки нет, и что письмо собирается
  // цельным — с архетипом, флаконом, ингредиентами и ссылками.
  console.log('\nПисьмо с результатом');
  {
    delete process.env.BREVO_API_KEY;
    check('без ключа отправка выключена', emailConfigured() === false);

    const outcome = await sendResultEmail({
      email: 'person@example.com', locale: 'en', archetype: 'CEO',
      match: null, origin: 'https://example.com',
    });
    check('без ключа письмо не отправляется и не падает', outcome === 'not-configured');

    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_SENDER_EMAIL = 'contact@findmysmell.com';
    check('с ключом отправка включается', emailConfigured() === true);
    delete process.env.BREVO_API_KEY;

    const picked = match('CEO', { sweet: 1, raw: 1, projection: 2 });
    const built = buildResultEmail({
      email: 'person@example.com', locale: 'en', archetype: 'CEO',
      match: picked, origin: 'https://example.com',
    });

    check('тема письма ведётся парфюмом, а не снятой фразой «You are»',
      built.subject.startsWith('Your scent:') && !built.subject.includes('You are'),
      built.subject);
    check('в письме нет снятого «You are …»',
      !built.html.includes('You are') && !built.text.includes('You are'));
    check('в письме назван подобранный флакон',
      picked !== null && built.html.includes(picked.main.name), picked?.main.name);
    check('в письме есть ингредиенты', built.html.includes('Ingredients worth discovering'));
    check('в письме есть ссылка на результат',
      built.html.includes('https://example.com/en/result/ceo'));
    check('в письме есть ссылка на политику',
      built.html.includes('https://example.com/en/privacy-policy'));
    check('обещание «одно письмо» в тексте',
      built.text.includes('nothing else follows'));
    check('есть текстовая версия', built.text.length > 200, `${built.text.length} символов`);
    check('стили только inline, без внешнего CSS',
      !built.html.includes('<link') && !built.html.includes('@media'));

    const fr = buildResultEmail({
      email: 'person@example.com', locale: 'fr', archetype: 'CEO',
      match: picked, origin: 'https://example.com',
    });
    check('французское письмо по-французски', fr.subject.startsWith('Votre parfum'), fr.subject);
    check('французская ссылка на политику',
      fr.html.includes('https://example.com/fr/privacy-policy'));

    // Без флакона письмо должно остаться цельным, а не сломаться.
    const noBottle = buildResultEmail({
      email: 'person@example.com', locale: 'en', archetype: 'CEO',
      match: null, origin: 'https://example.com',
    });
    check('без флакона письмо всё равно собирается',
      noBottle.html.length > 500 && noBottle.html.includes('Ingredients worth discovering'));
    check('без флакона тема нейтральная',
      noBottle.subject === 'Your Find My Smell result', noBottle.subject);

    // Разметка письма склеивается строками — экранирование обязательно.
    const escaped = buildResultEmail({
      email: 'person@example.com', locale: 'en', archetype: 'CEO',
      match: null, origin: 'https://example.com/"><script>x</script>',
    });
    check('адрес в ссылках экранирован', !escaped.html.includes('<script>'));
  }

  /* ------------------- запрос в Brevo: форма и адрес ------------------- */
  // api.brevo.com из песочницы закрыт, поэтому подменяем сам fetch:
  // проверяется то, что мы отправляем, а не то, что Brevo отвечает.
  console.log('\nЗапрос в Brevo');
  {
    const real = globalThis.fetch;
    let seen: { url: string; init: RequestInit } | null = null;

    process.env.BREVO_API_KEY = 'test-key-123';
    process.env.BREVO_SENDER_EMAIL = 'contact@findmysmell.com';
    process.env.BREVO_SENDER_NAME = 'Find My Smell';

    globalThis.fetch = (async (url: string, init: RequestInit) => {
      seen = { url: String(url), init };
      return new Response('{"messageId":"1"}', { status: 201 });
    }) as typeof fetch;

    const ok = await sendResultEmail({
      email: 'person@example.com', locale: 'en', archetype: 'CEO',
      match: match('CEO', { sweet: 1, raw: 1, projection: 2 }), origin: 'https://example.com',
    });
    check('успешный ответ трактуется как отправка', ok === 'sent');

    const sent = seen as { url: string; init: RequestInit } | null;
    check('адрес API верный', sent?.url === 'https://api.brevo.com/v3/smtp/email', sent?.url);
    const headers = (sent?.init.headers ?? {}) as Record<string, string>;
    check('ключ уходит в заголовке api-key', headers['api-key'] === 'test-key-123');
    check('тип содержимого json', headers['content-type'] === 'application/json');

    const payload = JSON.parse(String(sent?.init.body ?? '{}'));
    check('отправитель из переменных',
      payload.sender?.email === 'contact@findmysmell.com' &&
      payload.sender?.name === 'Find My Smell');
    check('получатель один и тот, что просили',
      Array.isArray(payload.to) && payload.to.length === 1 &&
      payload.to[0].email === 'person@example.com');
    check('в запросе есть и html, и текст',
      typeof payload.htmlContent === 'string' && payload.htmlContent.length > 500 &&
      typeof payload.textContent === 'string' && payload.textContent.length > 200);
    check('тема не пустая', typeof payload.subject === 'string' && payload.subject.length > 0);

    // Отказ Brevo не должен ломать подписку — только сообщать о себе.
    globalThis.fetch = (async () =>
      new Response('{"message":"sender not verified"}', { status: 400 })) as typeof fetch;
    const rejected = await sendResultEmail({
      email: 'person@example.com', locale: 'en', archetype: 'CEO',
      match: null, origin: 'https://example.com',
    });
    check('отказ Brevo даёт failed, а не исключение', rejected === 'failed');

    // Сеть отвалилась — то же самое.
    globalThis.fetch = (async () => { throw new Error('network down'); }) as typeof fetch;
    const thrown = await sendResultEmail({
      email: 'person@example.com', locale: 'en', archetype: 'CEO',
      match: null, origin: 'https://example.com',
    });
    check('обрыв сети даёт failed, а не исключение', thrown === 'failed');

    globalThis.fetch = real;
    delete process.env.BREVO_API_KEY;
  }

  await client.close();
}

console.log(
  failures === 0
    ? '\nВсе проверки пройдены.\n'
    : `\nПРОВАЛЕНО проверок: ${failures}\n`,
);
process.exit(failures === 0 ? 0 : 1);
