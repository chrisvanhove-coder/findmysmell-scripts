/**
 * Выборки для админки. Та же арифметика, что в scripts/funnel-report.mts,
 * но на странице, а не в терминале: заказчице нужно смотреть ответы, не
 * ставя себе клиент Postgres.
 *
 * Одно правило проходит через весь файл: ВЫБОРКА ДЛЯ ИССЛЕДОВАНИЯ — ЭТО
 * run_index = 1. Распределения архетипов и ответов считаются по первым
 * прохождениям, иначе один человек, прошедший тест сто раз, перевесит сто
 * разных людей. Повторы не выбрасываются — они показаны отдельно, и это
 * свой материал: изменился ли архетип, когда тот же браузер вернулся.
 */
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { QUESTIONS, EMOTION_BRANCHES } from '@/lib/quiz';
import { QUESTION_COPY } from '@/data/question-titles';

const { submissions, subscribers, funnelEvents } = schema;

export type Totals = {
  runs: number;
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
  openAnswer: string | null;
  answers: Record<string, string>;
};

export type Chain = { runs: string[]; changed: boolean };

export type AdminData = {
  days: number;
  since: Date;
  totals: Totals;
  archetypes: Slice[];
  locales: Slice[];
  funnel: FunnelStep[];
  answers: Array<{ step: string; title: string; total: number; options: Slice[] }>;
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
  const firstRunsOnly = and(inPeriod, eq(submissions.runIndex, 1));

  const [
    countRows,
    archetypeRows,
    localeRows,
    subscriberRows,
    funnelRows,
    answerRows,
    chainRows,
    recentRows,
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
      .where(inPeriod),

    // Архетипы — по первым прохождениям. См. правило в заголовке файла.
    db
      .select({ label: submissions.winner, n: sql<number>`count(*)::int` })
      .from(submissions)
      .where(firstRunsOnly)
      .groupBy(submissions.winner),

    db
      .select({ label: submissions.locale, n: sql<number>`count(*)::int` })
      .from(submissions)
      .where(inPeriod)
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
      .where(inPeriod)
      .orderBy(submissions.browserKey, submissions.runIndex),

    db
      .select({
        createdAt: submissions.createdAt,
        locale: submissions.locale,
        winner: submissions.winner,
        secondary: submissions.secondary,
        runIndex: submissions.runIndex,
        consentResearch: submissions.consentResearch,
        openAnswer: submissions.openAnswer,
        answers: submissions.answers,
      })
      .from(submissions)
      .where(inPeriod)
      .orderBy(desc(submissions.createdAt))
      .limit(60),
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

  return {
    days,
    since,
    totals: {
      runs: c.runs,
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
    chains: chains.slice(0, 40),
    chainsSame: chains.filter((x) => !x.changed).length,
    chainsChanged: chains.filter((x) => x.changed).length,
    recent: recentRows.map((r) => ({
      ...r,
      answers: (r.answers ?? {}) as Record<string, string>,
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

  const rows = await db
    .select({
      createdAt: submissions.createdAt,
      locale: submissions.locale,
      winner: submissions.winner,
      secondary: submissions.secondary,
      runIndex: submissions.runIndex,
      consentResearch: submissions.consentResearch,
      openAnswer: submissions.openAnswer,
      answers: submissions.answers,
    })
    .from(submissions)
    .where(where)
    .orderBy(desc(submissions.createdAt));

  const questionIds = Object.keys(QUESTIONS);
  const header = [
    'created_at', 'locale', 'winner', 'secondary', 'run_index', 'consent_research',
    ...questionIds, 'open_answer',
  ];

  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [header.join(',')];
  for (const r of rows) {
    const a = (r.answers ?? {}) as Record<string, string>;
    lines.push([
      r.createdAt.toISOString(), r.locale, r.winner, r.secondary, r.runIndex,
      r.consentResearch,
      ...questionIds.map((id) => a[id] ?? ''),
      r.openAnswer,
    ].map(esc).join(','));
  }
  // BOM: иначе Excel читает UTF-8 как cp1251 и ломает французские ответы.
  return `﻿${lines.join('\r\n')}\r\n`;
}
