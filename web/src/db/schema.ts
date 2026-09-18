import {
  pgTable, text, integer, boolean, jsonb, timestamp, uuid, index, primaryKey,
} from 'drizzle-orm/pg-core';

/**
 * Каталог парфюма. Переезжает из Webflow CMS, где он дублировал
 * захардкоженные данные в JS и молча их перезаписывал.
 */
export const perfumes = pgTable(
  'perfumes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // id позиции в Webflow CMS — ключ идемпотентности при повторном сиде.
    cmsId: text('cms_id').notNull().unique(),
    // Порядок из коллекции. Нужен как последний критерий при равном расстоянии.
    sortOrder: integer('sort_order').notNull().default(0),
    archetype: text('archetype').notNull(),
    name: text('name').notNull(),
    house: text('house').notNull(),
    description: text('description').notNull().default(''),
    imageUrl: text('image_url').notNull().default(''),
    shopUrl: text('shop_url').notNull().default(''),
    isMain: boolean('is_main').notNull().default(false),
    // Оси подбора: сладость, необычность, шлейф. 0..3, как в старом движке.
    sweet: integer('sweet'),
    raw: integer('raw'),
    projection: integer('projection'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('perfumes_archetype_idx').on(t.archetype)],
);

/**
 * Прохождения квиза. Заменяет отправку в Google Apps Script.
 * Персональных данных не содержит: только ответы и результат.
 */
export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Ключ идемпотентности: браузер генерирует его один раз за прохождение.
    // В проде защитой от повтора был только флаг quiz_sent в sessionStorage —
    // он терялся при очистке хранилища, и то же прохождение уезжало дважды.
    // Здесь повтор отсекает база, а не клиент.
    clientToken: text('client_token').notNull().unique(),
    revision: integer('revision').notNull().default(0),
    locale: text('locale').notNull(),
    winner: text('winner').notNull(),
    secondary: text('secondary'),
    scores: jsonb('scores').notNull(),
    answers: jsonb('answers').notNull(),
    openAnswer: text('open_answer'),
    // Согласие на использование анонимных ответов в исследовании.
    consentResearch: boolean('consent_research').notNull().default(false),
    // Ключ браузера и номер прохождения. Нужны ровно для одного: отделить
    // первое прохождение от повторных. Без них десять проходов одного
    // человека выглядят как десять человек, и выборка перестаёт быть
    // выборкой. Ключ живёт в localStorage не дольше 13 месяцев (потолок
    // CNIL) и не про человека, а про браузер: телефон и ноутбук одного
    // человека — два ключа. null, если хранилище недоступно.
    browserKey: text('browser_key'),
    runIndex: integer('run_index'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('submissions_created_idx').on(t.createdAt),
    index('submissions_winner_idx').on(t.winner),
    // Для «все прохождения этого браузера по порядку».
    index('submissions_browser_idx').on(t.browserKey, t.createdAt),
  ],
);

/**
 * Тексты, написанные в ответ на «Other» внутри вопроса — по одной строке
 * на (прохождение, вопрос).
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ТАБЛИЦА, А НЕ ЕЩЁ ОДНА КОЛОНКА. На живом сайте девять
 * вопросов просят написать своё, если ни один вариант не подходит —
 * «What does calm smell like to you?» — и все девять пишут этот текст в
 * то же поле, что финальный открытый вопрос. Одно затирает другое.
 * Заказчица назвала эти ответы самым важным в квизе и выбрала хранить
 * каждый отдельно.
 *
 * Своя таблица, потому что вопрос здесь — это данные, а не имя колонки:
 * «покажи всё, что люди написали про уют» становится обычным запросом,
 * а добавление десятого такого вопроса не требует менять схему.
 *
 * Удаляется вместе с прохождением (on delete cascade), поэтому ночная
 * очистка по срокам хранения ничего не забудет: она удаляет строки
 * submissions, а эти уходят за ними.
 */
export const questionOpenAnswers = pgTable(
  'question_open_answers',
  {
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    questionId: text('question_id').notNull(),
    text: text('text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Один текст на вопрос в рамках одного прохождения.
    primaryKey({ columns: [t.submissionId, t.questionId] }),
    // Для «всё, что написали про этот вопрос».
    index('question_open_question_idx').on(t.questionId, t.createdAt),
  ],
);

/** Подписка на письмо с результатом. Отдельно от прохождений — это личные данные. */
export const subscribers = pgTable('subscribers', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  locale: text('locale').notNull(),
  archetype: text('archetype'),
  // Подобранный флакон. Нужен, чтобы письмо могло назвать конкретный парфюм:
  // прохождения обезличены и с адресом не связаны, а подбор живёт в браузере,
  // так что восстановить его на сервере нельзя — только принять от клиента.
  perfumeId: text('perfume_id'),
  // Доказательство согласия. Раньше согласие проверялось на входе и нигде
  // не сохранялось — доказать, что человек его дал, было нечем.
  consentEmail: boolean('consent_email').notNull().default(true),
  consentAt: timestamp('consent_at', { withTimezone: true }).notNull().defaultNow(),
  /* Когда письмо действительно ушло ОТСЮДА. null — этот сайт его не
     отправлял.
     ВНИМАНИЕ ТОМУ, КТО БУДЕТ ПИСАТЬ РАССЫЛКУ: `sent_at is null` НЕ значит
     «этому человеку ещё не писали». У перенесённых из старой таблицы
     подписчиков здесь null, хотя письмо им отправил старый сайт на Webflow
     (см. src/lib/sheet-write.ts). Раньше импорт ставил им дату переноса
     именно как метку «не писать второй раз», и её убрали — дата доставки,
     которой не было, это выдумка. Метки взамен нет: пока рассылки в проекте
     тоже нет, а придумывать колонку под несуществующий код не стали.
     Отличить их можно по `consent_at`: у исторических он из таблицы, то есть
     заметно раньше запуска нового сайта. */
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Измерение воронки. Своя, первой стороны, без куки и без сторонних скриптов.
 *
 * Почему без баннера. CNIL освобождает от согласия измерение аудитории, если
 * оно строго для владельца сайта, первой стороны, данные никуда не уходят и
 * идентификатор живёт не дольше 13 месяцев. Здесь жёстче: на устройстве
 * вообще ничего не пишется ради измерения, а ключ строки — `runToken`,
 * который уже существует как ключ идемпотентности прохождения. Он живёт в
 * sessionStorage, умирает вместе с сессией и не связывает два визита.
 *
 * Чего здесь сознательно НЕТ: IP, user-agent, referrer, разрешение экрана,
 * города. Всё это либо превращает строку в персональные данные, либо ведёт к
 * фингерпринту — а политика обещает, что фингерпринта на сайте нет.
 *
 * Срок хранения — 13 месяцев, чистит scripts/purge-retention.mts.
 */
export const funnelEvents = pgTable(
  'funnel_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Токен прохождения, не человека: одна сессия — один токен.
    runToken: text('run_token').notNull(),
    // Идентификатор шага: Q_GENDER, Q_EMO, RESULT, EMAIL_SENT.
    step: text('step').notNull(),
    // 'view' — шаг показан, 'answer' — на шаге ответили.
    event: text('event').notNull(),
    // Какой вариант выбрали. Даёт распределение ответов по каждому вопросу.
    answerCode: text('answer_code'),
    locale: text('locale').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('funnel_created_idx').on(t.createdAt),
    index('funnel_run_idx').on(t.runToken),
    index('funnel_step_idx').on(t.step),
  ],
);
