# Живой сайт findmysmell.com — что там на самом деле

Выгружено 2026-09-14. Site ID `69773aa3fded0e0107b28cbd`, последняя публикация
2026-09-08. Код 23 живых страниц лежит рядом в `webflow/live-pages/` —
это дословные копии, ничего не переписано.

## Как это удалось достать

`findmysmell.com`, `archetypes-v-1-0.webflow.io`, `api.webflow.com` и
`cdn.prod.website-files.com` из этого окружения закрыты (403 на CONNECT),
поэтому HTML живого сайта скачать нельзя. Но Webflow MCP отдаёт
custom code постранично: `data_scripts_tool > get_page_freeform_code`
с `page_id`. Список страниц — `data_pages_tool > list_pages`.

Файлы называются `<slug>.<head|footer>.html`. Почти вся механика живёт
в `footer`; `head` — это SEO-бойлерплейт (выгружен только для главной,
где в нём ещё и CSS).

## Главное открытие: квиз — это дерево, а не список

Вопрос **Q_EMO** (барабан с 7 словами) не просто записывает ответ — он
уводит на **одну из семи отдельных страниц** с уточняющим вопросом:

| выбор на барабане | страница | вопрос уточнения | ответов |
|---|---|---|---|
| CALM | `/q-calm` | What does calm smell like to you? | 6 + open |
| COZY | `/q-cozy` | What does cozy smell like to you? | 6 + open |
| ENERGETIC | `/q-energy` | What does energy smell like to you? | 6 + open |
| MYSTERIOUS | `/q-myst` | What does mystery smell like to you? | 7 + open |
| PLAYFUL | `/q-play` | What does playful smell like to you? | 6 + open |
| SEXY | `/q-sexy` | What does sexy smell like to you? | 5 + open |
| FOCUSED | `/q-focus` | What helps you concentrate? | 6 + open |

Все семь сходятся обратно на `/q-env-child`. То есть каждый проходящий
отвечает ровно на один из этих семи вопросов, а остальные шесть не видит
никогда. В моём порте этой ветки нет вообще — там барабан просто
записывал эмоцию и шёл дальше.

## Порядок шагов

Прогресс-бар в проде показывает 76% на `q-calm-now`, 82% на `q-sweet`,
88% на `q-wild`. Это ровно 13/17, 14/17, 15/17 — значит шагов **17**:

```
 1 q-gender        5 q-staywell     9 <ветка эмоции>  13 q-calm-now    17 q-radius
 2 q-region-now    6 q-atmos       10 q-env-child     14 q-sweet
 3 q-generation    7 q-yourself    11 q-region-child  15 q-wild        → q-open
 4 q-daytday       8 q-emo         12 q-celebrate     16 q-skin-behavior → /result
```

Переходы `q-region-now → q-generation`, `q-region-child → q-celebrate`,
`q-celebrate → q-calm-now`, `q-calm-now → q-sweet` и
`<ветка> → q-env-child` прописаны в коде явно. Остальные — из арифметики
прогресс-бара; сами ссылки живут в Webflow-элементах страниц.

**Нестыковка для решения:** на главной написано «Twelve questions», в SEO-описании
«Answer 15 questions», в JSON-LD «7-block quiz», а фактически 17 шагов.

## Архитектура страницы вопроса

Два разных подхода, вперемешку:

**А. Оверлей поверх Webflow.** Скрипт строит свой `position:fixed; inset:0`
слой, прячет оригинальную секцию (`[data-question-id="Q_X"] {display:none}`),
а при выборе находит скрытую вебфлоу-кнопку и дёргает её:

```js
const btn = document.querySelector('[data-answer-key="' + key + '"]');
if (btn) btn.click();
```

Клик по кнопке и запускает всё остальное: подсчёт весов
(`ANSWER_WEIGHTS` в `page-q-open-footer.html`), запись в sessionStorage,
переход на следующую страницу. Так сделаны: `q-gender`, `q-generation`,
`q-daytday`, `q-staywell`, `q-emo`, `q-sweet`, `q-wild`, `q-env-child`,
`q-region-now`, `q-region-child`.

**Б. Украшение вебфлоу-кнопок.** Скрипт ничего не строит, а навешивает
фон/видео/эффект прямо на существующие `[data-answer-key]`. Так сделаны:
`q-atmos`, `q-yourself`, `q-celebrate`, `q-calm-now`, `q-focus`,
`q-calm`, `q-cozy`, `q-energy`, `q-myst`, `q-play`, `q-sexy`,
`q-skin-behavior`, `q-radius`.

**Важное следствие:** у страниц группы Б тексты ответов лежат в
Webflow-дизайне, а не в коде. Их через MCP custom code не достать —
нужен либо доступ к DOM страницы, либо ты их пришлёшь, либо я вытащу
их из `ANSWER_WEIGHTS` (там есть ключи, но не формулировки).

## Зерно (grain)

Это не текстура-картинка. На каждой странице свой canvas со случайным
шумом, перерисовкой раз в 80 мс:

```js
cvs.style.cssText = 'position:fixed;inset:0;...;z-index:9997;opacity:0.07;mix-blend-mode:overlay;';
// каждые 80мс: createImageData → d[i]=d[i+1]=d[i+2]=Math.random()*255 → putImageData
```

Одинаковый код скопирован в 15 страниц. `opacity` 0.07, на
`q-env-child` и бутылках — 0.06.

## Что где: механика по вопросам

| Страница | Фон | Механика | Ассеты |
|---|---|---|---|
| **home** | фото + скрим + tint | статика, три шага «How it works» | 1 фото |
| **q-gender** | видео | десктоп: сплит 50/50, видео слева меняется по ховеру. Мобайл: 3 полосы по 26dvh, в каждой своё видео на opacity 0.45 | 3 видео Cloudinary |
| **q-region-now** | — | поиск по 190 странам, свой инпут + список | — |
| **q-generation** | `#3d3d20` | 4 карточки с canvas-текстурами, перерисовка каждые 150 мс: синий шум/плёнка с перфорацией/VHS-строки/ч-б | — |
| **q-daytday** | `#c0c0ac` | ответы **падают сверху** как макароны (случайный X, поворот, задержка, отскок). При выборе строка **распадается на частицы** (55 кадров). Фон — 5 дрейфующих радиальных кляксы | — |
| **q-staywell** | `#953d27` | вопрос выезжает слева, ответы проявляются по 110 мс, потом **волна по буквам** (transform + letter-spacing). При выборе всё улетает на `translateX(120vw)`. Сверху 12 анимированных контурных линий | — |
| **q-atmos** | фото по ответу | фон на весь экран меняется под наведённый ответ | 8 фото |
| **q-yourself** | фото по ответу | то же | 5 фото |
| **q-emo** | фото по слову | **барабан**: 7 слов по 80px, автопрокрут 0.4px/кадр, рывок-нудж при загрузке, drag/колесо/стрелки, тап = выбор, простой 3 сек → автопрокрут снова | 7 фото |
| **ветка эмоции** (7 стр.) | — | фото-плитки: ховер = scale(1.04) + остальные на 0.4. Плюс open-answer модалка | 42 фото |
| **q-env-child** | `#b8bfaa` | вопрос в центре, 4 ответа **по углам** сетки. Фон — 4 плотных терракотовых `#c4503a` эллипса, дрейфуют | — |
| **q-region-child** | — | тот же поиск по странам | — |
| **q-celebrate** | фото на весь экран | фон по ответу + open-answer | 8 фото |
| **q-calm-now** | фото на весь экран | фон по ответу + open-answer | 9 фото |
| **q-sweet** | `#e0d6a2` | **бутылка на canvas**, тянешь вверх — наливается. 4 уровня (0/0.33/0.66/1), жидкость с двойной синусоидой и блеском, шевроны-подсказка «дышат», потом `CONFIRM →` | — |
| **q-wild** | `#7a8c4a` | то же, другая палитра (оливковый фон, коричневая жидкость) | — |
| **q-skin-behavior** | — | в каждую кнопку вставлено **видео флакона** с `mix-blend-mode:screen`, автопереход каждые 2200 мс | 5 видео Cloudinary |
| **q-radius** | — | **облако запаха** — шарик летит к наведённому ответу и растёт по уровню (80/140/220/320px). Плюс 28 плавающих пузырей | — |

## Шрифты и палитра

Живой сайт:

- **HIGHCRUISER** — все вопросы (кастомный, фолбэк `'Arial Black', Arial`)
- **Fraunces 900** — заголовок главной, терракотовый
- **Inconsolata** — ответы, подписи, кнопки
- **Georgia serif** — только внутри open-answer модалок

Цвета главной: `--charcoal-950 #141917`, `--charcoal #26302E`,
`--terracotta #D03D01`, `--gold/olive #BBA149`, `--cream #EBE4CF`.
У каждого вопроса свой фон — список в таблице выше. Часто возвращается
`#f1e09b` (акцент выбранного) и `#3d3d20` (тёмная олива).

## Тексты вопросов (из кода, дословно)

```
q-gender      HOW DO YOU PREFER YOUR SCENT TO FEEL ON YOU?
q-region-now  Where do you live now?
q-generation  WHICH GENERATION DO YOU BELONG TO?
q-daytday     WHEN YOU IMAGINE YOUR IDEAL DAY, WHICH FEELS MOST LIKE YOU?
q-staywell    WHAT MAKES A SPACE FEEL LIKE YOURS?
q-emo         FOR THIS FRAGRANCE, I WANT TO FEEL...
q-env-child   WHERE DID YOU GROW UP?
q-region-child Where did you grow up?
q-sweet       HOW DO YOU FEEL ABOUT SWEETNESS IN A PERFUME?
q-wild        HOW DO YOU FEEL ABOUT RAW, EARTHY NOTES?
```

Про два «Where did you grow up?»: `q-env-child` — это **тип места**
(BIG CITY / SMALL TOWN / BY THE SEA / NATURE), `q-region-child` — это
**страна** из списка. Оба нужны, как ты и сказала; менять надо только
формулировку одного из них, чтобы не дублировалась.

## Картинки: всё в Cloudinary, карта собрана

В живых страницах 80 ссылок на `cdn.prod.website-files.com`.
В Cloudinary 302 картинки, и имена совпадают один в один — вебфлоу-файл
`..._cozy-blanket.png` это `cozy-blanket_cvfuyi` в
`findmysmell site/Q-EMO/cozy`. Сопоставил автоматически по имени:

- **79 из 80** легли в `tools/quiz-image-map.json`
- не хватает одной: `hf_20260423_114818_...png` — это og:image/twitter:image
  для превью в соцсетях, в Cloudinary её нет. Всё равно переделывается
  вместе с шеринговой карточкой.

Видео тоже уже в Cloudinary и в коде на неё и ссылаются:
`feminine_vjqnhb.mp4`, `unisex_ml3vxc.mp4`, `masculine_l95axl.mp4`,
`disappears_bottle_ocb5co.mp4`, `normal_bottle_iw2fsv.mp4`,
`sweet_bottle_bklqke.mp4`, `bitter_bottle_inlsov.mp4`,
`not_sure_bottle_vdb1fs.mp4`.

## Честно: что из моего порта годится, что нет

**Годится:**

- движок архетипа (`ANSWER_WEIGHTS`, 164 варианта × 7) — он на стороне
  `q-open` и не менялся
- Scent DNA — проверен против живого движка, 20015 случаев, 0 расхождений
- страница результата по структуре (DNA → ингредиенты → главный парфюм →
  альтернативы → винил), футер, прогресс-бар
- карта картинок результата (`tools/image-map.json`, 124 пары)
- база, письмо через Brevo, privacy/legal notice

**Переделывать:**

- **главная** — у меня три колонки с золотыми капсами; в проде фото на
  весь экран, Fraunces терракотовый «ThereIsNo Universal Scent», другой
  текст целиком, «How it works» из трёх шагов на кремовом
- **все экраны вопросов** — у меня их нет вовсе в этом виде; в проде
  десять с лишним разных механик, каждая со своим фоном и анимацией
- **ветка эмоции** — семь страниц, которых у меня нет
- **зерно** — нигде не реализовано
- **шрифты** — HIGHCRUISER/Fraunces/Inconsolata вместо того, что у меня

## Дефекты, найденные в проде

1. **Анимация трёх шагов на главной не работает.** В `head` есть
   `.s3-step { opacity: 0 }` + `.reveal` + `@keyframes stepReveal`, но
   в `footer` тот же блок CSS переопределён без `opacity:0`, а скрипт,
   который должен вешать `.reveal`, ищет `#fms-s1` и `#fms-hint` — таких
   элементов на странице нет. Скрипт выходит на первой строке.
2. **Параллакс героя тоже мёртвый** — `will-change:transform` на
   `.hero-bg` есть, JS нет.
3. **`q-celebrate`, `q-calm-now` и 6 из 7 страниц-веток при open-answer
   обходят движок весов.** Вместо клика по кнопке они сами пишут
   `quiz_answers['Q_X'] = 'Q_X__OTHER'` и делают `location.href`.
   Значит открытый ответ вообще не влияет на архетип. У `q-focus` и
   `q-play` — правильно, через `btn.click()`.
4. **`q-sweet` и `q-wild` глобально ломают страницу:**
   `*{margin:0;padding:0}` и `html,body{overflow:hidden;background:...}`
   в page-level CSS. То же на `q-env-child`.
5. **`q-yourself` на мобайле:** есть `touchstart` с `preventDefault`,
   но нет `touchend` — второй тап срабатывает только через нативный клик.
6. **`q-staywell`:** контурные линии лежат на `z-index:10000`, то есть
   **поверх** слоя с ответами (`9999`), и рисуются прямо по тексту.
   Клики они не перехватывают (`pointer-events:none`), так что это
   вопрос вкуса, а не баг — но выглядит как недосмотр.
7. **`calmnow-water.jpeg` в Cloudinary лежит как `calmnow-wat`** — имя
   обрезано, автосопоставление её не нашло, вписал вручную.

## Добавлено после скриншотов, части 5/6

Прогресс-бар подтвердил шаги: `q-skin-behavior` = 94% (16/17),
`q-radius` = 100% (17/17). Арифметика сошлась.

**Тексты ответов, которых не было в коде** (сняты со скриншотов):

`q-skin-behavior` — «How does perfume behave on your skin?»

| ключ | ответ |
|---|---|
| `Q_SKIN_BEHAVIOR__DISAPEAR` | It disappears quickly |
| `Q_SKIN_BEHAVIOR__NORMAL` | It lasts normally |
| `Q_SKIN_BEHAVIOR__SWEETER` | It becomes sweeter |
| `Q_SKIN_BEHAVIOR__SHARPER` | It becomes more bitter |
| `Q_SKIN_BEHAVIOR__NOT_SURE` | Not sure |

Кнопки — чёрные пилюли на оливковом `#8a8547`, видео флакона справа
внутри активной. Вопрос белым, HIGHCRUISER.

`q-radius` — «Do you prefer your scent to stay close to the skin or
project around you?»

| ключ | ответ |
|---|---|
| `Q_RADIUS__CLOSE` | Close to skin: only me |
| `Q_RADIUS__SOFT` | Soft aura: only me and closest to me |
| `Q_RADIUS__NOTICEABLE` | Noticeable: people start looking at you |
| `Q_RADIUS__BOLD` | Bold: everyone must know |

Фон кремовый, пилюли почти белые, пузыри `#f1e09b` видны поверх всего.
Вопрос тёмным — единственный экран, где он не белый.

**`q-open` — финальный экран:**

```
Last question, and it's all yours.

A scent memory, a perfume you love, a place that has a meaningful
for you smell?

Share what comes to mind in this moment:

[ textarea ]

You just finished the quiz — none of it asked for your name or email.
Can we include your anonymous answers in fragrance research?
No email or identifying info, ever.

[ AGREE & SEE MY RESULT ]   (залитая золотом)
[ NO THANKS — JUST MY RESULT ]   (контурная)
```

В строке «a place that has a meaningful for you smell?» сломана
грамматика — в проде так и висит.

**Шапка и футер вопросов:** слева `FIND MY SMELL`, справа `EN ▾`, оба
белым поверх фона вопроса. Футер: `PRIVACY · LEGAL · INSTAGRAM ·
CONTACT · © 2026 FIND MY SMELL`. Прогресс-бар — подпись `94% COMPLETE`
слева, полоска справа. Это у меня уже сделано так же.

## Текст результата: у меня он не короче

Проверил на HUG (это тот архетип на скриншотах — «confessions than a
priest» принадлежит ему). В проде шесть абзацев `desc`, в моих данных
те же шесть, побайтово. Прогнал каждый через собранный HTML моей
страницы — все шесть на месте, ни один не теряется: первый уходит над
диаграммой ДНК, четыре в основной блок, последний курсивом в конце.

Типографика тоже почти совпадает:

| | прод | у меня |
|---|---|---|
| размер | `clamp(18px, 2.8vw, 26px)` | `clamp(17px, 2.2vw, 24px)` |
| интерлиньяж | 1.75 | 1.75 |
| прозрачность | 0.8 | 0.82 |
| ширина колонки | 750px | 62ch (≈744px) |
| отступ между абзацами | 40px | 32px |

На телефоне это 18px против 17px — разница 6%, на «в два раза больше
текста» не тянет.

**Зато нашёл настоящую разницу — «фонарик».** У блока личности в проде
есть `.fms-personality-texture`: картинка
`textured-wall_sh9lpw.png` на весь блок, `opacity 0.35`,
`mix-blend-mode: multiply`, и поверх неё маска из **четырёх радиальных
градиентов**, которые следуют за курсором/пальцем:

```css
mask-image:
  radial-gradient(circle 160px at var(--mx) var(--my), black 0%, ...),
  radial-gradient(circle 120px at var(--mx1) var(--my1), ...),
  radial-gradient(circle  90px at var(--mx2) var(--my2), ...),
  radial-gradient(circle  60px at var(--mx3) var(--my3), ...);
```

Четыре круга с разным запаздыванием — получается шлейф, текстура
проявляется там, где ведёшь, и гаснет за тобой. Плюс
`box-shadow: inset 0 0 100px 60px` по краям как виньетка. Это и есть та
бледная картинка за текстом на скриншоте. У меня этого нет вообще.

## Чего ещё не видел

- тексты ответов на 11 страницах группы Б (Q_ATMOS, Q_YOURSELF,
  Q_CELEBRATE, Q_CALM_NOW и семь страниц-веток)
- `head`-блоки 22 страниц
- часть 6 скриншотов

## Почему картинки грузятся долго

Замерил вместо догадок. В Cloudinary **302 картинки и 357 МБ**, из них
98% веса — PNG. В живом коде ссылки идут **без трансформаций вообще**:
`/upload/v123/file.png`, то есть отдаётся оригинал.

Плюс страницы вопросов предзагружают **все** фотографии ответов сразу:

```js
Object.values(imageMap).forEach(url => { const img = new Image(); img.src = url; });
```

Отсюда веса при открытии страницы: `q-calm-now` — 30.7 МБ, `q-atmos` —
25.5 МБ, `q-celebrate` — 15.5 МБ. Всего по двенадцати страницам с фото
**150.1 МБ**.

Отдельно хорош кружок ингредиента на странице результата: в CSS он
`clamp(64px, 9vw, 120px)`, а приезжает PNG 2048×2048 на 6.5 МБ. У
OUTOFTIME пять таких кружков весят 20.9 МБ.

### Насколько помогает трансформация (замерено, не оценка)

Через Cloudinary explicit API — реальный размер производной:

| картинка | оригинал | после | во сколько |
|---|---|---|---|
| calmnow-wat 2048×1152 → `c_limit,w_1400` | 4 241 861 | 137 362 | 31× |
| oud1 2048×2048 → кружок 240×240 | 6 563 360 | 12 065 | 544× |
| cozy-blanket 1921×481 → `c_limit,w_1000` | 1 560 838 | 37 602 | 42× |
| home/hero 1536×1536 → `c_limit,w_1600` | 3 752 217 | 348 984 | 11× |
| eau-duelle 800×1200 → `c_limit,w_600` | 416 169 | 72 577 | 5.7× |

Страница результата HUG целиком, все девять картинок замерены:
**12.8 МБ → 193 КБ, в 67 раз**. Перезаливать ничего не надо — оригиналы
остаются, отдаётся производная.

### Что я на этом починил и нашёл

В Next.js-версии вся доставка теперь идёт через `cld()`
(`web/src/lib/cloudinary.ts`) с пресетом на каждый слот. Проверено: в
собранных страницах **201 тег `<img>`, все через трансформацию, ни одного
без**. Проверки — `npm run check:images`.

Заодно поймал свою же ошибку в главной. Я раньше вписал в данные
`f_auto,q_auto,w_1600` и решил, что слитная форма не применяется —
документация Cloudinary так и говорит. **Замер это опроверг:**
3 752 217 → 337 404, работает. Настоящий дефект был другой: `w_` без
режима кропа означает `c_scale`, который **растягивает**, и ссылка
отдавала 1600×1600 из картинки 1536×1536. Поэтому во всех пресетах
режим кропа указан явно, а для фонов это `c_limit` — он уменьшает, но
никогда не увеличивает.

На живом сайте те же правки **залиты** — 14 страниц, которые грузят
картинки и видео. Проверял не на глаз: прочитал все 14 блоков обратно из
Webflow одним запросом и сравнил с локальными файлами побайтово, 14 из 14
совпадают, ссылок без трансформации в живом коде ноль. Файлы и порядок
откатa — в `webflow/live-pages-optimised/README.md`.

Не залит только `home.head.html`: там меняется одна ссылка на og:image,
которая влияет на превью в соцсетях, а не на загрузку, а блок — 11.6 КБ
SEO-боилерплейта с токеном google-site-verification. Лежит готовым.

Страница результата живёт отдельно: её картинки приходят из `result48.js`
через jsDelivr с ветки `main`. Правки в скрипте сделаны, но до прода они
дойдут только после мержа в `main`.
