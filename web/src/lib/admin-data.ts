/**
 * Выборки для админки. Та же арифметика, что в scripts/funnel-report.mts,
 * но на странице, а не в терминале: заказчице нужно смотреть ответы, не
 * ставя себе клиент Postgres.
 *
 * Второе правило, появившееся вместе с записью брошенных прохождений:
 * ВСЕ РАСПРЕДЕЛЕНИЯ СЧИТАЮТСЯ ПО ЗАВЕРШЁННЫМ. У брошенного прохождения тоже
 * есть winner — он посчитан из тех ответов, что успели дать, — и пустить его
 * в статистику значило бы сместить архетипы в пользу тех, кто ушёл на
 * третьем вопросе. Брошенные показаны отдельным числом и лежат в списке
 * прохождений с пометкой.
 *
 * Одно правило проходит через весь файл: ВЫБОРКА ДЛЯ ИССЛЕДОВАНИЯ — ЭТО
 * run_index = 1, иначе один человек, прошедший тест сто раз, перевесит сто
 * разных людей. Повторы не выбрасываются — они показаны отдельно, и это
 * свой материал: изменился ли архетип, когда тот же браузер вернулся.
 *
 * Но СВОДКА ПО АРХЕТИПАМ СЧИТАЕТСЯ ПО ВСЕМ ЗАВЕРШЁННЫМ, а выборка для
 * исследования стоит в ней отдельной колонкой. Раньше вся сводка была
 * сужена до run_index = 1 и у заказчицы выходила пустой: прохождения,
 * перенесённые из старой таблицы, ключа браузера не имеют, run_index у них
 * null, и под `= 1` не попадало ни одно. Считать живых людей нулём хуже,
 * чем показать рядом два числа и подписать, чем они отличаются.
 */
import { and, desc, eq, gte, isNotNull, ne, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { missingQuestions } from './quiz-state';
import { QUESTIONS, EMOTION_BRANCHES } from '@/lib/quiz';
import { QUESTION_COPY } from '@/data/question-titles';
import openPrompts from '@/data/question-open-prompts.json';
import ARCHETYPE_KEYS from '@/data/archetypes.en.json';

const OPEN_PROMPTS = openPrompts.prompts as Record<string, string>;

const { submissions, subscribers, funnelEvents, questionOpenAnswers } = schema;

/**
 * Вопросы с вариантом «Other», в порядке прохождения квиза. Берётся из
 * данных (`open: true`), как и проверка на сервере, — руками такой список
 * разошёлся бы с квизом на первом же изменении.
 */
const OPEN_QUESTION_IDS = stepOrder().filter(
  (id) => QUESTIONS[id]?.answers.some((a) => a.open),
);

export type Totals = {
  runs: number;
  /** Брошенные на полпути. В runs и распределения не входят. */
  abandoned: number;
  firstRuns: number;
  repeatRuns: number;
  noKey: number;
  browsers: number;
  consented: number;
  emails: number;
  emailsSent: number;
};

export type Slice = { label: string; n: number; share: number };

/**
 * Строка сводки по архетипу. Чисел здесь четыре, а не одно, потому что
 * «сколько кому выпало» и «сколько кому выпало в выборке для исследования» —
 * разные вопросы, и до сих пор на странице отвечался только второй.
 *
 * `all` — все завершённые. `first` — первые прохождения, run_index = 1, та
 * самая выборка для исследования. `historic` — прохождения, перенесённые из
 * старой таблицы: ключа браузера тогда не существовало, поэтому номера
 * прохождения у них нет и в `first` они не попадают, хотя это живые люди, а
 * не повторы. `repeat` — возвраты того же браузера.
 *
 * all = first + historic + repeat. Если сумма разошлась — врёт запрос.
 */
export type ArchetypeRow = {
  label: string;
  all: number;
  first: number;
  historic: number;
  repeat: number;
  /** Доля от всех завершённых: ей же соответствует полоска на странице. */
  share: number;
};

export type FunnelStep = {
  step: string;
  isBranch: boolean;
  views: number;
  answers: number;
  lost: number;
  fromStart: number;
};

export type RecentRun = {
  createdAt: Date;
  locale: string;
  winner: string;
  secondary: string | null;
  runIndex: number | null;
  consentResearch: boolean;
  /** Дошёл ли до конца. false — брошено на полпути. */
  completed: boolean;
  openAnswer: string | null;
  answers: Record<string, string>;
  /** Что человек написал в «Other»: код вопроса → текст. */
  opens: Record<string, string>;
};

export type Chain = { runs: string[]; changed: boolean };

export type OpenAnswer = {
  createdAt: Date;
  locale: string;
  winner: string;
  runIndex: number | null;
  text: string;
};

/**
 * Ответы «Other» одного вопроса.
 *
 * Отдельно от openAnswers (последний вопрос квиза) намеренно: это ответы
 * на РАЗНЫЕ вопросы, и вместе они читаются как каша. «Что для тебя пахнет
 * спокойствием» и «что помогает сосредоточиться» — два разных списка.
 */
export type QuestionOpens = {
  questionId: string;
  /** Вопрос из окошка — тот самый, который человек видел. */
  prompt: string;
  title: string;
  texts: Array<{
    createdAt: Date;
    locale: string;
    winner: string;
    runIndex: number | null;
    text: string;
  }>;
};

/**
 * Срезы, которыми сужается выборка. Пустое поле — «не сужать».
 *
 * `consent`: true — только те, кто отметил согласие на исследование,
 * false — только те, кто не отметил. ВАЖНО про false: у брошенного
 * прохождения согласия нет не потому, что человек отказался, а потому
 * что галочку показывают на последнем экране и он до неё не дошёл
 * (см. комментарий к колонке в db/schema.ts). В блоках, которые считают
 * по завершённым, это не мешает; в списке прохождений — попадётся и то
 * и другое, и различать надо по отметке «брошено».
 */
export type AdminFilters = {
  locale?: string;
  winner?: string;
  consent?: boolean;
};

export type AdminData = {
  days: number;
  filters: AdminFilters;
  /** Сужена ли воронка теми же фильтрами. См. loadAdminData. */
  funnelNarrowed: boolean;
  since: Date;
  totals: Totals;
  archetypes: ArchetypeRow[];
  locales: Slice[];
  funnel: FunnelStep[];
  answers: Array<{ step: string; title: string; total: number; options: Slice[] }>;
  openAnswers: OpenAnswer[];
  openAnswerTotal: number;
  questionOpens: QuestionOpens[];
  questionOpenTotal: number;
  chains: Chain[];
  chainsSame: number;
  chainsChanged: number;
  recent: RecentRun[];
};

/** Порядок шагов: линейный путь, ветки эмоции сразу после Q_EMO. */
function stepOrder(): string[] {
  const order: string[] = [];
  for (const id of Object.keys(QUESTIONS)) {
    if ((EMOTION_BRANCHES as readonly string[]).includes(id)) continue;
    order.push(id);
    if (id === 'Q_EMO') order.push(...EMOTION_BRANCHES);
  }
  order.push('RESULT', 'EMAIL_SENT');
  return order;
}

function toSlices(rows: Array<{ label: string | null; n: number }>): Slice[] {
  const total = rows.reduce((s, r) => s + r.n, 0);
  return rows
    .map((r) => ({
      label: r.label ?? '—',
      n: r.n,
      share: total ? r.n / total : 0,
    }))
    .sort((a, b) => b.n - a.n);
}

/**
 * Раскладывает ответ запроса по архетипам в строки страницы.
 *
 * Показываются ВСЕ архетипы, включая те, которым не выпало ни одного
 * прохождения: нулевая строка — это тоже ответ, а пропуск такой строки
 * читается как «данных нет», хотя данные есть. Берём список из тех же
 * данных, что и квиз, и добавляем к нему всё незнакомое, что нашлось в
 * базе, — у перенесённых прохождений архетип мог называться иначе, и
 * молча потерять его нельзя.
 */
/**
 * Период плюс выбранные срезы — ОДНО условие, через которое идут все запросы
 * по прохождениям. Так новый срез не нужно вписывать в каждый запрос по
 * отдельности — и нельзя забыть вписать в один из них, отчего блоки на
 * странице разъехались бы между собой. Выгрузки берут его же, иначе числа в
 * файле не сойдутся с числами на экране, и доверять не будешь ни тем ни
 * другим.
 */
function periodScope(since: Date, filters: AdminFilters) {
  const scope = [gte(submissions.createdAt, since)];
  if (filters.locale) scope.push(eq(submissions.locale, filters.locale));
  if (filters.winner) scope.push(eq(submissions.winner, filters.winner));
  if (filters.consent !== undefined) {
    scope.push(eq(submissions.consentResearch, filters.consent));
  }
  return and(...scope)!;
}

function toArchetypeRows(
  rows: Array<{ label: string | null; all: number; first: number; historic: number; repeat: number }>,
): ArchetypeRow[] {
  const found = new Map(rows.map((r) => [r.label ?? '—', r]));
  const labels = [...new Set([...Object.keys(ARCHETYPE_KEYS), ...found.keys()])];
  const total = rows.reduce((sum, r) => sum + r.all, 0);
  return labels
    .map((label) => {
      const r = found.get(label);
      return {
        label,
        all: r?.all ?? 0,
        first: r?.first ?? 0,
        historic: r?.historic ?? 0,
        repeat: r?.repeat ?? 0,
        share: total && r ? r.all / total : 0,
      };
    })
    .sort((a, b) => b.all - a.all || a.label.localeCompare(b.label));
}

/**
 * Сводка по архетипам отдельно от страницы: тем же запросом, что и на ней,
 * но без остальных двадцати. Нужна выгрузке — заказчице удобнее открыть
 * сводку в Excel, чем переписывать числа с экрана.
 */
export async function archetypeSummary(
  days: number,
  filters: AdminFilters = {},
): Promise<ArchetypeRow[]> {
  const db = getDb();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const rows = await db
    .select({
      label: submissions.winner,
      all: sql<number>`count(*)::int`,
      first: sql<number>`count(*) filter (where ${submissions.runIndex} = 1)::int`,
      historic: sql<number>`count(*) filter (where ${submissions.runIndex} is null)::int`,
      repeat: sql<number>`count(*) filter (where ${submissions.runIndex} > 1)::int`,
    })
    .from(submissions)
    .where(and(periodScope(since, filters), eq(submissions.completed, true))!)
    .groupBy(submissions.winner);
  return toArchetypeRows(rows);
}

/** Сводка по архетипам таблицей. Колонки — те же, что на странице. */
export async function archetypesCsv(
  days: number,
  filters: AdminFilters = {},
): Promise<string> {
  const rows = await archetypeSummary(days, filters);
  const lines = [['archetype', 'all', 'first_runs', 'historic', 'repeats', 'share'].join(',')];
  for (const r of rows) {
    lines.push([
      r.label, r.all, r.first, r.historic, r.repeat, (r.share * 100).toFixed(1),
    ].join(','));
  }
  /* Итог строкой: без него первый вопрос к файлу — «а сходится ли», и на
     него приходится отвечать сложением в голове. */
  const sum = (pick: (r: ArchetypeRow) => number) => rows.reduce((n, r) => n + pick(r), 0);
  lines.push(['ВСЕГО', sum((r) => r.all), sum((r) => r.first),
    sum((r) => r.historic), sum((r) => r.repeat), '100.0'].join(','));
  // BOM: иначе Excel читает UTF-8 как cp1251.
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

export async function loadAdminData(
  days: number,
  filters: AdminFilters = {},
): Promise<AdminData> {
  const db = getDb();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  // Одно условие на все запросы по прохождениям, см. periodScope.
  const inPeriod = periodScope(since, filters);

  /* Воронка и распределение ответов считаются по `funnel_events`, а там
     нет ни архетипа, ни согласия: событие пишется в момент показа экрана,
     когда ни того ни другого ещё не существует. Язык там есть, поэтому по
     языку воронка сужается честно, а по двум другим — не может. Врать и
     показывать несужённую воронку рядом с сужёнными числами нельзя, так
     что страница про это прямо говорит. */
  const funnelNarrowed = filters.winner === undefined && filters.consent === undefined;
  const funnelScope = [gte(funnelEvents.createdAt, since)];
  if (filters.locale) funnelScope.push(eq(funnelEvents.locale, filters.locale));
  const funnelIn = and(...funnelScope)!;
  // Завершённые: всё, что описывает прохождения и ответы, считается по ним.
  const done = and(inPeriod, eq(submissions.completed, true));

  const [
    countRows,
    abandonedRows,
    archetypeRows,
    localeRows,
    subscriberRows,
    funnelRows,
    answerRows,
    chainRows,
    recentRows,
    openRows,
    questionOpenRows,
  ] = await Promise.all([
    db
      .select({
        runs: sql<number>`count(*)::int`,
        firstRuns: sql<number>`count(*) filter (where ${submissions.runIndex} = 1)::int`,
        repeatRuns: sql<number>`count(*) filter (where ${submissions.runIndex} > 1)::int`,
        noKey: sql<number>`count(*) filter (where ${submissions.browserKey} is null)::int`,
        browsers: sql<number>`count(distinct ${submissions.browserKey})::int`,
        consented: sql<number>`count(*) filter (where ${submissions.consentResearch})::int`,
      })
      .from(submissions)
      .where(done),

    db
      .select({ abandoned: sql<number>`count(*)::int` })
      .from(submissions)
      .where(and(inPeriod, eq(submissions.completed, false))),

    /* Архетипы: все четыре числа одним запросом по завершённым, а не
       выборкой run_index = 1, как было раньше. Прежний запрос отвечал на
       вопрос исследования, но у заказчицы сводка выходила пустой: почти все
       её прохождения перенесены из старой таблицы, ключа браузера у них нет,
       run_index = null — и под `= 1` не попадало ни одно. Правило «выборка
       для исследования — это run_index = 1» никуда не делось, оно теперь
       отдельной колонкой рядом. */
    db
      .select({
        label: submissions.winner,
        all: sql<number>`count(*)::int`,
        first: sql<number>`count(*) filter (where ${submissions.runIndex} = 1)::int`,
        historic: sql<number>`count(*) filter (where ${submissions.runIndex} is null)::int`,
        repeat: sql<number>`count(*) filter (where ${submissions.runIndex} > 1)::int`,
      })
      .from(submissions)
      .where(done)
      .groupBy(submissions.winner),

    db
      .select({ label: submissions.locale, n: sql<number>`count(*)::int` })
      .from(submissions)
      .where(done)
      .groupBy(submissions.locale),

    db
      .select({
        emails: sql<number>`count(*)::int`,
        emailsSent: sql<number>`count(*) filter (where ${subscribers.sentAt} is not null)::int`,
      })
      .from(subscribers)
      .where(and(
        gte(subscribers.createdAt, since),
        ...(filters.locale ? [eq(subscribers.locale, filters.locale)] : []),
        ...(filters.winner ? [eq(subscribers.archetype, filters.winner)] : []),
      )),

    // Воронка считается по прохождениям, не по событиям: один человек,
    // перезагрузивший вопрос трижды, это один дошедший, а не три.
    db
      .select({
        step: funnelEvents.step,
        event: funnelEvents.event,
        runs: sql<number>`count(distinct ${funnelEvents.runToken})::int`,
      })
      .from(funnelEvents)
      .where(funnelIn)
      .groupBy(funnelEvents.step, funnelEvents.event),

    db
      .select({
        step: funnelEvents.step,
        answerCode: funnelEvents.answerCode,
        runs: sql<number>`count(distinct ${funnelEvents.runToken})::int`,
      })
      .from(funnelEvents)
      .where(and(funnelIn, eq(funnelEvents.event, 'answer')))
      .groupBy(funnelEvents.step, funnelEvents.answerCode),

    db
      .select({
        browserKey: submissions.browserKey,
        runIndex: submissions.runIndex,
        winner: submissions.winner,
      })
      .from(submissions)
      .where(done)
      .orderBy(submissions.browserKey, submissions.runIndex),

    db
      .select({
        id: submissions.id,
        createdAt: submissions.createdAt,
        locale: submissions.locale,
        winner: submissions.winner,
        secondary: submissions.secondary,
        runIndex: submissions.runIndex,
        consentResearch: submissions.consentResearch,
        completed: submissions.completed,
        openAnswer: submissions.openAnswer,
        answers: submissions.answers,
      })
      .from(submissions)
      .where(inPeriod)
      .orderBy(desc(submissions.createdAt))
      .limit(60),

    // Открытый ответ — то, чего ни один вариант из списка не даёт:
    // человек пишет своими словами. Поэтому он вынесен отдельным
    // блоком, а не спрятан внутрь карточки прохождения.
    db
      .select({
        createdAt: submissions.createdAt,
        locale: submissions.locale,
        winner: submissions.winner,
        runIndex: submissions.runIndex,
        completed: submissions.completed,
        text: submissions.openAnswer,
      })
      .from(submissions)
      .where(and(inPeriod, isNotNull(submissions.openAnswer),
        ne(submissions.openAnswer, '')))
      .orderBy(desc(submissions.createdAt))
      .limit(300),

    /* Тексты «Other» внутри вопросов. Лежат отдельной таблицей, потому
       что их у одного прохождения может быть до девяти — по одному на
       вопрос. Архетип и язык берём из самого прохождения: читать ответ
       «пахнет бабушкиной кухней», не зная, кем человек оказался, — это
       только половина смысла. */
    db
      .select({
        submissionId: questionOpenAnswers.submissionId,
        questionId: questionOpenAnswers.questionId,
        text: questionOpenAnswers.text,
        createdAt: questionOpenAnswers.createdAt,
        locale: submissions.locale,
        winner: submissions.winner,
        runIndex: submissions.runIndex,
        completed: submissions.completed,
      })
      .from(questionOpenAnswers)
      .innerJoin(submissions, eq(questionOpenAnswers.submissionId, submissions.id))
      .where(inPeriod)
      .orderBy(desc(questionOpenAnswers.createdAt))
      .limit(1200),
  ]);

  const c = countRows[0] ?? {
    runs: 0, firstRuns: 0, repeatRuns: 0, noKey: 0, browsers: 0, consented: 0,
  };
  const s = subscriberRows[0] ?? { emails: 0, emailsSent: 0 };

  // ── воронка ────────────────────────────────────────────────────────────
  const views = new Map<string, number>();
  const answered = new Map<string, number>();
  for (const r of funnelRows) {
    (r.event === 'view' ? views : answered).set(r.step, r.runs);
  }
  const order = stepOrder();
  const seen = new Set([...views.keys(), ...answered.keys()]);
  const present = order.filter((step) => seen.has(step));
  const head = present.length ? (views.get(present[0]) ?? 0) : 0;

  const funnel: FunnelStep[] = present.map((step) => {
    const v = views.get(step) ?? 0;
    const a = answered.get(step) ?? 0;
    const terminal = step === 'RESULT' || step === 'EMAIL_SENT';
    return {
      step,
      isBranch: (EMOTION_BRANCHES as readonly string[]).includes(step),
      views: v,
      answers: a,
      lost: terminal ? 0 : Math.max(0, v - a),
      fromStart: head ? v / head : 0,
    };
  });

  // ── что выбирают ───────────────────────────────────────────────────────
  const byStep = new Map<string, Array<{ label: string | null; n: number }>>();
  for (const r of answerRows) {
    if (!r.answerCode) continue;   // страна и открытый ответ — не варианты
    byStep.set(r.step, [
      ...(byStep.get(r.step) ?? []),
      { label: r.answerCode.replace(`${r.step}__`, ''), n: r.runs },
    ]);
  }
  const answers = order
    .filter((step) => byStep.has(step))
    .map((step) => {
      const options = toSlices(byStep.get(step) ?? []);
      return {
        step,
        title: QUESTION_COPY[step]?.title ?? step,
        total: options.reduce((x, o) => x + o.n, 0),
        options,
      };
    });

  // ── повторы ────────────────────────────────────────────────────────────
  const byBrowser = new Map<string, string[]>();
  for (const r of chainRows) {
    if (!r.browserKey) continue;
    byBrowser.set(r.browserKey, [...(byBrowser.get(r.browserKey) ?? []), r.winner]);
  }
  const chains: Chain[] = [...byBrowser.values()]
    .filter((runs) => runs.length > 1)
    .map((runs) => ({ runs, changed: new Set(runs).size > 1 }));

  // ── «Other» по вопросам ────────────────────────────────────────────────
  // Порядок вопросов — прохождения квиза, а не тот, в котором строки
  // легли в базу: заказчица читает это сверху вниз как сам квиз.
  const byQuestion = new Map<string, QuestionOpens['texts']>();
  /* Те же строки, разложенные по прохождениям: карточка прохождения
     должна показывать не только «Other», но и что именно человек
     написал — иначе в ней на этом месте пустое слово «Other». */
  const opensByRun = new Map<string, Record<string, string>>();
  for (const r of questionOpenRows) {
    byQuestion.set(r.questionId, [...(byQuestion.get(r.questionId) ?? []), r]);
    const bag = opensByRun.get(r.submissionId) ?? {};
    bag[r.questionId] = r.text;
    opensByRun.set(r.submissionId, bag);
  }
  const questionOpens: QuestionOpens[] = OPEN_QUESTION_IDS
    .filter((id) => byQuestion.has(id))
    .map((id) => ({
      questionId: id,
      prompt: OPEN_PROMPTS[id] ?? id,
      title: QUESTION_COPY[id]?.title ?? id,
      texts: byQuestion.get(id) ?? [],
    }));

  return {
    days,
    filters,
    funnelNarrowed,
    since,
    totals: {
      runs: c.runs,
      abandoned: abandonedRows[0]?.abandoned ?? 0,
      firstRuns: c.firstRuns,
      repeatRuns: c.repeatRuns,
      noKey: c.noKey,
      browsers: c.browsers,
      consented: c.consented,
      emails: s.emails,
      emailsSent: s.emailsSent,
    },
    archetypes: toArchetypeRows(archetypeRows),
    locales: toSlices(localeRows),
    funnel,
    answers,
    openAnswers: openRows.map((r) => ({ ...r, text: r.text ?? '' })),
    openAnswerTotal: openRows.length,
    questionOpens,
    questionOpenTotal: questionOpenRows.length,
    chains: chains.slice(0, 40),
    chainsSame: chains.filter((x) => !x.changed).length,
    chainsChanged: chains.filter((x) => x.changed).length,
    // id прохождения наружу не отдаём: он нужен только чтобы подцепить
    // тексты «Other», а на странице показывать его нечего.
    recent: recentRows.map(({ id, answers: raw, ...rest }) => ({
      ...rest,
      answers: (raw ?? {}) as Record<string, string>,
      opens: opensByRun.get(id) ?? {},
    })),
  };
}

/**
 * Прохождения в CSV — чтобы считать в таблице то, чего нет на странице.
 * Колонки фиксированы порядком вопросов, а не тем, что попалось в первой
 * строке: иначе файлы за разные периоды не складываются друг с другом.
 */
export async function submissionsCsv(
  days: number,
  firstRunsOnly: boolean,
  filters: AdminFilters = {},
): Promise<string> {
  const db = getDb();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  /* Те же срезы, что и на странице: выгрузка обязана содержать ровно то,
     что человек видел, когда нажимал «скачать». Иначе цифры в таблице не
     сойдутся с цифрами на экране, и доверять не будешь ни тем ни другим. */
  const where = and(
    gte(submissions.createdAt, since),
    ...(firstRunsOnly ? [eq(submissions.runIndex, 1)] : []),
    ...(filters.locale ? [eq(submissions.locale, filters.locale)] : []),
    ...(filters.winner ? [eq(submissions.winner, filters.winner)] : []),
    ...(filters.consent !== undefined
      ? [eq(submissions.consentResearch, filters.consent)] : []),
  )!;

  const [rows, openRows] = await Promise.all([
    db
      .select({
        id: submissions.id,
        createdAt: submissions.createdAt,
        locale: submissions.locale,
        winner: submissions.winner,
        secondary: submissions.secondary,
        runIndex: submissions.runIndex,
        consentResearch: submissions.consentResearch,
        completed: submissions.completed,
        openAnswer: submissions.openAnswer,
        answers: submissions.answers,
      })
      .from(submissions)
      .where(where)
      .orderBy(desc(submissions.createdAt)),

    /* Тексты «Other» тем же запросом не взять: их у прохождения до
       девяти, и join размножил бы строки. Забираем отдельно и
       раскладываем по колонкам — по одной на вопрос. */
    db
      .select({
        submissionId: questionOpenAnswers.submissionId,
        questionId: questionOpenAnswers.questionId,
        text: questionOpenAnswers.text,
      })
      .from(questionOpenAnswers)
      .innerJoin(submissions, eq(questionOpenAnswers.submissionId, submissions.id))
      .where(where),
  ]);

  const opensById = new Map<string, Record<string, string>>();
  for (const r of openRows) {
    const bag = opensById.get(r.submissionId) ?? {};
    bag[r.questionId] = r.text;
    opensById.set(r.submissionId, bag);
  }

  const questionIds = Object.keys(QUESTIONS);
  const header = [
    'created_at', 'locale', 'winner', 'secondary', 'run_index', 'consent_research',
    ...questionIds,
    // Своими словами внутри вопроса — отдельной колонкой на каждый из
    // девяти вопросов, где есть «Other». Рядом с кодом ответа: в колонке
    // Q_CALM будет Q_CALM__OTHER, а в open_Q_CALM — что человек написал.
    ...OPEN_QUESTION_IDS.map((id) => `open_${id}`),
    'open_answer', 'answers_complete', 'missing_questions',
  ];

  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [header.join(',')];
  for (const r of rows) {
    const a = (r.answers ?? {}) as Record<string, string>;
    const opens = opensById.get(r.id) ?? {};
    lines.push([
      r.createdAt.toISOString(), r.locale, r.winner, r.secondary, r.runIndex,
      r.consentResearch,
      ...questionIds.map((id) => a[id] ?? ''),
      ...OPEN_QUESTION_IDS.map((id) => opens[id] ?? ''),
      r.openAnswer, missingQuestions(a).length === 0, missingQuestions(a).join(' '),
    ].map(esc).join(','));
  }
  // BOM: иначе Excel читает UTF-8 как cp1251 и ломает французские ответы.
  return `﻿${lines.join('\r\n')}\r\n`;
}
