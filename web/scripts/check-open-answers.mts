/**
 * Сверка окошка «Other» с продом.
 *
 * Запуск:  cd web && npm run check:open
 *
 * Здесь проверяется то, чего браузерная проверка увидеть не может: что
 * текст в окошке взят с живого сайта ДОСЛОВНО, для всех девяти вопросов,
 * и что сам приём этих ответов не даёт записать текст к чему угодно.
 *
 * Почему это отдельная проверка. Три текста из девяти я сначала написал
 * по памяти, и все три оказались неверными: у celebration прошедшее
 * время («What DID celebration smell like to you?»), у calm-now вопрос
 * вообще другой («Is there a smell that instantly calms you?»), у focus
 * нет слова «пахнет» («What helps you concentrate?»). Пока эти строки
 * сверяются с прод-страницами машиной, такая ошибка не вернётся.
 */
import { readFileSync } from 'node:fs';
import { parseSubmission, buildQuestionOpenRows } from '../src/lib/submission';
import { QUESTIONS } from '../src/lib/quiz';
import { parseSheet } from '../src/lib/sheet-import';
import prompts from '../src/data/question-open-prompts.json';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

const PROMPTS = prompts.prompts as Record<string, string>;

/** Вопросы с «Other» — из данных квиза, а не списком руками. */
const WITH_OPEN = Object.values(QUESTIONS)
  .filter((q) => q.answers.some((a) => a.open))
  .map((q) => q.id);

const slug = (id: string) => id.toLowerCase().replace(/_/g, '-');

console.log('\nДевять вопросов, и ни одного лишнего');
{
  check('в квизе девять вопросов с «Other»', WITH_OPEN.length === 9,
    `${WITH_OPEN.length}: ${WITH_OPEN.join(', ')}`);
  check('и у каждого есть свой текст для окошка',
    WITH_OPEN.every((id) => typeof PROMPTS[id] === 'string' && PROMPTS[id] !== ''),
    WITH_OPEN.filter((id) => !PROMPTS[id]).join(', ') || 'все на месте');
  // И наоборот: текст без вопроса — мусор, который никто не увидит.
  const extra = Object.keys(PROMPTS).filter((id) => !WITH_OPEN.includes(id));
  check('лишних текстов нет', extra.length === 0, extra.join(', '));
  check('все девять текстов различны', new Set(Object.values(PROMPTS)).size === 9,
    `${new Set(Object.values(PROMPTS)).size} различных`);
}

console.log('\nТекст в окошке — дословно с живого сайта');
{
  for (const id of WITH_OPEN) {
    const prod = readFileSync(`../webflow/live-pages/q-${slug(id).slice(2)}.footer.html`, 'utf8');

    /* Панель прод собирал строкой в innerHTML: вопрос лежит в первом
       <p> внутри неё, сразу перед полем open-answer-input. Разметка у
       девяти страниц разная (семь минифицированы в одну строку, focus и
       play свёрстаны в столбик), поэтому пробелы здесь не важны. */
    const m = /<p[^>]*>([^<]+)<\/p>\s*<input id="open-answer-input"/.exec(prod);
    check(`${id}: вопрос найден в прод-коде`, m !== null);
    if (m) {
      check(`${id}: «${PROMPTS[id]}»`, m[1] === PROMPTS[id],
        `в проде «${m[1]}», у нас «${PROMPTS[id]}»`);
    }

    // Подпись поля и кнопка одни на все девять — но проверить стоит:
    // в проде это девять копий одного куска, и разойтись они могли.
    check(`${id}: подсказка в поле «${prompts.placeholder}»`,
      prod.includes(`placeholder="${prompts.placeholder}"`));
    check(`${id}: кнопка «${prompts.submit}»`, prod.includes(`>${prompts.submit}</button>`));
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Код варианта «Other».

   На живом сайте он записан ДВАЖДЫ и в двух местах: в таблице баллов
   (page-q-open-footer.html) и на самой странице вопроса. У семи вопросов
   они совпадают, а у celebration и calm-now страница пишет код с ОДНИМ
   подчёркиванием (`Q_CELEBRATE_OTHER`), которого в таблице баллов нет
   вовсе. То есть в проде «Other» на этих двух вопросах не давал баллов
   ни одному архетипу.

   На победителя это не влияло: у «Other» вес — по одному баллу КАЖДОМУ
   архетипу, а одинаковая прибавка всем семи порядок не меняет. Поэтому
   здесь это зафиксировано как известная разница, а не как «сломано»:
   у нас код один и тот же в обоих местах, и он тот, что в таблице
   баллов, — иначе старые и новые прохождения считались бы по-разному.
   ───────────────────────────────────────────────────────────────────── */

console.log('\nКод варианта сходится с таблицей баллов прода');
{
  const scoring = readFileSync('../webflow/page-q-open-footer.html', 'utf8');
  /** Код, который прод писал в ответы на самой странице вопроса. */
  const onPage = (prod: string, id: string) =>
    new RegExp(`answers\\['${id}'\\]\\s*=\\s*'([A-Z_]+)'`).exec(prod)?.[1]
    // focus и play вместо записи напрямую нажимают скрытую кнопку Webflow.
    ?? new RegExp(`data-answer-key="(${id}_+OTHER)"`).exec(prod)?.[1]
    ?? null;

  /* Одно исключение на каждый из двух вопросов, и оба перечислены
     здесь по имени: список закрыт, чтобы третье такое расхождение
     проверка поймала, а не проглотила. */
  const PROD_TYPOS: Record<string, string> = {
    Q_CELEBRATE: 'Q_CELEBRATE_OTHER',
    Q_CALM_NOW: 'Q_CALM_NOW_OTHER',
  };

  for (const id of WITH_OPEN) {
    const prod = readFileSync(`../webflow/live-pages/q-${slug(id).slice(2)}.footer.html`, 'utf8');
    const ours = QUESTIONS[id].answers.find((a) => a.open)?.code;

    check(`${id}: ${ours} есть в таблице баллов прода`,
      ours !== undefined && scoring.includes(`"${ours}":`), String(ours));

    const page = onPage(prod, id);
    const expected = PROD_TYPOS[id] ?? ours;
    check(`${id}: страница прода писала ${expected}`, page === expected,
      `нашёл ${page}`);
    if (PROD_TYPOS[id]) {
      check(`${id}: этого кода в таблице баллов прода и правда нет`,
        !scoring.includes(`"${PROD_TYPOS[id]}":`), PROD_TYPOS[id]);
    }
  }
}

console.log('\nПриём: текст можно записать только к своему вопросу');
{
  const base = {
    locale: 'en',
    answers: { Q_RADIUS: 'Q_RADIUS__CLOSE', Q_EMO: 'Q_EMO__CALM', Q_CALM: 'Q_CALM__OTHER' },
    openAnswer: 'final words',
    consentResearch: true,
    clientToken: 'token-1',
  };

  const good = parseSubmission({ ...base, questionOpens: { Q_CALM: '  cold linen  ' } });
  check('свой вопрос принимается', good.ok === true, good.ok ? '' : good.error);
  check('текст обрезан по краям',
    good.ok === true && good.input.questionOpens.Q_CALM === 'cold linen',
    good.ok ? JSON.stringify(good.input.questionOpens) : '');

  // Вопрос без «Other» — отказ. Иначе в таблицу можно было бы положить
  // текст к любому выдуманному коду.
  const wrong = parseSubmission({ ...base, questionOpens: { Q_GENDER: 'anything' } });
  check('вопрос без «Other» отклонён', wrong.ok === false,
    wrong.ok ? 'принято, а не должно' : wrong.error);
  const made = parseSubmission({ ...base, questionOpens: { Q_MADE_UP: 'anything' } });
  check('выдуманный вопрос отклонён', made.ok === false,
    made.ok ? 'принято, а не должно' : made.error);

  const long = parseSubmission({ ...base, questionOpens: { Q_CALM: 'x'.repeat(2001) } });
  check('слишком длинный текст отклонён', long.ok === false,
    long.ok ? 'принято, а не должно' : long.error);

  const many = parseSubmission({
    ...base,
    questionOpens: Object.fromEntries(
      Array.from({ length: 13 }, (_, i) => [`Q_${i}`, 'x']),
    ),
  });
  check('слишком много текстов отклонено', many.ok === false,
    many.ok ? 'принято, а не должно' : many.error);

  // Пустое и из пробелов не должно доехать до базы вовсе.
  const empty = parseSubmission({ ...base, questionOpens: { Q_CALM: '   ' } });
  check('пустой текст просто отбрасывается',
    empty.ok === true && Object.keys(empty.input.questionOpens).length === 0,
    empty.ok ? JSON.stringify(empty.input.questionOpens) : empty.error);

  // Старый клиент (или прод, пока он жив) поля не присылает вовсе.
  const none = parseSubmission(base);
  check('без поля questionOpens прохождение принимается',
    none.ok === true && Object.keys(none.input.questionOpens).length === 0,
    none.ok ? '' : none.error);

  const rows = buildQuestionOpenRows('11111111-1111-1111-1111-111111111111',
    { Q_CALM: 'cold linen', Q_SEXY: '' });
  check('строки для базы: пустые не попадают', rows.length === 1, JSON.stringify(rows));
  check('и лежат под своим прохождением',
    rows[0].submissionId === '11111111-1111-1111-1111-111111111111'
    && rows[0].questionId === 'Q_CALM' && rows[0].text === 'cold linen',
    JSON.stringify(rows[0]));
}

console.log('\nПеренос старой таблицы: коды прода приводятся к правильным');
{
  /* Иначе в перенесённых прохождениях остался бы код, которого нет ни в
     квизе, ни в таблице весов, — и в админке он показался бы сырой
     строкой «Q_CELEBRATE_OTHER» вместо названия варианта. */
  const csv = [
    'timestamp,winner,answers_json,open_question,lang,consent_research',
    '2026-02-01 10:00,HUG,'
      + '"{""Q_RADIUS"":""Q_RADIUS__CLOSE"",""Q_CELEBRATE"":""Q_CELEBRATE_OTHER"",'
      + '""Q_CALM_NOW"":""Q_CALM_NOW_OTHER""}",mandarins,en,true',
  ].join('\n');

  const parsed = parseSheet(csv);
  check('строка прочитана', parsed.runs.length === 1,
    `${parsed.runs.length}, пропущено ${parsed.skipped.length}`);
  const a = parsed.runs[0]?.answers ?? {};
  check('Q_CELEBRATE_OTHER → Q_CELEBRATE__OTHER',
    a.Q_CELEBRATE === 'Q_CELEBRATE__OTHER', String(a.Q_CELEBRATE));
  check('Q_CALM_NOW_OTHER → Q_CALM_NOW__OTHER',
    a.Q_CALM_NOW === 'Q_CALM_NOW__OTHER', String(a.Q_CALM_NOW));
  check('остальные коды не тронуты', a.Q_RADIUS === 'Q_RADIUS__CLOSE', String(a.Q_RADIUS));
  // И такой код теперь считается: в таблице весов он есть.
  check('исправленные коды известны подсчёту',
    [a.Q_CELEBRATE, a.Q_CALM_NOW].every((code) =>
      WITH_OPEN.some((id) => QUESTIONS[id].answers.some((x) => x.code === code))));
}

console.log('\nОкошко и хранилище разведены с финальным вопросом');
{
  const store = readFileSync('src/lib/answers-store.ts', 'utf8');
  check('у текстов «Other» свой ключ хранилища',
    store.includes("'quiz_open_by_question'"));
  check('и он чистится вместе с остальным',
    /clearAnswers[\s\S]*QUESTION_OPEN_KEY/.test(store));

  const modal = readFileSync('src/components/quiz/OpenAnswerModal.tsx', 'utf8');
  // Окошко вообще не знает про хранилище: оно отдаёт текст наверх, а
  // куда его класть, решает одно место. Прод решал это в девяти.
  check('окошко не трогает хранилище само',
    !/\b(localStorage|sessionStorage)\s*\./.test(modal));
  check("и не пишет в 'quiz_open'", !/'quiz_open'/.test(modal));

  const schema = readFileSync('src/db/schema.ts', 'utf8');
  check('таблица удаляется вместе с прохождением (иначе очистка по срокам её не тронет)',
    /questionOpenAnswers[\s\S]*onDelete: 'cascade'/.test(schema));
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nОкошко «Other» сходится с продом.\n');
process.exit(failed ? 1 : 0);
