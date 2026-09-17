/**
 * Разбор старой таблицы Google Sheets. Чистая функция: байты на входе,
 * готовые прохождения и отчёт на выходе. Ни базы, ни файловой системы —
 * поэтому её используют и скрипт в терминале, и страница /admin/import,
 * и правила исключения у них одни и те же.
 *
 * ФОРМАТ. Колонки той таблицы, которую наполнял Apps Script прода (адрес
 * в page-result-footer.html): timestamp, page_url, winner, score_CEO …
 * score_THERAPIST, answers_json, open_question, email_result, lang,
 * consent_aggregate, consent_email. Имена приводятся к общему виду, а не
 * берутся по позиции: в таблице их правят руками.
 *
 * ДВА ЛИСТА. В присланной выгрузке их два, и во втором («Copy of Sheet1»)
 * лежат десять прохождений за 30 января — 5 февраля, которых в первом
 * НЕТ. При разборе одного листа они потерялись бы молча. Берутся все
 * листы, одинаковые прохождения отсекаются по набору ответов.
 *
 * ЧТО ИСКЛЮЧАЕТСЯ. Заказчица просила убрать свои тестовые прогоны.
 * Решения приняты ею; записаны ПРАВИЛАМИ, а не номерами строк: номера
 * сдвинутся при следующей выгрузке, правила нет.
 *
 *   1. В открытом ответе стоит «Test», «test» или «Test for nata».
 *      Наборы ответов в этих строках к тому же повторяются: один и тот
 *      же шесть раз, другой четыре.
 *   2. answers_json пуст — переносить нечего.
 *   3. Отдельно названные ею прогоны (EXCLUDED_AT), по отметке времени.
 *
 * ЧТО СОХРАНЯЕТСЯ КАК ЕСТЬ. winner НЕ пересчитывается: человек видел
 * именно тот архетип, и письмо, если было, говорило про него.
 * Исключение — строки, где все баллы нулевые (подсчёт тогда не работал);
 * для них заказчица попросила пересчитать, и пересчитывается также
 * winner: архетип при нулевых баллах ничем не обоснован, и оставить его
 * рядом с новыми баллами значило бы получить противоречивую строку.
 */
import * as XLSX from 'xlsx';
import { createHash } from 'node:crypto';
import { resolve } from './scoring';
import { ARCHETYPE_KEYS } from './archetype-colors';

/** Разделитель для отпечатка строки: лишь бы не встречался в данных. */
const SEP = String.fromCharCode(31);

const VALID = new Set<string>(ARCHETYPE_KEYS as readonly string[]);

/** Прогоны, которые заказчица назвала тестами отдельно, по отметке времени. */
export const EXCLUDED_AT: Record<string, string> = {
  '2026-09-05T09:00': 'дубль одного теста (строка 97)',
  '2026-09-05T16:38': 'дубль одного теста (строка 98)',
  '2026-09-08T16:38': 'тест (строка 104)',
};

const TEST_WORDS = ['test', 'тест', 'for nata'];

export interface ParsedRun {
  clientToken: string;
  locale: string;
  winner: string;
  secondary: string | null;
  scores: Record<string, number>;
  answers: Record<string, string>;
  openAnswer: string | null;
  consentResearch: boolean;
  createdAt: Date;
  /** Служебное, в submissions не идёт. */
  sheet: string;
  line: number;
  wasRescored: boolean;
  email: string | null;
  consentEmail: boolean;
}

export interface Skipped {
  sheet: string;
  line: number;
  group: string;
  why: string;
}

export interface Collision {
  sheet: string;
  line: number;
  open: string;
  other: { sheet: string; line: number; open: string };
}

export interface ParseResult {
  sheets: Array<{ name: string; rows: number }>;
  runs: ParsedRun[];
  skipped: Skipped[];
  collisions: Collision[];
}

type Row = Record<string, unknown>;

/** Приводит имя колонки к общему виду: «open_question» → «openquestion». */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const truthy = (v: unknown) => /^(true|1|yes|да|y)$/i.test(str(v));
const minuteKey = (d: Date) => d.toISOString().slice(0, 16);

/**
 * Опечатки прода в кодах ответов.
 *
 * Страницы celebration и calm-now на живом сайте писали код варианта
 * «Other» с ОДНИМ подчёркиванием, а в таблице баллов он с двумя — то
 * есть такого кода в подсчёте не было вовсе, и балла за этот ответ
 * человек не получал. На победителя это не влияло: «Other» весит по
 * одному баллу каждому из семи архетипов, и одинаковая прибавка всем
 * порядок не меняет.
 *
 * Здесь такие коды приводятся к правильным, потому что баллы при
 * переносе считаются заново: иначе в базе остался бы код, которого нет
 * ни в квизе, ни в таблице весов, и в админке он показался бы сырой
 * строкой вместо названия варианта.
 */
const LEGACY_CODES: Record<string, string> = {
  Q_CELEBRATE_OTHER: 'Q_CELEBRATE__OTHER',
  Q_CALM_NOW_OTHER: 'Q_CALM_NOW__OTHER',
};

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
    if (typeof val === 'string' && k && val) out[k] = LEGACY_CODES[val] ?? val;
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

/**
 * Разбирает книгу целиком. `bytes` — содержимое .xlsx; для .csv передайте
 * строку. Имена колонок нормализуются: без этого «open_question» однажды
 * не совпадёт с «openquestion» и открытые ответы потеряются молча.
 */
export function parseSheet(bytes: Uint8Array | string): ParseResult {
  const wb = typeof bytes === 'string'
    ? XLSX.read(bytes, { type: 'string', cellDates: true })
    : XLSX.read(bytes, { type: 'buffer', cellDates: true });

  const sheets = wb.SheetNames.map((name) => {
    const raw = XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { defval: null });
    const rows = raw.map((r) => {
      const out: Row = {};
      for (const [k, v] of Object.entries(r)) out[norm(String(k))] = v;
      return out;
    });
    return { name, rows };
  });

  const runs: ParsedRun[] = [];
  const skipped: Skipped[] = [];
  const collisions: Collision[] = [];
  const seen = new Map<string, { sheet: string; line: number; open: string }>();

  for (const { name, rows } of sheets) {
    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];
      const line = i + 2;
      const skip = (group: string, why = group) => skipped.push({ sheet: name, line, group, why });

      const open = str(r.openquestion);

      const winner = str(r.winner).toUpperCase();
      if (!winner) { skip('нет архетипа'); continue; }
      if (!VALID.has(winner)) {
        skip('неизвестный архетип', `неизвестный архетип «${winner}»`);
        continue;
      }

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
         Ключ — ТОЛЬКО набор ответов, без открытого текста: второй лист
         это выгрузка, сделанная до появления колонки open_question, там
         текста нет ни у одной строки, и добавь его в ключ — те же
         прохождения перестанут узнаваться.

         Внутри одного листа такие пары — баг старого сайта: quiz_answers
         лежали в localStorage, а защита от повтора только в
         sessionStorage, которая умирала с закрытием вкладки. Человек
         возвращался, и то же прохождение уезжало снова: те же 17 ответов
         и тот же текст, разрыв от 41 минуты до 24 дней.

         Защита от обратной ошибки: если текст у дублей РАЗНЫЙ и непустой,
         это всё-таки разные люди — оба остаются и попадают в отчёт. */
      const fp = JSON.stringify(Object.entries(answers).sort());
      const first = seen.get(fp);
      if (first) {
        if (open && first.open && open !== first.open) {
          collisions.push({ sheet: name, line, open, other: first });
        } else {
          skip(
            first.sheet === name
              ? 'повторная отправка того же прохождения (баг старого сайта)'
              : `то же прохождение уже взято из «${first.sheet}»`,
            `повтор прохождения из «${first.sheet}» стр ${first.line}`,
          );
          continue;
        }
      }

      const scores: Record<string, number> = {};
      let sum = 0;
      for (const key of ARCHETYPE_KEYS) {
        const n = Number(r[norm(`score_${key}`)]);
        const v = Number.isFinite(n) ? n : 0;
        scores[key] = v;
        sum += v;
      }

      let finalWinner = winner;
      let wasRescored = false;
      if (sum === 0) {
        try {
          const honest = resolve(answers);
          for (const k of Object.keys(scores)) delete scores[k];
          Object.assign(scores, honest.scores);
          finalWinner = honest.winner;
          wasRescored = true;
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

      runs.push({
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

  return {
    sheets: sheets.map((s) => ({ name: s.name, rows: s.rows.length })),
    runs,
    skipped,
    collisions,
  };
}

/** Причины исключения, сгруппированные для отчёта. */
export function groupSkipped(skipped: Skipped[]): Array<{ group: string; lines: number[] }> {
  const by = new Map<string, number[]>();
  for (const s of skipped) by.set(s.group, [...(by.get(s.group) ?? []), s.line]);
  return [...by]
    .map(([group, lines]) => ({ group, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);
}
