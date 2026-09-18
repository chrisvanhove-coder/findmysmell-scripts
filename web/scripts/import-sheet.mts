/**
 * Перенос прохождений из старой таблицы Google Sheets — из терминала.
 *
 *   npm run import:sheet -- файл.xlsx            # разбор, без записи
 *   npm run import:sheet -- файл.xlsx --apply    # записать
 *   npm run import:sheet -- файл.xlsx --apply --no-emails
 *
 * Читает и .xlsx, и .csv. Правила разбора живут в src/lib/sheet-import.ts,
 * запись — в src/lib/sheet-write.ts: те же самые правила и та же запись
 * работают на странице /admin/import, куда заказчица загружает файл
 * с телефона. Две копии рано или поздно разошлись бы.
 *
 * ЭТОМУ СКРИПТУ НУЖЕН DATABASE_URL, то есть доступ к базе снаружи. К базе
 * на Railway его нет и быть не должно: пароль не проходит через переписку.
 * Поэтому настоящий перенос делается через /admin/import, а скрипт
 * остаётся для разбора файла и для проверки на локальной базе.
 */
import { readFileSync } from 'node:fs';
import { parseSheet, groupSkipped } from '../src/lib/sheet-import.ts';
import { writeRuns } from '../src/lib/sheet-write.ts';

const file = process.argv[2];
const apply = process.argv.includes('--apply');
const noEmails = process.argv.includes('--no-emails');

if (!file || file.startsWith('--')) {
  console.error('Укажите файл: npm run import:sheet -- файл.xlsx [--apply] [--no-emails]');
  process.exit(1);
}

const isCsv = file.toLowerCase().endsWith('.csv');
const result = parseSheet(isCsv ? readFileSync(file, 'utf8') : readFileSync(file));

console.log(`\nФайл: ${file}`);
console.log(`Листов: ${result.sheets.length} — `
  + result.sheets.map((s) => `${s.name} (${s.rows})`).join(', '));

const { runs, skipped, collisions } = result;
const withOpen = runs.filter((r) => r.openAnswer);
const withEmail = runs.filter((r) => r.email);

console.log(`\nК ПЕРЕНОСУ: ${runs.length} прохождений`);
const bySheet = new Map<string, number>();
for (const r of runs) bySheet.set(r.sheet, (bySheet.get(r.sheet) ?? 0) + 1);
for (const [s, n] of bySheet) console.log(`   из «${s}»: ${n}`);
console.log(`   с открытым ответом: ${withOpen.length}`);
console.log(`   с адресом почты: ${withEmail.length}${noEmails ? ' (адреса НЕ переносятся)' : ''}`);

const dates = runs.map((r) => r.createdAt).sort((a, b) => a.getTime() - b.getTime());
if (dates.length) {
  console.log(`   период: ${dates[0].toISOString().slice(0, 10)} … `
    + `${dates[dates.length - 1].toISOString().slice(0, 10)}`);
}

const rescored = runs.filter((r) => r.wasRescored);
if (rescored.length) {
  console.log(`\nПересчитаны баллы у ${rescored.length} (в таблице были нули, `
    + 'архетип пересчитан вместе с ними):');
  for (const r of rescored) {
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

console.log(`\nИСКЛЮЧЕНО: ${skipped.length}`);
for (const { group, lines } of groupSkipped(skipped)) {
  console.log(`   ${String(lines.length).padStart(3)}  ${group}`);
  console.log(`        строки: ${lines.join(', ')}`);
}

const arch = new Map<string, number>();
for (const r of runs) arch.set(r.winner, (arch.get(r.winner) ?? 0) + 1);
console.log('\nАрхетипы после переноса:');
for (const [k, n] of [...arch].sort((a, b) => b[1] - a[1])) {
  const bar = '█'.repeat(Math.max(1, Math.round((n / runs.length) * 30)));
  console.log(`   ${k.padEnd(12)} ${String(n).padStart(3)} `
    + `${`${((n / runs.length) * 100).toFixed(1)}%`.padStart(6)}  ${bar}`);
}

if (!apply) {
  console.log('\nЭто разбор без записи. Чтобы записать, добавьте --apply\n');
  process.exit(0);
}

const written = await writeRuns(runs, { withEmails: !noEmails });
console.log(`\nНовых прохождений: ${written.runsInserted}`);
console.log(`Уже были (повторный запуск): ${written.runsAlreadyThere}`);
console.log(`Новых адресов: ${written.emailsInserted} из ${written.emailsSeen}`);
console.log(`Без согласия на email, пропущено: ${written.emailsWithoutConsent}`);
console.log(`Всего исторических в базе: ${written.totalHistoric}`);
console.log(`Всего прохождений в базе: ${written.totalRuns}\n`);
process.exit(0);
