# Выгрузка custom code из Webflow

Код, который живёт в настройках Webflow, а не в этом репозитории.
Выгружен 2026-09-11 через Webflow MCP. Site ID `69773aa3fded0e0107b28cbd`.

| Файл | Откуда |
|---|---|
| `site-custom-code.html` | Site Settings → Custom Code (head + footer) |
| `page-result-head.css.html` | Страница RESULT `699812ef6054e1bf72e20920` → head |
| `page-result-footer.html` | Страница RESULT → перед `</body>` |
| `page-result-fr-head.css.html` | Страница RESULT FR `6a3ba04b3a9975cbe8e2b8c2` → head |
| `page-q-open-footer.html` | Страница Q_OPEN `697a031af92d326f91b60299` → перед `</body>` |

## Что теперь закрыто

**R1 — CSS страницы результата.** Из 122 классов `fms-*`, используемых в JS,
118 имеют CSS в репозитории. Остальные четыре — не классы оформления:
`fms-modal-styles` и `fms-share-popup-styles` это id вставляемых из JS
`<style>`, `fms-email-` префикс динамических id, `fms-z2a` мёртвый класс в FR.

**Движок подсчёта архетипа.** `page-q-open-footer.html` содержит
`ANSWER_WEIGHTS` (164 варианта ответа × 7 архетипов) и логику выбора
победителя. Он пишет `quiz_result`, `quiz_secondary`, `quiz_scores`,
`quiz_open`, `consent_aggregate` — ключи, которые читает страница результата.

## Как репозиторий попадает в прод

Страницы результата грузят скрипты по jsDelivr прямо с ветки `main`:

```
https://cdn.jsdelivr.net/gh/chrisvanhove-coder/findmysmell-scripts@main/result48.js
```

Версия не зафиксирована: любой push в `main` уходит на живой сайт.
В проде сейчас `result48.js` + `result-shared15.js` (EN)
и `result-fr6.js` + `result-shared-fr.js` (FR).

## Структура сайта

75 страниц: английское дерево в корне, французское под `/fr/`,
русское под `/ru/`. Три копии одних и тех же 24 вопросов.
Русская версия опубликована, но скриптов результата для неё нет.

## Известные дефекты, найденные при выгрузке

- Три элемента прибиты к низу экрана с `z-index: 9999` — `#legal-bar`,
  `#cookie-banner`, `#fms-progress`. Перекрывают друг друга.
- Cookie-баннер декоративный: `loadTrackingScripts()` полностью закомментирован,
  внутри плейсхолдер `GA_MEASUREMENT_ID`. Кнопка Decline ничего не блокирует.
- Два независимых согласия: `cookieConsent` у баннера и `consent_aggregate`
  у экрана перед результатом.
- Переключатель языка пишет `fms_lang`, но это значение никто не читает —
  язык определяется префиксом URL.
- При отсутствии `quiz_result` страница результата затирает `document.body.innerHTML`.
