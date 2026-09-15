/**
 * Перенос прохождений из старой таблицы Google Sheets в Postgres.
 *
 *   npm run import:sheet -- путь/к/экспорту.csv           # разбор, без записи
 *   npm run import:sheet -- путь/к/экспорту.csv --apply   # записать
 *
 * ОТКУДА ФОРМАТ. Прод отправлял прохождения в Apps Script (адрес в
 * page-result-footer.html) полями: winner, secondary, scores, answers,
 * open_answer, consent_aggregate, page_url. Таблица, которую он наполнял,
 * экспортируется в CSV с этими же заголовками плюс отметка времени.
 * Имена колонок узнаются по смыслу, а не по позиции: в таблице их могли
 * переставить или переименовать руками.
 *
 * ЧТО ВАЖНО В ЭТОМ ПЕРЕНОСЕ.
 *
 *   1. ИДЕМПОТЕНТНОСТЬ. client_token собирается из содержимого строки
 *      (sha256 от времени, архетипа и ответов) с приставкой 'sheet:'.
 *      Повторный запуск того же файла не создаст ни одной новой строки —
 *      это проверяется onConflictDoNothing по уникальному индексу.
 *   2. ПЕРЕНЕСЁННОЕ ВИДНО. Приставка 'sheet:' в client_token — признак
 *      исторической строки. Отличать обязательно: у этих прохождений нет
 *      ключа браузера, они не попадают в выборку run_index = 1 и их
 *      winner пришёл от клиента, а не посчитан на сервере.
 *   3. WINNER НЕ ПЕРЕСЧИТЫВАЕТСЯ. Соблазн есть: сегодняшний resolve()
 *      посчитал бы честно. Но человек видел ТОТ архетип, и письмо, если
 *      было, говорило про него. Переписать историю значило бы испортить
 *      данные. Пересчёт показывается в отчёте как расхождение, чтобы
 *      было видно, много ли его.
 *   4. ПУСТЫЕ И БИТЫЕ СТРОКИ НЕ МОЛЧАТ. Каждая пропущенная строка
 *      попадает в отчёт с причиной — иначе «перенесли 800 из 1000»
 *      осталось бы незамеченным.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { getDb, schema } from '../src/db/index.ts';
import { resolve } from '../src/lib/scoring.ts';
import { ARCHETYPE_KEYS } from '../src/lib/archetype-colors.ts';

const file = process.argv[2];
const apply = process.argv.includes('--apply');

if (!file || file.startsWith('--')) {
  console.error('Укажите файл: npm run import:sheet -- экспорт.csv [--apply]');
  process.exit(1);
}

/* ── разбор CSV ──────────────────────────────────────────────────────── */

/** CSV с кавычками и переводами строк внутри полей. Экспорт Sheets такой. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  // BOM в экспорте Sheets есть почти всегда.
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Имена колонок узнаём по смыслу: в таблице их могли переименовать. */
function columnMap(header: string[]): Record<string, number> {
  // Подчёркивания тоже выбрасываем: в таблице колонка называется
  // open_answer, и без этого она не совпала бы с псевдонимом
  // openanswer — открытые ответы молча не переносились бы.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const want: Record<string, string[]> = {
    at: ['timestamp', 'date', 'time', 'createdat', 'datetime'],
    winner: ['winner', 'archetype', 'result'],
    secondary: ['secondary', 'second'],
    scores: ['scores', 'score'],
    answers: ['answers', 'answer'],
    open: ['openanswer', 'open', 'freetext', 'comment'],
    consent: ['consentaggregate', 'consent', 'consentresearch'],
    url: ['pageurl', 'url', 'page'],
  };
  const map: Record<string, number> = {};
  header.forEach((raw, i) => {
    const h = norm(raw);
    for (const [key, aliases] of Object.entries(want)) {
      if (map[key] === undefined && aliases.includes(h)) map[key] = i;
    }
  });
  return map;
}

/** Ответы в таблице лежали JSON-строкой. Иногда строка битая. */
function parseAnswers(raw: string): Record<string, string> | null {
  if (!raw.trim()) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof v === 'string' && k && v) out[k] = v;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

function parseScores(raw: string): Record<string, number> | null {
  if (!raw.trim()) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n)) out[k] = n;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  // Sheets отдаёт либо ISO, либо «01/02/2026 13:45:00» в локали таблицы.
  const iso = new Date(s);
  if (!Number.isNaN(iso.getTime())) return iso;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    // День/месяц против месяц/день различить нельзя, если оба ≤ 12.
    // Берём день-первым (таблица французская) и сообщаем о двусмысленности.
    const [, a, b, y, hh, mm, ss] = m;
    return new Date(Date.UTC(+y, +b - 1, +a, +hh, +mm, +(ss ?? 0)));
  }
  return null;
}

const VALID = new Set<string>(ARCHETYPE_KEYS as readonly string[]);

/** Разделитель для отпечатка строки: лишь бы не встречался в данных. */
const SEP = String.fromCharCode(31);

/* ── чтение файла ────────────────────────────────────────────────────── */

const rows = parseCsv(readFileSync(file, 'utf8'));
if (rows.length < 2) {
  console.error('В файле нет строк с данными.');
  process.exit(1);
}

const header = rows[0];
const col = columnMap(header);

console.log(`\nФайл: ${file}`);
console.log(`Колонки: ${header.join(' | ')}`);
console.log('Распознано: '
  + Object.entries(col).map(([k, i]) => `${k}→«${header[i]}»`).join(', '));

const missing = ['winner', 'answers'].filter((k) => col[k] === undefined);
if (missing.length) {
  console.error(`\nНе найдены обязательные колонки: ${missing.join(', ')}.`);
  console.error('Переименуйте их в таблице или добавьте псевдоним в columnMap.');
  process.exit(1);
}

interface Ready {
  clientToken: string;
  locale: string;
  winner: string;
  secondary: string | null;
  scores: Record<string, number>;
  answers: Record<string, string>;
  openAnswer: string | null;
  consentResearch: boolean;
  createdAt: Date;
}

const ready: Ready[] = [];
const skipped: Array<{ line: number; why: string }> = [];
let ambiguousDates = 0;
let noDate = 0;
let rescoreDiffers = 0;
let withOpen = 0;

for (let i = 1; i < rows.length; i += 1) {
  const r = rows[i];
  const get = (k: string) => (col[k] !== undefined ? (r[col[k]] ?? '') : '');
  const line = i + 1;

  const winner = get('winner').trim().toUpperCase();
  if (!winner) { skipped.push({ line, why: 'нет архетипа' }); continue; }
  if (!VALID.has(winner)) { skipped.push({ line, why: `неизвестный архетип «${winner}»` }); continue; }

  const answers = parseAnswers(get('answers'));
  if (!answers) { skipped.push({ line, why: 'ответы пустые или не разбираются' }); continue; }

  const at = parseDate(get('at'));
  if (!at) {
    noDate += 1;
    // Без даты строку не выбрасываем: ответы важнее отметки времени.
    // Ставим момент переноса и говорим об этом в отчёте.
  }
  if (/^\d{1,2}\/\d{1,2}\//.test(get('at').trim())) ambiguousDates += 1;

  const open = get('open').trim();
  if (open) withOpen += 1;

  // Пересчёт только для отчёта: winner НЕ переписываем (см. п.3 сверху).
  try {
    const honest = resolve(answers);
    if (honest.winner !== winner) rescoreDiffers += 1;
  } catch { /* не считается — не беда, это только статистика */ }

  const stamp = at ?? new Date();
  const fingerprint = createHash('sha256')
    .update([get('at').trim(), winner, get('answers').trim(), open].join(SEP))
    .digest('hex')
    .slice(0, 40);

  ready.push({
    // Приставка — признак исторической строки, см. п.2 сверху.
    clientToken: `sheet:${fingerprint}`,
    locale: 'en',
    winner,
    secondary: get('secondary').trim().toUpperCase() || null,
    scores: parseScores(get('scores')) ?? {},
    answers,
    openAnswer: open || null,
    consentResearch: /^(true|1|yes|да)$/i.test(get('consent').trim()),
    createdAt: stamp,
  });
}

/* ── отчёт ───────────────────────────────────────────────────────────── */

console.log(`\nСтрок с данными: ${rows.length - 1}`);
console.log(`Готовы к переносу: ${ready.length}`);
console.log(`Из них с открытым ответом: ${withOpen}`);
if (noDate) console.log(`Без разобранной даты: ${noDate} — им поставлено время переноса`);
if (ambiguousDates) {
  console.log(`Даты вида ДД/ММ/ГГГГ: ${ambiguousDates} — прочитаны как день-первым`);
}
if (rescoreDiffers) {
  console.log(`Сегодняшний подсчёт дал бы другой архетип у ${rescoreDiffers} строк — `
    + 'исторический winner оставлен как есть');
}

if (skipped.length) {
  console.log(`\nПропущено ${skipped.length}:`);
  const why = new Map<string, number[]>();
  for (const s of skipped) why.set(s.why, [...(why.get(s.why) ?? []), s.line]);
  for (const [reason, lines] of why) {
    const shown = lines.slice(0, 8).join(', ');
    console.log(`  ${reason}: ${lines.length} (строки ${shown}${lines.length > 8 ? '…' : ''})`);
  }
}

const dupes = ready.length - new Set(ready.map((r) => r.clientToken)).size;
if (dupes) console.log(`\nОдинаковых строк внутри файла: ${dupes} — запишется по одной`);

const archCount = new Map<string, number>();
for (const r of ready) archCount.set(r.winner, (archCount.get(r.winner) ?? 0) + 1);
console.log('\nАрхетипы в переносе:');
for (const [k, n] of [...archCount].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(12)} ${n}`);
}

if (!apply) {
  console.log('\nЭто разбор без записи. Чтобы записать, добавьте --apply\n');
  process.exit(0);
}

/* ── запись ──────────────────────────────────────────────────────────── */

const db = getDb();
let inserted = 0;

// Пачками: один запрос на тысячу строк вместо тысячи запросов.
for (let i = 0; i < ready.length; i += 500) {
  const batch = ready.slice(i, i + 500);
  const res = await db
    .insert(schema.submissions)
    .values(batch.map((r) => ({
      ...r,
      // Ключа браузера у исторических прохождений нет и быть не может:
      // тогда его не существовало. Значит и в выборку run_index = 1 они
      // не попадают — это честнее, чем выдать им номер 1.
      browserKey: null,
      runIndex: null,
    })))
    .onConflictDoNothing({ target: schema.submissions.clientToken })
    .returning({ id: schema.submissions.id });
  inserted += res.length;
  process.stdout.write(`\rзаписано ${inserted}…`);
}

const [{ total }] = await db
  .select({ total: sql<number>`count(*)::int` })
  .from(schema.submissions);
const [{ historic }] = await db
  .select({ historic: sql<number>`count(*)::int` })
  .from(schema.submissions)
  .where(sql`${schema.submissions.clientToken} like 'sheet:%'`);

console.log(`\n\nНовых строк: ${inserted}`);
console.log(`Уже были (повторный запуск): ${ready.length - inserted - dupes}`);
console.log(`Всего исторических в базе: ${historic}`);
console.log(`Всего прохождений в базе: ${total}\n`);
process.exit(0);
