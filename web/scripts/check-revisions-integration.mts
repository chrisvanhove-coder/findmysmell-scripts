/** Run only against an isolated test database. All email transport is intercepted. */
import assert from 'node:assert/strict';
import { Client } from 'pg';
import * as XLSX from 'xlsx';
import { completeAnswers } from './lib/quiz-fixture';
import { parseSheet } from '../src/lib/sheet-import';
import { writeRuns } from '../src/lib/sheet-write';
import { POST as subscribe } from '../src/app/api/subscribers/route';
import { catalogFor } from '../src/lib/matching';

const url = process.env.DATABASE_URL;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw Error('Use an isolated local database');
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3101';
const db = new Client({ connectionString: url });
await db.connect();
const token = `revision-check-${Date.now()}`;
const baseBody = { clientToken: token, locale: 'en', consentResearch: false, openAnswer: 'synthetic memory', browserKey: 'test-only', runIndex: 1 };
async function post(extra: object) {
  const response = await fetch(`${base}/api/submissions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...baseBody, ...extra }) });
  return { status: response.status, body: await response.json() };
}
const first = { ...completeAnswers(), Q_CALM: 'Q_CALM__OTHER' };
assert.equal((await post({ answers: first, questionOpens: { Q_CALM: 'linen 🌿' }, revision: 1 })).status, 200);
const second = completeAnswers('PLAY');
assert.equal((await post({ answers: second, revision: 2 })).status, 200);
assert.equal((await post({ answers: first, questionOpens: { Q_CALM: 'old' }, revision: 1 })).body.duplicate, true);
const { rows } = await db.query('select * from submissions where client_token=$1', [token]);
assert.equal(rows.length, 1);
assert.equal(rows[0].revision, 2);
assert.deepEqual(rows[0].answers, second);
assert.equal(rows[0].consent_research, false);
assert.equal((await db.query('select * from question_open_answers where submission_id=$1', [rows[0].id])).rowCount, 0);
assert.equal((await post({ answers: { ...second, Q_CALM: 'Q_CALM__LINENS' }, revision: 3 })).status, 400);
assert.equal((await post({ answers: { Q_RADIUS: 'Q_RADIUS__CLOSE' }, clientToken: token + '-partial', revision: 0 })).status, 200);
const imports = [];
for (const consent of [true, false, undefined]) {
  const email = `import-${String(consent)}-${Date.now()}@example.invalid`;
  const row = { winner: 'CEO', timestamp: '2026-09-17T10:00:00Z', answers_json: JSON.stringify(completeAnswers()), email_result: email, consent_email: consent };
  const parsed = parseSheet(XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet([row])));
  parsed.runs[0].clientToken = token + '-import-' + String(consent);
  const report = await writeRuns(parsed.runs, { withEmails: true });
  // Разрыв между «адресов в таблице» и «перенесено» должен быть назван в отчёте.
  assert.equal(report.emailsSeen, 1);
  assert.equal(report.emailsWithoutConsent, consent === true ? 0 : 1);
  assert.equal(report.emailsInserted, consent === true ? 1 : 0);
  const saved = (await db.query('select * from subscribers where email=$1', [email])).rows;
  assert.equal(saved.length, consent === true ? 1 : 0);
  if (saved.length) { assert.equal(saved[0].consent_email, true); assert.equal(saved[0].sent_at, null); }
  imports.push(email);
}
process.env.BREVO_API_KEY = 'test-intercepted';
process.env.BREVO_SENDER_EMAIL = 'test@example.invalid';
const originalFetch = globalThis.fetch;
let captured: { subject: string; textContent: string } | undefined;
globalThis.fetch = async (input, init) => {
  assert.equal(String(input), 'https://api.brevo.com/v3/smtp/email');
  captured = JSON.parse(String(init?.body));
  return new Response('{}', { status: 201 });
};
const perfume = catalogFor('CEO').find((p) => p.id === '6a859768e00cd82c08e5588e')!;
assert.ok(perfume);
const email = `email-${Date.now()}@example.invalid`;
function request(perfumeId: string) {
  return new Request(`${base}/api/subscribers`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, locale: 'en', archetype: 'CEO', perfumeId, consentEmail: true }) });
}
try {
  const response = await subscribe(request(perfume.id));
  assert.equal(response.status, 200);
  assert.ok(captured?.textContent.includes(perfume.name));
  assert.ok(captured?.subject.includes(perfume.name));
  /* Неизвестный флакон не должен стоить человеку подписки: адрес и согласие
     сохраняются, письмо уходит про архетип и без флакона, а несуществующий
     id в базу не пишется. */
  captured = undefined;
  assert.equal((await subscribe(request('unknown-id'))).status, 200);
  const after = (await db.query('select * from subscribers where email=$1', [email])).rows;
  assert.equal(after.length, 1);
  assert.equal(after[0].perfume_id, null);
  assert.equal(after[0].consent_email, true);
  assert.ok(captured, 'письмо про архетип всё равно должно уйти');
  assert.ok(!captured.textContent.includes(perfume.name), 'флакона в письме быть не должно');
} finally { globalThis.fetch = originalFetch; }
await db.query('delete from submissions where client_token like $1', [token + '%']);
await db.query('delete from subscribers where email = any($1)', [[...imports, email]]);
await db.end();
console.log('PASS: real HTTP + PostgreSQL revisions/late requests/Other deletion/partial answers; import consent and report; exact and unknown-bottle emails. No email sent.');
process.exit(0);
