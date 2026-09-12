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
import { sql } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import {
  parseSubmission,
  buildRecord,
  shouldPersist,
  parseSubscriber,
  PERSIST_WITHOUT_CONSENT,
} from '../src/lib/submission';
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
    check('при согласии прохождение пишется', shouldPersist(agreed.input));
    check(
      'при отказе не пишется',
      shouldPersist(refused.input) === PERSIST_WITHOUT_CONSENT,
      `PERSIST_WITHOUT_CONSENT=${PERSIST_WITHOUT_CONSENT}`,
    );

    const yes = buildRecord(agreed.input);
    check('при согласии ответы сохранены', Object.keys(yes.answers).length === 17);
    check('при согласии открытый текст сохранён', yes.openAnswer !== null);

    // Страховка на случай, если заказчик включит PERSIST_WITHOUT_CONSENT:
    // строка появится, но без самих ответов.
    const no = buildRecord(refused.input);
    check('при отказе ответы вычищены', Object.keys(no.answers).length === 0);
    check('при отказе открытый текст вычищен', no.openAnswer === null);
    check('при отказе результат всё равно посчитан', no.winner === yes.winner);
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

  const rows = await db.select().from(schema.submissions);
  check('всего строк 2', rows.length === 2, `есть ${rows.length}`);

  const stored = rows.find((r) => r.clientToken === 'token-1');
  check('локаль сохранена', stored?.locale === 'fr');
  check('победитель сохранён', stored?.winner === record.winner);
  check('согласие сохранено', stored?.consentResearch === true);
  check('ответы сохранены как jsonb',
    Object.keys((stored?.answers ?? {}) as Record<string, string>).length === 17);
  check('открытый текст сохранён', stored?.openAnswer === base().openAnswer);
  check('createdAt проставился сам', stored?.createdAt instanceof Date);

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
  }

  await client.close();
}

console.log(
  failures === 0
    ? '\nВсе проверки пройдены.\n'
    : `\nПРОВАЛЕНО проверок: ${failures}\n`,
);
process.exit(failures === 0 ? 0 : 1);
