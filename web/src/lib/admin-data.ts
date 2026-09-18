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
 * run_index = 1. Распределения архетипов и ответов считаются по первым
 * прохождениям, иначе один человек, прошедший тест сто раз, перевесит сто
 * разных людей. Повторы не выбрасываются — они показаны отдельно, и это
 * свой материал: изменился ли архетип, когда тот же браузер вернулся.
 */
import { and, desc, eq, gte, isNotNull, ne, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { missingQuestions } from './quiz-state';
import { QUESTIONS, EMOTION_BRANCHES } from '@/lib/quiz';
import { QUESTION_COPY } from '@/data/question-titles';
import openPrompts from '@/data/question-open-prompts.json';

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

export type AdminData = {
  days: number;
  since: Date;
  totals: Totals;
  archetypes: Slice[];
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

export async function loadAdminData(days: number): Promise<AdminData> {
  const db = getDb();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  const inPeriod = gte(submissions.createdAt, since);
  // Завершённые: всё, что описывает прохождения и ответы, считается по ним.
  const done = and(inPeriod, eq(submissions.completed, true));
  const firstRunsOnly = and(done, eq(submissions.runIndex, 1));

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

    // Архетипы — по первым прохождениям. См. правило в заголовке файла.
    db
      .select({ label: submissions.winner, n: sql<number>`count(*)::int` })
      .from(submissions)
      .where(firstRunsOnly)
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
      .where(gte(subscribers.createdAt, since)),

    // Воронка считается по прохождениям, не по событиям: один человек,
    // перезагрузивший вопрос трижды, это один дошедший, а не три.
    db
      .select({
        step: funnelEvents.step,
        event: funnelEvents.event,
        runs: sql<number>`count(distinct ${funnelEvents.runToken})::int`,
      })
      .from(funnelEvents)
      .where(gte(funnelEvents.createdAt, since))
      .groupBy(funnelEvents.step, funnelEvents.event),

    db
      .select({
        step: funnelEvents.step,
        answerCode: funnelEvents.answerCode,
        runs: sql<number>`count(distinct ${funnelEvents.runToken})::int`,
      })
      .from(funnelEvents)
      .where(and(gte(funnelEvents.createdAt, since), eq(funnelEvents.event, 'answer')))
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
    archetypes: toSlices(archetypeRows),
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
export async function submissionsCsv(days: number, firstRunsOnly: boolean): Promise<string> {
  const db = getDb();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  const where = firstRunsOnly
    ? and(gte(submissions.createdAt, since), eq(submissions.runIndex, 1))
    : gte(submissions.createdAt, since);

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
