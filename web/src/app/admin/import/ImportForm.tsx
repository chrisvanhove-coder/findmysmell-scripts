'use client';

import { useActionState } from 'react';
import styles from '../admin.module.css';

/**
 * Форма загрузки и отчёт. Клиентская, потому что состояние между
 * отправками надо где-то держать: серверное действие возвращает сводку,
 * и её нужно показать, не потеряв при перерисовке.
 *
 * В браузер уходит только сводка — числа и номера строк. Сами прохождения
 * и адреса остаются на сервере: гнать их сюда незачем.
 */

export type ImportState =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | {
      kind: 'done';
      apply: boolean;
      withEmails: boolean;
      fileName: string;
      sheets: Array<{ name: string; rows: number }>;
      total: number;
      withOpen: number;
      withEmail: number;
      from: string | null;
      to: string | null;
      bySheet: Array<{ name: string; n: number }>;
      archetypes: Array<{ name: string; n: number }>;
      rescored: Array<{
        sheet: string; line: number; date: string; winner: string; open: string | null;
      }>;
      collisions: Array<{
        sheet: string; line: number; open: string;
        otherSheet: string; otherLine: number; otherOpen: string;
      }>;
      skippedTotal: number;
      skipped: Array<{ group: string; lines: number[] }>;
      written: {
        runsInserted: number;
        runsAlreadyThere: number;
        emailsInserted: number;
        emailsSeen: number;
        emailsWithoutConsent: number;
        totalHistoric: number;
        totalRuns: number;
      } | null;
    };

export default function ImportForm({
  action,
}: {
  action: (formData: FormData) => Promise<ImportState>;
}) {
  const [state, submit, pending] = useActionState<ImportState, FormData>(
    async (_prev, formData) => action(formData),
    { kind: 'idle' },
  );

  return (
    <>
      <form action={submit} className={styles.importForm}>
        <label className={styles.importFile}>
          <span>Файл выгрузки</span>
          <input type="file" name="sheet" accept=".xlsx,.xls,.csv" required />
        </label>

        <label className={styles.importCheck}>
          <input type="checkbox" name="apply" />
          <span>
            <b>Записать в базу.</b> Без галочки файл только разбирается и показывается отчёт.
          </span>
        </label>

        <label className={styles.importCheck}>
          <input type="checkbox" name="emails" defaultChecked />
          <span>
            Переносить в подписчиков только адреса с явным согласием на email в таблице.
            Импорт не отправляет письма и не подтверждает их прежнюю доставку.
          </span>
        </label>

        <button type="submit" className={styles.importBtn} disabled={pending}>
          {pending ? 'Разбираю…' : 'Разобрать файл'}
        </button>
      </form>

      {state.kind === 'error' && <p className={styles.error}>{state.message}</p>}

      {state.kind === 'done' && (
        <>
          {state.written ? (
            <section className={styles.importResult}>
              <h2 className={styles.h2}>Записано</h2>
              <div className={styles.cards}>
                <div className={`${styles.card} ${styles.cardKey}`}>
                  <span className={styles.cardN}>{state.written.runsInserted}</span>
                  <span className={styles.cardL}>новых прохождений</span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardN}>{state.written.runsAlreadyThere}</span>
                  <span className={styles.cardL}>уже были, пропущены</span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardN}>{state.written.emailsInserted}</span>
                  <span className={styles.cardL}>
                    новых адресов из {state.written.emailsSeen}
                    {state.written.emailsWithoutConsent > 0
                      && `; без согласия на email пропущено ${state.written.emailsWithoutConsent}`}
                    {!state.withEmails && ' (перенос адресов выключен)'}
                  </span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardN}>{state.written.totalRuns}</span>
                  <span className={styles.cardL}>
                    всего в базе, из них исторических {state.written.totalHistoric}
                  </span>
                </div>
              </div>
            </section>
          ) : (
            <p className={styles.note}>
              <b>Ничего не записано</b> — это только разбор. Чтобы записать, отметьте галочку
              «Записать в базу» и отправьте файл снова.
            </p>
          )}

          <section className={styles.block}>
            <h2 className={styles.h2}>
              Что поедет <small>{state.fileName}</small>
            </h2>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <th scope="row">Прохождений</th>
                  <td className={styles.num}>{state.total}</td>
                  <td>
                    {state.bySheet.map((s) => `${s.name}: ${s.n}`).join(' · ')}
                  </td>
                </tr>
                <tr>
                  <th scope="row">С открытым ответом</th>
                  <td className={styles.num}>{state.withOpen}</td>
                  <td />
                </tr>
                <tr>
                  <th scope="row">С адресом почты</th>
                  <td className={styles.num}>{state.withEmail}</td>
                  <td />
                </tr>
                <tr>
                  <th scope="row">Период</th>
                  <td colSpan={2}>{state.from} … {state.to}</td>
                </tr>
                <tr>
                  <th scope="row">Листов в файле</th>
                  <td colSpan={2}>
                    {state.sheets.map((s) => `${s.name} (${s.rows})`).join(' · ')}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {state.rescored.length > 0 && (
            <section className={styles.block}>
              <h2 className={styles.h2}>
                Пересчитаны баллы
                <small>в таблице были нули, архетип пересчитан вместе с ними</small>
              </h2>
              <ul className={styles.quotes}>
                {state.rescored.map((r, i) => (
                  <li key={i} className={styles.quote}>
                    <p className={styles.quoteText}>
                      {r.winner}
                      {r.open ? ` — «${r.open}»` : ''}
                    </p>
                    <p className={styles.quoteMeta}>{r.date} · {r.sheet}, строка {r.line}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.collisions.length > 0 && (
            <section className={styles.block}>
              <h2 className={styles.h2}>
                Одинаковые ответы, но разный текст
                <small>оставлены оба — похоже на разных людей</small>
              </h2>
              <ul className={styles.quotes}>
                {state.collisions.map((c, i) => (
                  <li key={i} className={styles.quote}>
                    <p className={styles.quoteText}>«{c.open}»</p>
                    <p className={styles.quoteText}>против «{c.otherOpen}»</p>
                    <p className={styles.quoteMeta}>
                      {c.sheet} стр {c.line} и {c.otherSheet} стр {c.otherLine}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.block}>
            <h2 className={styles.h2}>
              Исключено <small>{state.skippedTotal}</small>
            </h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.num}>строк</th>
                  <th>причина</th>
                  <th>номера строк</th>
                </tr>
              </thead>
              <tbody>
                {state.skipped.map((s) => (
                  <tr key={s.group}>
                    <td className={styles.num}>{s.lines.length}</td>
                    <th scope="row" className={styles.optLabel}>{s.group}</th>
                    <td className={styles.skipLines}>{s.lines.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={styles.block}>
            <h2 className={styles.h2}>Архетипы в переносе</h2>
            <table className={styles.table}>
              <tbody>
                {state.archetypes.map((a) => (
                  <tr key={a.name}>
                    <th scope="row">{a.name}</th>
                    <td className={styles.num}>{a.n}</td>
                    <td className={styles.num}>
                      {((a.n / state.total) * 100).toFixed(1)}%
                    </td>
                    <td className={styles.barCell}>
                      <span className={styles.bar}>
                        <span
                          className={styles.barFill}
                          style={{ width: `${(a.n / state.total) * 100}%` }}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  );
}
