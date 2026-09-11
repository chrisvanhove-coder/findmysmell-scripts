import { pgTable, text, integer, boolean, jsonb, timestamp, uuid, index } from 'drizzle-orm/pg-core';

/**
 * Каталог парфюма. Переезжает из Webflow CMS, где он дублировал
 * захардкоженные данные в JS и молча их перезаписывал.
 */
export const perfumes = pgTable(
  'perfumes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
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
    locale: text('locale').notNull(),
    winner: text('winner').notNull(),
    secondary: text('secondary'),
    scores: jsonb('scores').notNull(),
    answers: jsonb('answers').notNull(),
    openAnswer: text('open_answer'),
    // Согласие на использование анонимных ответов в исследовании.
    consentResearch: boolean('consent_research').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('submissions_created_idx').on(t.createdAt),
    index('submissions_winner_idx').on(t.winner),
  ],
);

/** Подписка на письмо с результатом. Отдельно от прохождений — это личные данные. */
export const subscribers = pgTable('subscribers', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  locale: text('locale').notNull(),
  archetype: text('archetype'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
