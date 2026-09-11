# Find My Smell — веб-приложение

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
