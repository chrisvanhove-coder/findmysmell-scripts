import Link from 'next/link';
import { loadAdminData, type AdminFilters } from '@/lib/admin-data';
import { missingQuestions } from '@/lib/quiz-state';
import { QUESTIONS } from '@/lib/quiz';
import { QUESTION_COPY } from '@/data/question-titles';
import { LOCALES } from '@/lib/i18n';
import archetypesEn from '@/data/archetypes.en.json';
import styles from './admin.module.css';

// Смысл страницы в том, чтобы показывать сегодняшнее состояние базы,
// поэтому никакого кеша и никакой предсборки.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Find My Smell — данные', robots: 'noindex, nofollow' };

const PERIODS = [7, 30, 90, 365, 3650];

/* Список архетипов берётся из данных, а не из того, что нашлось в базе:
   иначе архетип, который ещё никому не выпал, пропал бы из фильтра — и
   именно его нельзя было бы проверить. */
const ARCHETYPES = Object.keys(archetypesEn);

const CONSENT_CHOICES = [
  { value: '', label: 'все' },
  { value: '1', label: 'дали согласие' },
  { value: '0', label: 'без согласия' },
] as const;

/** Адрес страницы с тем же набором срезов, но одним изменённым. */
function href(
  base: { days: number; locale?: string; winner?: string; consent?: string },
  patch: Partial<{ days: number; locale: string; winner: string; consent: string }>,
): string {
  const next = { ...base, ...patch };
  const p = new URLSearchParams();
  if (next.days !== 30) p.set('days', String(next.days));
  if (next.locale) p.set('locale', next.locale);
  if (next.winner) p.set('winner', next.winner);
  if (next.consent) p.set('consent', next.consent);
  const q = p.toString();
  return q ? `/admin?${q}` : '/admin';
}

function Choice({
  to, on, children,
}: { to: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={to} className={on ? `${styles.period} ${styles.periodOn}` : styles.period}>
      {children}
    </Link>
  );
}

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
  searchParams: Promise<{
    days?: string; locale?: string; winner?: string; consent?: string;
  }>;
}) {
  const sp = await searchParams;
  const days = PERIODS.includes(Number(sp.days)) ? Number(sp.days) : 30;

  /* Значения из адреса сверяются со списками, а не подставляются в запрос
     как есть: чужая строка в параметре не должна ни падать, ни что-то
     значить. Не узнали — считаем, что фильтра нет. */
  const locale = (LOCALES as readonly string[]).includes(sp.locale ?? '')
    ? sp.locale : undefined;
  const winner = ARCHETYPES.includes(sp.winner ?? '') ? sp.winner : undefined;
  const consent = sp.consent === '1' ? true : sp.consent === '0' ? false : undefined;
  const filters: AdminFilters = { locale, winner, consent };
  const chosen = {
    days,
    locale,
    winner,
    consent: consent === undefined ? '' : consent ? '1' : '0',
  };

  let data: Awaited<ReturnType<typeof loadAdminData>>;
  try {
    data = await loadAdminData(days, filters);
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
            <Choice key={d} to={href(chosen, { days: d })} on={d === days}>
              {periodLabel(d)}
            </Choice>
          ))}
        </nav>
      </header>

      {/* ── срезы ─────────────────────────────────────────────────────────
          Каждый ряд меняет только свой параметр и сохраняет остальные:
          выбрав французский, не теряешь выбранный период. */}
      <div className={styles.filters}>
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>язык</span>
          <Choice to={href(chosen, { locale: '' })} on={!locale}>все</Choice>
          {LOCALES.map((l) => (
            <Choice key={l} to={href(chosen, { locale: l })} on={locale === l}>{l}</Choice>
          ))}
        </div>

        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>архетип</span>
          <Choice to={href(chosen, { winner: '' })} on={!winner}>все</Choice>
          {ARCHETYPES.map((a) => (
            <Choice key={a} to={href(chosen, { winner: a })} on={winner === a}>{a}</Choice>
          ))}
        </div>

        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>исследование</span>
          {CONSENT_CHOICES.map((c) => (
            <Choice
              key={c.value}
              to={href(chosen, { consent: c.value })}
              on={chosen.consent === c.value}
            >
              {c.label}
            </Choice>
          ))}
        </div>
      </div>

      <p className={styles.note}>
        Период: с {data.since.toISOString().slice(0, 10)}. Распределения архетипов и ответов
        считаются по <b>первым</b> прохождениям — один браузер даёт в выборку одну строку.
        Повторы показаны отдельно, ниже.
        {consent === false && (
          <>
            {' '}
            <b>«Без согласия» — это не только отказ:</b> галочку показывают на последнем
            экране, поэтому сюда попадают и те, кто до неё не дошёл. Различать по отметке
            «брошено» в списке прохождений.
          </>
        )}
      </p>

      {/* ── итоги ─────────────────────────────────────────────────────── */}
      <section className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardN}>{t.runs}</span>
          <span className={styles.cardL}>завершённых прохождений</span>
        </div>
        {/* Брошенные считаются отдельно и в распределения не входят: у них
            тоже есть архетип, но посчитан он по части ответов. */}
        <div className={styles.card}>
          <span className={styles.cardN}>{t.abandoned}</span>
          <span className={styles.cardL}>
            брошено на полпути
            {t.runs + t.abandoned
              ? ` · ${pct(t.abandoned / (t.runs + t.abandoned))}`
              : ''}
          </span>
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
        <a href="#open">своими словами</a>
        <a href="#question-open">«Other» по вопросам</a>
        <a href="#archetypes">архетипы</a>
        <a href="#repeats">повторы</a>
        <a href="#funnel">воронка</a>
        <a href="#answers">что выбирают</a>
        <a href="#recent">последние прохождения</a>
      </nav>

      <section className={styles.exports}>
        <span>Перенос из старой таблицы:</span>
        <Link href="/admin/import">загрузить выгрузку Google Sheets</Link>
      </section>

      <section className={styles.exports}>
        <span>Скачать сводку по архетипам:</span>
        <a href={`/admin/archetypes.csv${href(chosen, {}).replace('/admin', '')}`}>
          сколько кому выпало
        </a>
      </section>

      <section className={styles.exports}>
        <span>Скачать прохождения таблицей:</span>
        <a href={`/admin/submissions.csv${href(chosen, {}).replace('/admin', '')}${
          href(chosen, {}).includes('?') ? '&' : '?'}first=1`}>только первые (выборка)</a>
        <a href={`/admin/submissions.csv${href(chosen, {}).replace('/admin', '')}`}>
          все, с повторами
        </a>
      </section>

      {/* ── открытые ответы ───────────────────────────────────────────── */}
      {/* Первым блоком намеренно: это единственное место в квизе, где
          человек пишет своими словами, и ни одно распределение по
          вариантам этого не заменит. */}
      <section className={styles.block} id="open">
        <h2 className={styles.h2}>
          Своими словами
          <small>
            {data.openAnswerTotal} из {t.runs} прохождений
            {t.runs ? ` · ${pct(data.openAnswerTotal / t.runs)}` : ''}
          </small>
        </h2>
        {data.openAnswers.length === 0 ? (
          <p className={styles.empty}>
            За период никто не написал ничего в последнем вопросе.
          </p>
        ) : (
          <ul className={styles.quotes}>
            {data.openAnswers.map((o, i) => (
              <li key={i} className={styles.quote}>
                <p className={styles.quoteText}>{o.text}</p>
                <p className={styles.quoteMeta}>
                  {o.createdAt.toISOString().slice(0, 10)}
                  {' · '}
                  <b>{o.winner}</b>
                  {' · '}
                  {o.locale}
                  {o.runIndex && o.runIndex > 1 ? ` · проход №${o.runIndex}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── «Other» внутри вопросов ───────────────────────────────────── */}
      {/* Сразу за последним открытым вопросом: это тоже слова людей, но
          сказанные про конкретное — «а как для тебя пахнет спокойствие».
          Разложено по вопросам, потому что вперемешку это не читается. */}
      <section className={styles.block} id="question-open">
        <h2 className={styles.h2}>
          «Other» по вопросам
          <small>{data.questionOpenTotal} ответов своими словами внутри вопросов</small>
        </h2>
        {data.questionOpens.length === 0 ? (
          <p className={styles.empty}>
            За период никто не выбирал «Other» с текстом. Учтите: до 16 сентября
            2026 года эти ответы писались в то же поле, что и последний вопрос,
            и там не сохранялись — отдельные поля появились только теперь.
          </p>
        ) : (
          data.questionOpens.map((q) => (
            <div key={q.questionId} className={styles.question}>
              <h3 className={styles.h3}>
                {q.prompt} <small>{q.questionId} · {q.texts.length}</small>
              </h3>
              <ul className={styles.quotes}>
                {q.texts.map((o, i) => (
                  <li key={i} className={styles.quote}>
                    <p className={styles.quoteText}>{o.text}</p>
                    <p className={styles.quoteMeta}>
                      {o.createdAt.toISOString().slice(0, 10)}
                      {' · '}
                      <b>{o.winner}</b>
                      {' · '}
                      {o.locale}
                      {o.runIndex && o.runIndex > 1 ? ` · проход №${o.runIndex}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {/* ── архетипы ──────────────────────────────────────────────────── */}
      <section className={styles.block} id="archetypes">
        <h2 className={styles.h2}>
          Архетипы <small>по всем завершённым, {t.runs}</small>
        </h2>
        {t.runs === 0 ? (
          <p className={styles.empty}>Пока ни одного завершённого прохождения.</p>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">архетип</th>
                  <th scope="col" className={styles.num}>всего</th>
                  <th scope="col" className={styles.num}>первые</th>
                  <th scope="col" className={styles.num}>старые</th>
                  <th scope="col" className={styles.num}>повторы</th>
                  <th scope="col" className={styles.num}>доля</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {data.archetypes.map((a) => (
                  <tr key={a.label}>
                    <th scope="row">{a.label}</th>
                    <td className={styles.num}>{a.all}</td>
                    <td className={styles.num}>{a.first}</td>
                    <td className={styles.num}>{a.historic}</td>
                    <td className={styles.num}>{a.repeat}</td>
                    <td className={styles.num}>{pct(a.share)}</td>
                    <td className={styles.barCell}><Bar share={a.share} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Четыре колонки без подписи — это четыре повода для неверного
                вывода. «Всего» складывается из трёх следующих. */}
            <p className={styles.note}>
              «Всего» — все завершённые прохождения, доля и полоска считаются от
              него. «Первые» — выборка для исследования: один человек, один
              голос. «Старые» — перенесённые со старого сайта: ключа браузера
              тогда не было, поэтому в «первые» они не попадают, хотя это живые
              люди, а не повторы. «Повторы» — тот же браузер вернулся ещё раз.
            </p>
          </>
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
        {!data.funnelNarrowed && (
          <p className={styles.note}>
            ⚠ Воронка и распределение ответов <b>НЕ сужены</b> выбранными срезами:
            они считаются по событиям экранов, а там нет ни архетипа, ни согласия —
            в момент показа вопроса ни того ни другого ещё не существует. Язык там
            есть, по нему сужается. Ниже — все прохождения за период.
          </p>
        )}
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
                    {r.completed
                      ? ' · все вопросы отвечены'
                      : ` · брошено: пропущено ${missingQuestions(r.answers).length}`}
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
                      // На «Other» показываем написанное, а не слово
                      // «Other»: в карточке оно ничего не значит.
                      const written = r.opens[id];
                      return (
                        <div key={id} className={styles.answerRow}>
                          <dt>{QUESTION_COPY[id]?.title ?? id}</dt>
                          <dd>
                            {label}
                            {written && (
                              <em className={styles.written}>«{written}»</em>
                            )}
                          </dd>
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
