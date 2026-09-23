/**
 * Отчёт по подписчикам и прохождениям. Только SELECT, ничего не меняет.
 *
 * ЗАЧЕМ. Перед первой рассылкой надо знать, кто в базе: сколько адресов
 * пришло со старой таблицы (им старый сайт уже писал, см. комментарий к
 * `sent_at` в src/db/schema.ts), сколько собрал новый сайт, и запускался
 * ли вообще импорт таблицы. Ответ на это раньше можно было получить
 * только руками из psql.
 *
 * ПОЧЕМУ .mjs, А НЕ .mts КАК ОСТАЛЬНЫЕ ОТЧЁТЫ. Его запускают не только
 * локально, но и внутри Railway — рядом с миграциями, где нет ни tsx, ни
 * dev-зависимостей. Ровно та же причина, что у scripts/migrate.mjs.
 *
 * ПОЧЕМУ ЗДЕСЬ НЕТ НИ ОДНОГО АДРЕСА. Вывод уходит в логи деплоя, а логи —
 * не место для персональных данных. Только счётчики и даты.
 *
 * НЕ ВАЛИТ ДЕПЛОЙ. Всегда выходит с нулём: отчёт — это диагностика, и
 * сломанный отчёт не повод не выкатывать сайт.
 *
 * Запуск: npm run subscribers:report
 */
import { Pool } from 'pg';

/** День, когда новый сайт начал собирать адреса сам. Всё раньше — импорт. */
const LAUNCH = '2026-09-12';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL не задан — отчёт пропущен.');
  process.exit(0);
}

const pool = new Pool({ connectionString });

/** Печатает результат запроса построчно, как «ключ: значение». */
function show(title, rows) {
  console.log(`\n— ${title}`);
  if (rows.length === 0) {
    console.log('   пусто');
    return;
  }
  for (const row of rows) {
    console.log('   ' + Object.entries(row).map(([k, v]) => `${k}=${v}`).join('  '));
  }
}

try {
  const q = (text) => pool.query(text).then((r) => r.rows);

  show('импорт таблицы: строки с client_token = sheet:%', await q(`
    select count(*)::int as строк,
           min(created_at)::date as первая,
           max(created_at)::date as последняя
    from submissions
    where client_token like 'sheet:%'
  `));

  show('подписчики целиком', await q(`
    select count(*)::int as всего,
           count(*) filter (where consent_email)::int as с_согласием,
           count(*) filter (where sent_at is not null)::int as помечены_отправленными,
           count(*) filter (where archetype is null)::int as без_архетипа,
           count(*) filter (where perfume_id is null)::int as без_флакона,
           min(consent_at)::date as первое_согласие,
           max(consent_at)::date as последнее_согласие
    from subscribers
  `));

  show(`подписчики: до ${LAUNCH} (перенесённые) и после (новый сайт)`, await q(`
    select case when consent_at < date '${LAUNCH}' then 'перенесённые' else 'новый сайт' end as откуда,
           count(*)::int as сколько,
           min(consent_at)::date as с,
           max(consent_at)::date as по
    from subscribers
    group by 1 order by 1
  `));

  show('подписчики по дням согласия', await q(`
    select consent_at::date as день, count(*)::int as сколько
    from subscribers group by 1 order by 1
  `));

  show('прохождения', await q(`
    select count(*)::int as всего,
           count(*) filter (where completed)::int as завершённые,
           count(*) filter (where not completed)::int as брошенные,
           count(*) filter (where consent_research)::int as согласие_на_исследование,
           count(distinct browser_key)::int as браузеров,
           min(created_at)::date as первое,
           max(created_at)::date as последнее
    from submissions
  `));

  show('прохождения по локалям', await q(`
    select locale, count(*)::int as всего,
           count(*) filter (where completed)::int as завершённые
    from submissions group by 1 order by 2 desc
  `));

  show('события воронки', await q(`
    select count(*)::int as событий,
           count(distinct run_token)::int as прохождений,
           min(created_at)::date as первое,
           max(created_at)::date as последнее
    from funnel_events
  `));

  console.log('');
} catch (error) {
  console.error('Отчёт по подписчикам не собрался:', error);
} finally {
  await pool.end();
}
