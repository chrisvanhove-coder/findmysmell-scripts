-- Ключ идемпотентности для прохождений.
--
-- Колонка NOT NULL добавляется через временный DEFAULT: на момент написания
-- база ещё не поднята и строк нет, но если миграция 0000 где-то уже
-- применялась и в submissions что-то лежит, простой ADD COLUMN NOT NULL
-- без значения упал бы. Существующие строки получат свои уникальные токены,
-- после чего DEFAULT снимается — дальше токен всегда присылает клиент.
ALTER TABLE "submissions" ADD COLUMN "client_token" text DEFAULT gen_random_uuid()::text NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "client_token" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_client_token_unique" UNIQUE("client_token");
