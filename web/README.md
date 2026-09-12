# Find My Smell — веб-приложение

Полная передача проекта, включая доменную логику и что осталось сделать —
в `../HANDOFF.md`. Здесь только как запустить и что где лежит.

Next.js 16 (App Router) + TypeScript + Drizzle + Postgres. Хостинг Railway.

## Запуск локально

```bash
cd web
npm install
cp .env.example .env   # и вписать свой DATABASE_URL
npm run dev
```

Открыть `http://localhost:3000/en`. Предпросмотр результатов —
`/en/result/ceo`, `/fr/result/hug` и так далее для всех семи архетипов.

## Структура

```
src/app/[locale]/                 локали en / fr / ru сегментом пути
src/app/[locale]/result/[archetype]/  серверный рендер результата
src/lib/scoring.ts                движок подсчёта архетипа
src/lib/content.ts                контент архетипов из ../data
src/lib/archetype-colors.ts       палитры (генерируется)
src/styles/archetypes.css         CSS-токены (генерируется)
src/db/schema.ts                  таблицы Postgres
```

## Генерируемые файлы

`archetype-colors.ts` и `archetypes.css` собираются из выгруженного продового
CSS, чтобы значения не разошлись. Перегенерировать:

```bash
node ../tools/build-tokens.mjs
```

Контент архетипов извлекается из старых скриптов:

```bash
node ../tools/extract-data.mjs
```

## Деплой на Railway

Сервис приложения + сервис Postgres, слинкованные между собой. Регион
**europe-west4** — аудитория французская, данные остаются в ЕС.
`DATABASE_URL` подставляется Railway автоматически.

Миграции гоняются pre-deploy командой из `railway.json`, доступ к базе
снаружи для этого не нужен.

## Чего пока нет

- **Шрифт HIGHCRUISER.** Кастомный, загружен в Webflow, файла у нас нет.
  Сейчас используется фолбэк `Arial Black`. Нужно достать `.woff2`
  и добавить `@font-face`.
- Квиз, главная и юридические страницы.
- Scent DNA, texture reveal, винил, генерация share-карточек.
- Русский контент результатов: `content.ts` временно отдаёт английский.

## Квиз

24 вопроса живут на одном маршруте `/[locale]/quiz/[question]`, состояние
клиентское. Переходы между вопросами идут без перезагрузки документа —
раньше каждый вопрос был отдельной страницей Webflow и браузер грузил
документ заново примерно 19 раз за прохождение.

Порядок, ветвление по эмоциям и возврат в основную линию перенесены из
`site-custom-code.html` без изменений: `Q_EMO` уводит в одну из семи веток,
любая ветка возвращает в `Q_ENV_CHILD`.

Сквозная проверка прохождения:

```bash
npm run build && node .next/standalone/server.js &
CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run e2e
```

## Сид каталога

```bash
DATABASE_URL=... npx drizzle-kit migrate
DATABASE_URL=... npm run db:seed
```

Сид идемпотентен: ключом служит id позиции из Webflow CMS, повторный запуск
обновляет записи, а не плодит дубли.
