import Link from 'next/link';
import { loadAdminData } from '@/lib/admin-data';
import { QUESTIONS } from '@/lib/quiz';
import { QUESTION_COPY } from '@/data/question-titles';
import styles from './admin.module.css';

// Смысл страницы в том, чтобы показывать сегодняшнее состояние базы,
// поэтому никакого кеша и никакой предсборки.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Find My Smell — данные', robots: 'noindex, nofollow' };

const PERIODS = [7, 30, 90, 365, 3650];

function periodLabel(days: number) {
  if (days >= 3650) return 'всё время';
  if (days === 365) return 'год';
  return `${days} дн.`;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function Bar({ share }: { share: number }) {
  return (
    <span className={styles.bar} aria-hidden>
      <span className={styles.barFill} style={{ width: `${Math.max(share * 100, 0.6)}%` }} />
    </span>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const days = PERIODS.includes(Number(sp.days)) ? Number(sp.days) : 30;

  let data: Awaited<ReturnType<typeof loadAdminData>>;
  try {
    data = await loadAdminData(days);
  } catch (error) {
    // База может быть недоступна — страница обязана сказать об этом словами,
    // а не отдать 500 без объяснения.
    return (
      <main className={styles.page}>
        <h1 className={styles.h1}>Данные</h1>
        <p className={styles.error}>
          База не ответила. {error instanceof Error ? error.message : String(error)}
        </p>
      </main>
    );
  }

  const t = data.totals;

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <h1 className={styles.h1}>Find My Smell — данные</h1>
        <nav className={styles.periods}>
          {PERIODS.map((d) => (
            <Link
              key={d}
              href={`/admin?days=${d}`}
              className={d === days ? `${styles.period} ${styles.periodOn}` : styles.period}
            >
              {periodLabel(d)}
            </Link>
          ))}
        </nav>
      </header>

      <p className={styles.note}>
        Период: с {data.since.toISOString().slice(0, 10)}. Распределения архетипов и ответов
        считаются по <b>первым</b> прохождениям — один браузер даёт в выборку одну строку.
        Повторы показаны отдельно, ниже.
      </p>

      {/* ── итоги ─────────────────────────────────────────────────────── */}
      <section className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardN}>{t.runs}</span>
          <span className={styles.cardL}>прохождений всего</span>
        </div>
        <div className={`${styles.card} ${styles.cardKey}`}>
          <span className={styles.cardN}>{t.firstRuns}</span>
          <span className={styles.cardL}>первых — это выборка</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardN}>{t.repeatRuns}</span>
          <span className={styles.cardL}>повторных</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardN}>{t.browsers}</span>
          <span className={styles.cardL}>разных браузеров</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardN}>{t.noKey}</span>
          <span className={styles.cardL}>без ключа (приватный режим)</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardN}>{t.consented}</span>
          <span className={styles.cardL}>
            согласились на исследование
            {t.runs ? ` · ${pct(t.consented / t.runs)}` : ''}
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardN}>{t.emails}</span>
          <span className={styles.cardL}>попросили письмо</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardN}>{t.emailsSent}</span>
          <span className={styles.cardL}>письмо реально ушло</span>
        </div>
      </section>

      {/* Страница длинная по существу: 17 распределений короче не станут. */}
      <nav className={styles.jump}>
        <a href="#archetypes">архетипы</a>
        <a href="#repeats">повторы</a>
        <a href="#funnel">воронка</a>
        <a href="#answers">что выбирают</a>
        <a href="#recent">последние прохождения</a>
      </nav>

      <section className={styles.exports}>
        <span>Скачать прохождения таблицей:</span>
        <a href={`/admin/submissions.csv?days=${days}&first=1`}>только первые (выборка)</a>
        <a href={`/admin/submissions.csv?days=${days}`}>все, с повторами</a>
      </section>

      {/* ── архетипы ──────────────────────────────────────────────────── */}
      <section className={styles.block} id="archetypes">
        <h2 className={styles.h2}>
          Архетипы <small>по первым прохождениям, {t.firstRuns}</small>
        </h2>
        {data.archetypes.length === 0 ? (
          <p className={styles.empty}>Пока ни одного прохождения с ключом браузера.</p>
        ) : (
          <table className={styles.table}>
            <tbody>
              {data.archetypes.map((a) => (
                <tr key={a.label}>
                  <th scope="row">{a.label}</th>
                  <td className={styles.num}>{a.n}</td>
                  <td className={styles.num}>{pct(a.share)}</td>
                  <td className={styles.barCell}><Bar share={a.share} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── повторы ───────────────────────────────────────────────────── */}
      <section className={styles.block} id="repeats">
        <h2 className={styles.h2}>
          Повторные прохождения
          {data.chains.length > 0 && (
            <small>
              меняется архетип у {data.chainsChanged} из {data.chainsChanged + data.chainsSame}
            </small>
          )}
        </h2>
        {data.chains.length === 0 ? (
          <p className={styles.empty}>
            Никто пока не проходил тест дважды в одном браузере.
          </p>
        ) : (
          <ul className={styles.chains}>
            {data.chains.map((chain, i) => (
              <li key={i} className={chain.changed ? styles.chainChanged : styles.chainSame}>
                {chain.runs.join(' → ')}
                {!chain.changed && <span className={styles.chainNote}>не изменился</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── воронка ───────────────────────────────────────────────────── */}
      <section className={styles.block} id="funnel">
        <h2 className={styles.h2}>
          Воронка <small>по прохождениям, не по событиям</small>
        </h2>
        {data.funnel.length === 0 ? (
          <p className={styles.empty}>Событий воронки за период нет.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>шаг</th>
                <th className={styles.num}>дошли</th>
                <th className={styles.num}>ответили</th>
                <th className={styles.num}>ушли тут</th>
                <th className={styles.num}>от начала</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.funnel.map((f) => (
                <tr key={f.step} className={f.isBranch ? styles.branchRow : undefined}>
                  <th scope="row">
                    {f.isBranch ? '└ ' : ''}
                    {f.step}
                  </th>
                  <td className={styles.num}>{f.views}</td>
                  <td className={styles.num}>{f.answers}</td>
                  <td className={styles.num}>{f.lost || '—'}</td>
                  <td className={styles.num}>{pct(f.fromStart)}</td>
                  <td className={styles.barCell}><Bar share={f.fromStart} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── что выбирают ──────────────────────────────────────────────── */}
      <section className={styles.block} id="answers">
        <h2 className={styles.h2}>Что выбирают</h2>
        {data.answers.length === 0 ? (
          <p className={styles.empty}>Ответов за период нет.</p>
        ) : (
          data.answers.map((q) => (
            <div key={q.step} className={styles.question}>
              <h3 className={styles.h3}>
                {q.title} <small>{q.step} · {q.total}</small>
              </h3>
              <table className={styles.table}>
                <tbody>
                  {q.options.map((o) => (
                    <tr key={o.label}>
                      <th scope="row" className={styles.optLabel}>
                        {QUESTIONS[q.step]?.answers.find(
                          (a) => a.code === `${q.step}__${o.label}`,
                        )?.label ?? o.label}
                      </th>
                      <td className={styles.num}>{o.n}</td>
                      <td className={styles.num}>{pct(o.share)}</td>
                      <td className={styles.barCell}><Bar share={o.share} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </section>

      {/* ── последние прохождения ─────────────────────────────────────── */}
      <section className={styles.block} id="recent">
        <h2 className={styles.h2}>
          Последние прохождения <small>{data.recent.length}, целиком</small>
        </h2>
        {data.recent.length === 0 ? (
          <p className={styles.empty}>Прохождений за период нет.</p>
        ) : (
          <div className={styles.runs}>
            {data.recent.map((r, i) => (
              <details key={i} className={styles.run}>
                <summary>
                  <span className={styles.runTime}>
                    {r.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </span>
                  <span className={styles.runWinner}>{r.winner}</span>
                  {r.secondary && <span className={styles.runSecond}>+ {r.secondary}</span>}
                  <span className={styles.runMeta}>
                    {r.locale}
                    {r.runIndex ? ` · проход №${r.runIndex}` : ' · без ключа'}
                    {r.consentResearch ? ' · согласие есть' : ' · без согласия'}
                  </span>
                </summary>
                <dl className={styles.answers}>
                  {Object.keys(QUESTIONS)
                    .filter((id) => r.answers[id] !== undefined)
                    .map((id) => {
                      const code = r.answers[id];
                      const label =
                        QUESTIONS[id]?.answers.find((a) => a.code === code)?.label ?? code;
                      return (
                        <div key={id} className={styles.answerRow}>
                          <dt>{QUESTION_COPY[id]?.title ?? id}</dt>
                          <dd>{label}</dd>
                        </div>
                      );
                    })}
                  {r.openAnswer && (
                    <div className={`${styles.answerRow} ${styles.openRow}`}>
                      <dt>Своими словами</dt>
                      <dd>{r.openAnswer}</dd>
                    </div>
                  )}
                </dl>
              </details>
            ))}
          </div>
        )}
      </section>

      <footer className={styles.foot}>
        Личных данных на этой странице нет: адреса живут в отдельной таблице и с
        прохождениями не связаны. Открытые ответы показаны как есть — их писали люди.
      </footer>
    </main>
  );
}
