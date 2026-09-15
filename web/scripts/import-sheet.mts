/**
 * Перенос прохождений из старой таблицы Google Sheets в Postgres.
 *
 *   npm run import:sheet -- файл.xlsx            # разбор, без записи
 *   npm run import:sheet -- файл.xlsx --apply    # записать
 *
 * Читает и .xlsx, и .csv: заказчица выгружает с телефона, а приложение
 * Sheets отдаёт оттуда xlsx.
 *
 * ФОРМАТ. Колонки той таблицы, которую наполнял Apps Script прода (адрес
 * в page-result-footer.html): timestamp, page_url, winner, score_CEO …
 * score_THERAPIST, answers_json, open_question, email_result, lang,
 * consent_aggregate, consent_email. Имена приводятся к общему виду, а не
 * берутся по позиции: в таблице их правят руками.
 *
 * ДВА ЛИСТА. В присланном файле их два, и во втором («Copy of Sheet1»)
 * лежат десять прохождений за 30 января — 5 февраля, которых в первом
 * НЕТ. При переносе одного листа они бы потерялись. Поэтому берутся все
 * листы, а одинаковые прохождения отсекаются по отпечатку набора ответов.
 *
 * ЧТО ИСКЛЮЧАЕТСЯ И ПОЧЕМУ. Заказчица просила убрать свои тестовые
 * прогоны. Решения приняты ею; здесь они записаны ПРАВИЛАМИ, а не
 * номерами строк: номера сдвинутся при следующей выгрузке, правила нет.
 *
 *   1. В открытом ответе стоит «Test», «test» или «Test for nata» —
 *      человек так не пишет, это её собственные прогоны. Наборы ответов
 *      в них к тому же повторяются: один и тот же набор шесть раз
 *      и другой четыре раза.
 *   2. answers_json пуст — переносить нечего.
 *   3. Отдельно названные ею прогоны (EXCLUDED_AT): 97 и 98 — один
 *      и тот же тест дважды, 104 — тоже тест. Опознаются по отметке
 *      времени, она стабильна между выгрузками.
 *
 * ЧТО СОХРАНЯЕТСЯ КАК ЕСТЬ. winner НЕ пересчитывается: человек видел
 * именно тот архетип, и письмо, если было, говорило про него.
 * Исключение — три самые ранние строки (21–22 апреля), где подсчёт ещё
 * не работал и все баллы нулевые; для них заказчица попросила
 * пересчитать. Там пересчитывается и winner: архетип при нулевых баллах
 * ничем не обоснован, и оставить его рядом с новыми баллами значило бы
 * получить внутренне противоречивую строку. Такие строки названы в отчёте.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { getDb, schema } from '../src/db/index.ts';
import { resolve } from '../src/lib/scoring.ts';
import { ARCHETYPE_KEYS } from '../src/lib/archetype-colors.ts';

const file = process.argv[2];
const apply = process.argv.includes('--apply');

if (!file || file.startsWith('--')) {
  console.error('Укажите файл: npm run import:sheet -- файл.xlsx [--apply]');
  process.exit(1);
}

/** Разделитель для отпечатка строки: лишь бы не встречался в данных. */
const SEP = String.fromCharCode(31);

const VALID = new Set<string>(ARCHETYPE_KEYS as readonly string[]);

/** Прогоны, которые заказчица назвала тестами отдельно, по отметке времени. */
const EXCLUDED_AT: Record<string, string> = {
  '2026-09-05T09:00': 'дубль одного теста (строка 97)',
  '2026-09-05T16:38': 'дубль одного теста (строка 98)',
  '2026-09-08T16:38': 'тест (строка 104)',
};

const TEST_WORDS = ['test', 'тест', 'for nata'];

/* ── чтение файла ────────────────────────────────────────────────────── */

type Row = Record<string, unknown>;

/** Приводит имя колонки к общему виду: «open_question» → «openquestion». */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Все листы книги как массивы объектов. Имена колонок нормализуются —
 * без этого «open_question» однажды не совпадёт с «openquestion»
 * и открытые ответы потеряются молча, без единой ошибки.
 */
function readSheets(path: string): Array<{ name: string; rows: Row[] }> {
  const wb = path.toLowerCase().endsWith('.csv')
    ? XLSX.read(readFileSync(path, 'utf8'), { type: 'string', cellDates: true })
    : XLSX.read(readFileSync(path), { type: 'buffer', cellDates: true });

  return wb.SheetNames.map((name) => {
    const raw = XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { defval: null });
    const rows = raw.map((r) => {
      const out: Row = {};
      for (const [k, v] of Object.entries(r)) out[norm(String(k))] = v;
      return out;
    });
    return { name, rows };
  });
}

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

/** answers_json приезжает из таблицы в кавычках и с экранированием. */
function parseAnswers(v: unknown): Record<string, string> | null {
  let s = str(v);
  if (!s) return null;
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  s = s.replace(/\\"/g, '"');
  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof val === 'string' && k && val) out[k] = val;
  }
  return Object.keys(out).length ? out : null;
}

function parseDate(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [, a, b, y, hh, mm, ss] = m;
    return new Date(Date.UTC(+y, +b - 1, +a, +hh, +mm, +(ss ?? 0)));
  }
  return null;
}

const minuteKey = (d: Date) => d.toISOString().slice(0, 16);
const truthy = (v: unknown) => /^(true|1|yes|да|y)$/i.test(str(v));

/* ── разбор ──────────────────────────────────────────────────────────── */

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
  /** Служебное, в таблицу submissions не идёт. */
  sheet: string;
  line: number;
  wasRescored: boolean;
  email: string | null;
  consentEmail: boolean;
}

const sheets = readSheets(file);
console.log(`\nФайл: ${file}`);
console.log(`Листов: ${sheets.length} — ${sheets.map((s) => `${s.name} (${s.rows.length})`).join(', ')}`);

const ready: Ready[] = [];
/** Отпечаток прохождения → где оно встретилось впервые. */
const seen = new Map<string, { sheet: string; line: number; open: string }>();
/** Одинаковые ответы, но разный открытый текст — оставляем оба. */
const collisions: Array<{ sheet: string; line: number; open: string;
  other: { sheet: string; line: number; open: string } }> = [];
const skipped: Array<{ sheet: string; line: number; why: string; group: string }> = [];
let rescoredCount = 0;

for (const { name, rows } of sheets) {
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const line = i + 2;
    const skip = (group: string, why = group) =>
      skipped.push({ sheet: name, line, why, group });

    const open = str(r.openquestion);

    const winner = str(r.winner).toUpperCase();
    if (!winner) { skip('нет архетипа'); continue; }
    if (!VALID.has(winner)) { skip('неизвестный архетип', `неизвестный архетип «${winner}»`); continue; }

    const answers = parseAnswers(r.answersjson);
    if (!answers) { skip('пусто: ответов нет'); continue; }

    if (TEST_WORDS.some((w) => open.toLowerCase().includes(w))) {
      skip('тест: в открытом ответе «Test»', `тест: «${open}»`);
      continue;
    }

    const at = parseDate(r.timestamp);
    if (at && EXCLUDED_AT[minuteKey(at)]) {
      skip('исключено заказчицей', `исключено заказчицей: ${EXCLUDED_AT[minuteKey(at)]}`);
      continue;
    }

    /* ОДНО И ТО ЖЕ ПРОХОЖДЕНИЕ, ОТПРАВЛЕННОЕ ДВАЖДЫ.
       Встречается и между листами (второй лист — старая выгрузка
       первого), и внутри первого листа. Внутри листа это баг старого
       сайта: quiz_answers лежали в localStorage, а защита от повтора —
       только флаг quiz_sent в sessionStorage, который умирал с
       закрытием вкладки. Человек возвращался через день или три
       недели, и то же прохождение уезжало снова, с теми же 17
       ответами и тем же открытым текстом. Пар таких восемь, разрывы
       от 41 минуты до 24 дней.

       Совпадение 17 ответов И открытого текста у двух разных людей
       невозможно на практике, поэтому берём первую по времени
       отправку — она и есть настоящее прохождение, — а повтор
       отбрасываем. Именно это теперь не даёт случиться уникальный
       индекс по client_token. */
    const fp = JSON.stringify(Object.entries(answers).sort());
    const first = seen.get(fp);
    if (first) {
      /* Ключ — ТОЛЬКО набор ответов, без открытого текста. Второй лист
         это старая выгрузка, сделанная до появления колонки
         open_question: там текста нет ни у одной строки, и добавь его
         в ключ — те же прохождения перестанут узнаваться, а в базу
         уедут 41 дубль.

         Защита от обратной ошибки: если у двух прохождений с одинаковыми
         ответами открытый текст РАЗНЫЙ и непустой, это всё-таки разные
         люди. Тогда оба остаются, а строка попадает в отчёт — угадывать
         за заказчицу тут нельзя. */
      if (open && first.open && open !== first.open) {
        collisions.push({ sheet: name, line, other: first, open });
      } else {
        // Разделяем два разных случая: повтор внутри одного листа —
        // это баг старого сайта; совпадение между листами — просто
        // старая выгрузка тех же данных.
        skip(
          first.sheet === name
            ? 'повторная отправка того же прохождения (баг старого сайта)'
            : `то же прохождение уже взято из «${first.sheet}»`,
          `повтор прохождения из «${first.sheet}» стр ${first.line}`,
        );
        continue;
      }
    }

    // Баллы из колонок листа.
    const scores: Record<string, number> = {};
    let sum = 0;
    for (const key of ARCHETYPE_KEYS) {
      const n = Number(r[norm(`score_${key}`)]);
      const v = Number.isFinite(n) ? n : 0;
      scores[key] = v;
      sum += v;
    }

    // Все нули — подсчёт тогда не работал. Заказчица попросила пересчитать.
    let finalWinner = winner;
    let wasRescored = false;
    if (sum === 0) {
      try {
        const honest = resolve(answers);
        for (const k of Object.keys(scores)) delete scores[k];
        Object.assign(scores, honest.scores);
        finalWinner = honest.winner;
        wasRescored = true;
        rescoredCount += 1;
      } catch {
        skip('баллы нулевые и пересчитать не удалось');
        continue;
      }
    }

    if (!seen.has(fp)) seen.set(fp, { sheet: name, line, open });

    const fingerprint = createHash('sha256')
      .update([name, str(r.timestamp), winner, str(r.answersjson), open].join(SEP))
      .digest('hex')
      .slice(0, 40);

    ready.push({
      clientToken: `sheet:${fingerprint}`,
      locale: str(r.lang).toLowerCase() === 'fr' ? 'fr' : 'en',
      winner: finalWinner,
      secondary: str(r.secondary).toUpperCase() || null,
      scores,
      answers,
      openAnswer: open || null,
      consentResearch: truthy(r.consentaggregate),
      createdAt: at ?? new Date(),
      sheet: name,
      line,
      wasRescored,
      email: str(r.emailresult).toLowerCase() || null,
      consentEmail: truthy(r.consentemail),
    });
  }
}

/* ── отчёт ───────────────────────────────────────────────────────────── */

const withOpen = ready.filter((r) => r.openAnswer);
const withEmail = ready.filter((r) => r.email);

console.log(`\nК ПЕРЕНОСУ: ${ready.length} прохождений`);
const bySheet = new Map<string, number>();
for (const r of ready) bySheet.set(r.sheet, (bySheet.get(r.sheet) ?? 0) + 1);
for (const [s, n] of bySheet) console.log(`   из «${s}»: ${n}`);
console.log(`   с открытым ответом: ${withOpen.length}`);
console.log(`   с адресом почты: ${withEmail.length}`);

const dates = ready.map((r) => r.createdAt).sort((a, b) => a.getTime() - b.getTime());
if (dates.length) {
  console.log(`   период: ${dates[0].toISOString().slice(0, 10)} … `
    + `${dates[dates.length - 1].toISOString().slice(0, 10)}`);
}

if (rescoredCount) {
  console.log(`\nПересчитаны баллы у ${rescoredCount} (в таблице были нули, `
    + 'архетип пересчитан вместе с ними):');
  for (const r of ready.filter((x) => x.wasRescored)) {
    console.log(`   «${r.sheet}» стр ${r.line}  ${r.createdAt.toISOString().slice(0, 10)}  `
      + `→ ${r.winner}${r.openAnswer ? `  «${r.openAnswer.slice(0, 40)}»` : ''}`);
  }
}

if (collisions.length) {
  console.log(`\nОДИНАКОВЫЕ ОТВЕТЫ, НО РАЗНЫЙ ТЕКСТ — оставлены оба (${collisions.length}):`);
  for (const c of collisions) {
    console.log(`   «${c.sheet}» стр ${c.line} «${c.open.slice(0, 40)}»`);
    console.log(`     против «${c.other.sheet}» стр ${c.other.line} «${c.other.open.slice(0, 40)}»`);
  }
}

const byGroup = new Map<string, number[]>();
for (const s of skipped) byGroup.set(s.group, [...(byGroup.get(s.group) ?? []), s.line]);
console.log(`\nИСКЛЮЧЕНО: ${skipped.length}`);
for (const [group, lines] of [...byGroup].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`   ${String(lines.length).padStart(3)}  ${group}`);
  console.log(`        строки: ${lines.join(', ')}`);
}

const arch = new Map<string, number>();
for (const r of ready) arch.set(r.winner, (arch.get(r.winner) ?? 0) + 1);
console.log('\nАрхетипы после переноса:');
for (const [k, n] of [...arch].sort((a, b) => b[1] - a[1])) {
  const bar = '█'.repeat(Math.max(1, Math.round((n / ready.length) * 30)));
  console.log(`   ${k.padEnd(12)} ${String(n).padStart(3)} `
    + `${`${((n / ready.length) * 100).toFixed(1)}%`.padStart(6)}  ${bar}`);
}

if (!apply) {
  console.log('\nЭто разбор без записи. Чтобы записать, добавьте --apply\n');
  process.exit(0);
}

/* ── запись ──────────────────────────────────────────────────────────── */

const db = getDb();
let inserted = 0;

for (let i = 0; i < ready.length; i += 500) {
  const batch = ready.slice(i, i + 500);
  const res = await db
    .insert(schema.submissions)
    .values(batch.map((r) => ({
      clientToken: r.clientToken,
      locale: r.locale,
      winner: r.winner,
      secondary: r.secondary,
      scores: r.scores,
      answers: r.answers,
      openAnswer: r.openAnswer,
      consentResearch: r.consentResearch,
      createdAt: r.createdAt,
      // Ключа браузера у исторических прохождений нет и быть не может:
      // тогда его не существовало. Значит и в выборку run_index = 1 они
      // не попадают — это честнее, чем выдать им номер 1.
      browserKey: null,
      runIndex: null,
    })))
    .onConflictDoNothing({ target: schema.submissions.clientToken })
    .returning({ id: schema.submissions.id });
  inserted += res.length;
}

// Адреса — по решению заказчицы. Согласие с датой ИЗ ТАБЛИЦЫ: человек
// давал его тогда, а не в момент переноса, и подменять дату значило бы
// продлить себе срок хранения на полгода.
let subs = 0;
for (const r of withEmail) {
  if (!r.email) continue;
  const res = await db
    .insert(schema.subscribers)
    .values({
      email: r.email,
      locale: r.locale,
      archetype: r.winner,
      consentEmail: true,
      consentAt: r.createdAt,
      // Письмо тогда отправил старый сайт. Помечаем отправленным, иначе
      // рассылка ушла бы этим людям во второй раз.
      sentAt: r.createdAt,
      createdAt: r.createdAt,
    })
    .onConflictDoNothing({ target: schema.subscribers.email })
    .returning({ id: schema.subscribers.id });
  subs += res.length;
}

const [{ total }] = await db
  .select({ total: sql<number>`count(*)::int` })
  .from(schema.submissions);
const [{ historic }] = await db
  .select({ historic: sql<number>`count(*)::int` })
  .from(schema.submissions)
  .where(sql`${schema.submissions.clientToken} like 'sheet:%'`);

console.log(`\nНовых прохождений: ${inserted}`);
console.log(`Уже были (повторный запуск): ${ready.length - inserted}`);
console.log(`Новых адресов: ${subs} из ${withEmail.length}`);
console.log(`Всего исторических в базе: ${historic}`);
console.log(`Всего прохождений в базе: ${total}\n`);
process.exit(0);
