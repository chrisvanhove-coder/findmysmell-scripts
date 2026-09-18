import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { completeAnswers } from './lib/quiz-fixture';
import { EMOTION_BRANCHES, QUESTIONS } from '../src/lib/quiz';
import { currentAnswers, missingQuestions } from '../src/lib/quiz-state';
import { parseSubmission } from '../src/lib/submission';
import { catalogFor, matchById } from '../src/lib/matching';
import { ARCHETYPE_KEYS } from '../src/lib/archetype-colors';
import { parseSheet } from '../src/lib/sheet-import';
import * as store from '../src/lib/answers-store';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, String(v)); }
  removeItem(k: string) { this.data.delete(k); }
}
for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, { value: new MemoryStorage(), configurable: true });
const body = (answers: Record<string, string>, extra = {}) => ({
  locale: 'en', answers, openAnswer: '', consentResearch: false, clientToken: 'test', ...extra,
});
for (const branch of EMOTION_BRANCHES) {
  const answers = completeAnswers(branch.slice(2));
  assert.equal(Object.keys(answers).length, 17);
  assert.deepEqual(missingQuestions(answers), []);
  assert.ok(parseSubmission(body(answers)).ok);
  for (const other of EMOTION_BRANCHES.filter((x) => x !== branch)) {
    const dirty = { ...answers, [other]: QUESTIONS[other].answers[0].code };
    assert.deepEqual(currentAnswers(dirty), answers);
    assert.equal(parseSubmission(body(dirty)).ok, false);
  }
}
assert.ok(parseSubmission(body({ Q_RADIUS: 'Q_RADIUS__CLOSE' })).ok);
assert.ok(missingQuestions({ Q_RADIUS: 'Q_RADIUS__CLOSE' }).length > 0);
assert.equal(parseSubmission(body({ Q_RADIUS: 'Q_GENDER__FEMININE' })).ok, false);
assert.equal(parseSubmission(body(completeAnswers(), { questionOpens: { Q_CALM: 'unselected' } })).ok, false);
store.beginRun();
const token = store.runToken();
for (const [id, code] of Object.entries(completeAnswers())) store.saveAnswer(id, code);
store.saveQuestionOpen('Q_CALM', 'linen 🌿');
store.saveAnswer('Q_CALM', 'Q_CALM__OTHER');
store.saveOpenText('a memory');
store.saveResearchConsent(false);
assert.equal(store.loadQuestionOpens().Q_CALM, 'linen 🌿');
const index = store.submissionRunIndex();
const sentVersion = store.revision();
store.markSent(token, sentVersion);
assert.ok(store.wasSent());
store.saveAnswer('Q_GENDER', QUESTIONS.Q_GENDER.answers[1].code);
assert.equal(store.runToken(), token, 'Back to first question is an edit');
assert.equal(store.wasSent(), false);
assert.equal(Object.keys(store.loadAnswers()).length, 17);
store.saveAnswer('Q_EMO', 'Q_EMO__PLAY');
assert.equal(store.loadAnswers().Q_CALM, undefined);
assert.equal(store.loadQuestionOpens().Q_CALM, undefined);
assert.equal(store.loadAnswers().Q_RADIUS, 'Q_RADIUS__CLOSE');
assert.deepEqual(missingQuestions(store.loadAnswers()), ['Q_PLAY']);
store.markSent(token, sentVersion);
assert.equal(store.wasSent(), false, 'late acknowledgement cannot mark edits saved');
store.saveAnswer('Q_PLAY', QUESTIONS.Q_PLAY.answers[0].code);
assert.equal(store.submissionRunIndex(), index, 'editing keeps run index');
store.beginRun();
assert.notEqual(store.runToken(), token);
assert.deepEqual(store.loadAnswers(), {});
assert.deepEqual(store.loadQuestionOpens(), {});
assert.equal(store.loadOpenText(), '');
assert.equal(store.loadResearchConsent(), null);
assert.equal(store.submissionRunIndex(), Number(index) + 1);
let bottles = 0;
for (const arch of ARCHETYPE_KEYS) for (const p of catalogFor(arch)) {
  assert.equal(matchById(arch, p.id)?.main.id, p.id);
  bottles++;
}
assert.equal(matchById('CEO', 'nonexistent'), null);
for (const consent of [false, true, undefined, 'false', 'true']) {
  const ws = XLSX.utils.json_to_sheet([{
    winner: 'CEO', answers_json: JSON.stringify(completeAnswers()),
    timestamp: '2026-09-17T10:00:00Z', email_result: 'synthetic@example.invalid', consent_email: consent,
  }]);
  const result = parseSheet(XLSX.utils.sheet_to_csv(ws));
  assert.equal(result.runs.length, 1);
  assert.equal(result.runs[0].consentEmail, consent === true || consent === 'true');
}
/* Повтор лечит обрыв связи и 5xx, но не отказ по существу: на 4xx сервер уже
   разобрал тело, и то же тело даст тот же ответ. Кнопка «Try again», которая
   не может сработать, — обещание, которого не сдержать. Проверяем по
   исходнику: 4xx выделен в отдельную ветку и уводит в состояние без кнопки. */
const record = readFileSync('src/app/[locale]/result/[archetype]/RecordSubmission.tsx', 'utf8');
assert.match(record, /status >= 400 && response\.status < 500/, '4xx должен отличаться от 5xx');
assert.match(record, /failed === 'retry' &&/, 'кнопка повтора — только там, где повтор поможет');
assert.match(record, /styles\.notice/, 'полоса об ошибке должна быть оформлена, а не голым <p>');
assert.equal(parseSubmission(body(completeAnswers(), { revision: 2147483648 })).ok, false);
assert.equal(parseSubmission(body({ constructor: 'anything' })).ok, false);
console.log(`PASS: 7 routes, 42 inactive-branch cases, edits/Other/restarts/revisions, ${bottles} exact email bottles, 5 consent cases, retry policy`);
