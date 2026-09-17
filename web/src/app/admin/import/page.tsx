import Link from 'next/link';
import { parseSheet } from '@/lib/sheet-import';
import { writeRuns } from '@/lib/sheet-write';
import ImportForm, { type ImportState } from './ImportForm';
import styles from '../admin.module.css';

/**
 * Загрузка старой таблицы прямо в браузере, за тем же паролем, что и весь
 * /admin.
 *
 * ПОЧЕМУ НЕ СКРИПТОМ. Чтобы записать в базу на Railway из моей песочницы,
 * нужен пароль к базе, а он через переписку не проходит — ровно как ключ
 * Brevo. Здесь файл разбирается и пишется ВНУТРИ Railway, где DATABASE_URL
 * уже подключён, и ни один пароль никуда не уезжает. Заказчице это ещё и
 * удобнее: выгрузила с телефона, загрузила, посмотрела отчёт.
 *
 * ДВА ШАГА НАМЕРЕННО. По умолчанию — только разбор: страница показывает,
 * что поедет и что исключено, и ничего не пишет. Запись происходит, только
 * если явно отмечена галочка. Один и тот же файл можно загружать сколько
 * угодно раз: повторы отсекает уникальный client_token.
 */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Find My Smell — перенос таблицы', robots: 'noindex, nofollow' };

/** Предел на размер файла: присланная выгрузка весит 34 КБ. */
const MAX_BYTES = 8 * 1024 * 1024;

export default function ImportPage() {
  async function run(formData: FormData): Promise<ImportState> {
    'use server';

    const file = formData.get('sheet');
    if (!(file instanceof File) || file.size === 0) {
      return { kind: 'error', message: 'Файл не выбран.' };
    }
    if (file.size > MAX_BYTES) {
      return {
        kind: 'error',
        message: `Файл ${(file.size / 1048576).toFixed(1)} МБ — больше предела в 8 МБ.`,
      };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let parsed;
    try {
      parsed = file.name.toLowerCase().endsWith('.csv')
        ? parseSheet(new TextDecoder().decode(bytes))
        : parseSheet(bytes);
    } catch (error) {
      return {
        kind: 'error',
        message: `Файл не разобрался: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    if (parsed.runs.length === 0) {
      return { kind: 'error', message: 'В файле не нашлось ни одного прохождения для переноса.' };
    }

    const apply = formData.get('apply') === 'on';
    const withEmails = formData.get('emails') === 'on';
    let written = null;
    if (apply) {
      try {
        written = await writeRuns(parsed.runs, { withEmails });
      } catch (error) {
        return {
          kind: 'error',
          message: 'Разбор прошёл, а запись нет: '
            + (error instanceof Error ? error.message : String(error)),
        };
      }
    }

    /* Одна строка в лог сервера — и только числа.
       ЗАЧЕМ. Перенос делается руками и один раз, а понять снаружи, что
       именно произошло, было нельзя: и разбор, и запись отвечают 200, и
       в логах видно только «POST /admin/import 200». Когда заказчица
       сказала «я вроде перенесла базу», проверить это оказалось нечем.
       Личных данных здесь нет и быть не должно: ни ответов, ни адресов,
       ни имени файла — только сколько разобрано, сколько записано и была
       ли галочка. */
    console.log(
      '[import] разобрано %d, записано %s, пропущено %d, с адресами %s, галочка %s',
      parsed.runs.length,
      written ? String(written.runsInserted) : '—',
      parsed.skipped.length,
      written ? String(written.emailsInserted) : '—',
      apply ? 'да' : 'нет',
    );

    // В клиент уходит только сводка, а не сами прохождения: незачем гнать
    // в браузер 89 наборов ответов и девять адресов.
    const byArchetype = new Map<string, number>();
    for (const r of parsed.runs) {
      byArchetype.set(r.winner, (byArchetype.get(r.winner) ?? 0) + 1);
    }
    const bySheet = new Map<string, number>();
    for (const r of parsed.runs) bySheet.set(r.sheet, (bySheet.get(r.sheet) ?? 0) + 1);
    const dates = parsed.runs.map((r) => r.createdAt).sort((a, b) => a.getTime() - b.getTime());

    return {
      kind: 'done',
      apply,
      withEmails,
      fileName: file.name,
      sheets: parsed.sheets,
      total: parsed.runs.length,
      withOpen: parsed.runs.filter((r) => r.openAnswer).length,
      withEmail: parsed.runs.filter((r) => r.email).length,
      from: dates.length ? dates[0].toISOString().slice(0, 10) : null,
      to: dates.length ? dates[dates.length - 1].toISOString().slice(0, 10) : null,
      bySheet: [...bySheet].map(([name, n]) => ({ name, n })),
      archetypes: [...byArchetype]
        .map(([name, n]) => ({ name, n }))
        .sort((a, b) => b.n - a.n),
      rescored: parsed.runs
        .filter((r) => r.wasRescored)
        .map((r) => ({
          sheet: r.sheet,
          line: r.line,
          date: r.createdAt.toISOString().slice(0, 10),
          winner: r.winner,
          open: r.openAnswer,
        })),
      collisions: parsed.collisions.map((c) => ({
        sheet: c.sheet,
        line: c.line,
        open: c.open,
        otherSheet: c.other.sheet,
        otherLine: c.other.line,
        otherOpen: c.other.open,
      })),
      skippedTotal: parsed.skipped.length,
      skipped: (() => {
        const by = new Map<string, number[]>();
        for (const s of parsed.skipped) by.set(s.group, [...(by.get(s.group) ?? []), s.line]);
        return [...by]
          .map(([group, lines]) => ({ group, lines }))
          .sort((a, b) => b.lines.length - a.lines.length);
      })(),
      written,
    };
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <h1 className={styles.h1}>Перенос старой таблицы</h1>
        <nav className={styles.periods}>
          <Link href="/admin" className={styles.period}>← к данным</Link>
        </nav>
      </header>

      <p className={styles.note}>
        Выгрузка из Google Sheets, <b>.xlsx</b> или <b>.csv</b>. По умолчанию файл только
        разбирается и показывается отчёт — в базу ничего не пишется, пока не отмечена галочка.
        Один и тот же файл можно загружать сколько угодно раз: повторы отсекаются и второй раз
        не запишутся.
      </p>

      <ImportForm action={run} />
    </main>
  );
}
