/**
 * Проверка, что запросы сторожа роста вообще разбираются Postgres'ом.
 *
 * ЗАЧЕМ. 25.09.2026 ночной запуск упал на `syntax error at or near "day"`:
 * псевдоним колонки назывался `day` и стоял сразу после интервального
 * литерала, а Postgres принимает форму `interval '1' day` и разобрал слово
 * как часть интервала. Копия к тому моменту уже снялась, а сторож не дошёл
 * даже до первой строки про письма. Ошибка синтаксиса, которую видно только
 * в 02:41 в проде, — ровно то, что должна ловить проверка.
 *
 * КАК. Запросы не переписаны сюда копией: скрипт читает сам
 * `growth-watch.mts`, вынимает из него каждый SQL и прогоняет через
 * EXPLAIN на локальной базе. EXPLAIN разбирает и планирует запрос, но не
 * выполняет его, так что проверяются и синтаксис, и имена таблиц с
 * колонками. Копия запросов разошлась бы с оригиналом на первой же правке.
 *
 *   createdb + node scripts/migrate.mjs, затем:
 *   DATABASE_URL=postgresql://...@127.0.0.1/... npm run check:watch
 */
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const url = process.env.DATABASE_URL;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw Error('Нужна изолированная локальная база: EXPLAIN не для прода');
}

const SOURCE = new URL('./growth-watch.mts', import.meta.url);
const source = readFileSync(SOURCE, 'utf8');

/* Вынимаем всё, что уходит в db.query(...) — в файле встречаются все три
   вида кавычек, и пропустить хоть один было бы хуже, чем не проверять
   вовсе: проверка молчала бы ровно про тот запрос, которого не видит. */
const queries = [...source.matchAll(/db\.query(?:<[^>]*>)?\(\s*(`[^`]*`|'[^']*'|"[^"]*")/g)]
  .map((m) => m[1].slice(1, -1).trim());

/* Сколько запросов в файле на самом деле — считаем отдельно и грубо, по
   вызовам. Если разбор выше однажды перестанет видеть какой-то вид записи,
   числа разойдутся и проверка упадёт, а не притворится успешной. */
const calls = [...source.matchAll(/db\.query(?:<[^>]*>)?\(/g)].length;
if (queries.length !== calls) {
  throw Error(`Вызовов db.query ${calls}, а разобрано ${queries.length} — правь выборку в этом файле`);
}
if (queries.length === 0) throw Error('Ни одного запроса не найдено — сломался разбор файла');
const templated = queries.filter((q) => q.includes('${'));
if (templated.length > 0) throw Error(`Запрос с подстановкой, EXPLAIN так не проверить:\n${templated[0]}`);

const db = new Client({ connectionString: url });
await db.connect();

let failed = 0;
for (const [i, sql] of queries.entries()) {
  const head = sql.split('\n')[0].slice(0, 62);
  try {
    await db.query(`explain ${sql}`);
    console.log(`  ok   [${i + 1}] ${head}…`);
  } catch (error) {
    failed += 1;
    console.error(`  ПАДАЕТ [${i + 1}] ${head}…`);
    console.error(`         ${error instanceof Error ? error.message : String(error)}`);
  }
}

await db.end();
console.log(failed === 0
  ? `\nВсе ${queries.length} запросов сторожа разбираются.\n`
  : `\n${failed} из ${queries.length} запросов не разбираются.\n`);
process.exit(failed ? 1 : 0);
