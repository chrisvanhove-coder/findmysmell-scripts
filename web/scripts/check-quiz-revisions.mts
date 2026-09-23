import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { completeAnswers } from './lib/quiz-fixture';
import { EMOTION_BRANCHES, QUESTIONS } from '../src/lib/quiz';
import { currentAnswers, missingQuestions } from '../src/lib/quiz-state';
import { parseSubmission, buildRecord } from '../src/lib/submission';
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
// Брошенное прохождение: принимается и помечается незавершённым, целое — нет.
{
  const partial = parseSubmission(body({ Q_GENDER: QUESTIONS.Q_GENDER.answers[0].code }));
  assert.ok(partial.ok);
  assert.equal(buildRecord(partial.input).completed, false);
  const whole = parseSubmission(body(completeAnswers()));
  assert.ok(whole.ok);
  assert.equal(buildRecord(whole.input).completed, true);
  // Признак считается из ответов, а не со слов клиента.
  const lying = parseSubmission(body({ Q_GENDER: QUESTIONS.Q_GENDER.answers[0].code }, { completed: true }));
  assert.ok(lying.ok);
  assert.equal(buildRecord(lying.input).completed, false);
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
// BEGIN не должен молча стирать начатое: на этом стоит вопрос перед сбросом.
assert.equal(store.unfinishedRun(), false, 'пустое хранилище — терять нечего');
store.saveAnswer('Q_GENDER', QUESTIONS.Q_GENDER.answers[0].code);
assert.equal(store.unfinishedRun(), true, 'один ответ — прохождение уже начато');
for (const [id, code] of Object.entries(completeAnswers())) store.saveAnswer(id, code);
assert.equal(store.unfinishedRun(), true, 'дозаполнено, но ещё не сохранено');
store.markSent(store.runToken(), store.revision());
assert.equal(store.unfinishedRun(), false, 'завершено и сохранено — терять нечего');
store.beginRun();
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
   разобрал тело, и то же тело даст тот же ответ.
   А ЧЕЛОВЕКУ ПРО ЭТО НЕ СООБЩАЮТ ВОВСЕ. Полоса «ответы не сохранены» с
   кнопкой повтора снята: до результата доходит только тот, кто ответил на
   всё, и запись в нашу базу — не его забота. Взамен стоит отправка на уходе
   со страницы, которая доставляет надёжнее кнопки, потому что не требует,
   чтобы её заметили. Проверяем всё это по исходнику. */
const record = readFileSync('src/app/[locale]/result/[archetype]/RecordSubmission.tsx', 'utf8');
assert.match(record, /status >= 400 && response\.status < 500/, '4xx должен отличаться от 5xx');
assert.match(record, /rejected\.current = true;\s*return;/, 'на 4xx повторять нельзя');
assert.match(record, /attempt < 2/, '5xx и обрыв связи повторяем сами');
assert.match(record, /watchForAbandon\(locale\)/, 'страховка на уходе со страницы обязательна');
/* Ищем не текст, а отсутствие разметки: упомянуть снятую строку в
   комментарии — можно, вернуть её на страницу — нельзя. */
assert.doesNotMatch(record, /module\.css/, 'полосе об ошибке больше нечего оформлять');
assert.match(record, /return null;\s*}\s*$/, 'компонент не показывает человеку ничего');
assert.equal(parseSubmission(body(completeAnswers(), { revision: 2147483648 })).ok, false);
assert.equal(parseSubmission(body({ constructor: 'anything' })).ok, false);
console.log(`PASS: 7 routes, 42 inactive-branch cases, edits/Other/restarts/revisions, ${bottles} exact email bottles, 5 consent cases, retry policy, resume guard, abandoned runs`);
