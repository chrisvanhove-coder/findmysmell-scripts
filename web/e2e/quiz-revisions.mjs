import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { Client } from 'pg';
import { walkQuiz } from './lib/walk-quiz.mjs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3101';
if (!process.env.DATABASE_URL || !['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw Error('Isolated local DB required');
const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const context = await browser.newContext();
const page = await context.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const tokens = new Set();
let blocked = true; let attempts = 0;
await page.route('**/api/submissions', async (route) => {
  const body = route.request().postDataJSON(); tokens.add(body.clientToken); attempts++;
  if (blocked) await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  else await route.continue();
});
async function emotion(code) {
  const drum = page.getByRole('listbox');
  await drum.focus();
  for (let i = 0; i < 8; i++) {
    if (await drum.getAttribute('aria-activedescendant') === `emo-Q_EMO__${code}`) break;
    await drum.press('ArrowDown');
    await page.waitForTimeout(450);
  }
  assert.equal(await drum.getAttribute('aria-activedescendant'), `emo-Q_EMO__${code}`);
  await drum.press('Enter');
}
async function stored() {
  const token = await page.evaluate(() => sessionStorage.getItem('quiz_token'));
  return (await db.query('select * from submissions where client_token=$1', [token])).rows;
}
async function waitSaved() {
  await page.waitForFunction(() => sessionStorage.getItem('quiz_sent') === '1', { timeout: 15000 });
}
try {
  const visited = await walkQuiz(page, { base: BASE, agree: false, openText: 'revision browser original' });
  assert.equal(visited.length, 18);
  await page.getByRole('button', { name: 'Try again', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('quiz_sent')), null);
  blocked = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await waitSaved();
  let rows = await stored(); assert.equal(rows.length, 1); assert.equal(rows[0].consent_research, false);
  const originalId = rows[0].id;
  const originalRevision = rows[0].revision;
  await page.goBack(); await page.waitForURL('**/quiz/q-open');
  await page.locator('#quiz-open-answer').fill('revision browser edited');
  await page.getByRole('button', { name: 'Disagree & continue', exact: true }).click();
  await page.waitForURL('**/result/**'); await waitSaved();
  rows = await stored(); assert.equal(rows.length, 1); assert.equal(rows[0].id, originalId);
  assert.equal(rows[0].open_answer, 'revision browser edited'); assert.ok(rows[0].revision > originalRevision);
  // Switch branches, write Other, then leave that branch using real browser Back.
  await page.goto(`${BASE}/en/quiz/q-emo`);
  await emotion('PLAY'); await page.waitForURL('**/quiz/q-play');
  await page.locator('[data-answer="Q_PLAY__OTHER"]').click();
  await page.locator('#open-answer-input').fill('playful synthetic memory');
  await page.locator('#open-answer-submit').click(); await page.waitForURL('**/quiz/q-env-child');
  await page.goBack(); await page.waitForURL('**/quiz/q-play');
  await page.goBack(); await page.waitForURL('**/quiz/q-emo');
  await emotion('CALM'); await page.waitForURL('**/quiz/q-calm');
  const afterBranch = await page.evaluate(() => ({ answers: JSON.parse(sessionStorage.quiz_answers), opens: JSON.parse(sessionStorage.quiz_open_by_question) }));
  assert.equal(afterBranch.answers.Q_PLAY, undefined); assert.equal(afterBranch.opens.Q_PLAY, undefined);
  assert.ok(afterBranch.answers.Q_RADIUS, 'common answers retained');
  // Skipping the newly selected branch cannot produce a finished result.
  await page.goto(`${BASE}/en/quiz/q-open`);
  await page.getByRole('button', { name: 'Disagree & continue', exact: true }).click();
  await page.waitForURL('**/quiz/q-calm');
  await page.locator('[data-answer="Q_CALM__OTHER"]').click();
  await page.locator('#open-answer-input').fill('calm synthetic memory');
  await page.locator('#open-answer-submit').click(); await page.waitForURL('**/quiz/q-env-child');
  await page.goto(`${BASE}/en/quiz/q-open`);
  await page.getByRole('button', { name: 'Disagree & continue', exact: true }).click();
  await page.waitForURL('**/result/**'); await waitSaved();
  rows = await stored(); assert.equal(rows.length, 1); assert.equal(rows[0].id, originalId);
  assert.equal(rows[0].answers.Q_PLAY, undefined); assert.equal(rows[0].answers.Q_CALM, 'Q_CALM__OTHER');
  const opens = (await db.query('select question_id,text from question_open_answers where submission_id=$1', [originalId])).rows;
  assert.ok(opens.some((r) => r.question_id === 'Q_CALM' && r.text === 'calm synthetic memory'));
  assert.ok(!opens.some((r) => r.question_id === 'Q_PLAY'));
  // Explicit start resets all quiz state; browser identity/count is separate.
  await page.goto(`${BASE}/en`); await page.locator('a[href="/en/quiz/q-gender"]').first().click();
  await page.waitForURL('**/quiz/q-gender');
  const fresh = await page.evaluate(() => ({ answers: sessionStorage.getItem('quiz_answers'), opens: sessionStorage.getItem('quiz_open_by_question'), consent: sessionStorage.getItem('consent_aggregate'), open: sessionStorage.getItem('quiz_open') }));
  assert.deepEqual(fresh, { answers: null, opens: null, consent: null, open: null });
  // A started run is never erased silently: BEGIN asks first.
  await page.goto(`${BASE}/en/quiz/q-gender`);
  await page.locator('button[data-answer]').first().waitFor({ timeout: 10000 });
  await page.locator('button[data-answer]').first().click();
  await page.waitForURL('**/quiz/q-region-now');
  const started = await page.evaluate(() => sessionStorage.getItem('quiz_answers'));
  assert.ok(started && Object.keys(JSON.parse(started)).length === 1);

  await page.goto(`${BASE}/en`);
  await page.locator('a[href="/en/quiz/q-gender"]').first().click();
  await page.locator('[data-resume-quiz]').waitFor({ timeout: 10000 });
  assert.equal(page.url().replace(/\/$/, ''), `${BASE}/en`, 'asking, not navigating');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('quiz_answers')), started,
    'the question itself must not touch the answers');

  // Continue returns to the first unanswered question and keeps everything.
  await page.getByRole('button', { name: 'Continue where I left off', exact: true }).click();
  await page.waitForURL('**/quiz/q-region-now');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('quiz_answers')), started);

  // Start over erases — but only on an explicit choice.
  await page.goto(`${BASE}/en`);
  await page.locator('a[href="/en/quiz/q-gender"]').first().click();
  await page.locator('[data-resume-quiz]').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await page.waitForURL('**/quiz/q-gender');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('quiz_answers')), null);

  assert.deepEqual(errors, []);
  console.log(`PASS: 18-screen real journey, failed delivery + retry, Back and same-row edits, branch switching/Other cleanup, completion guard, fresh Start, resume-or-restart prompt. ${attempts} submissions, no page errors.`);
} finally {
  await browser.close();
  await db.query('delete from submissions where client_token=any($1)', [[...tokens]]);
  await db.end();
}
