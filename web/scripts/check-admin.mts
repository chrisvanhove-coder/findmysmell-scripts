/**
 * Проверка замка на /admin.
 *
 * Запуск:  cd web && npm run check:admin
 *
 * Здесь проверяется не вёрстка страницы, а ровно одно: что без правильного
 * пароля наружу не уходит ничего. Это единственное место в приложении, где
 * видны ответы всех людей целиком, поэтому замок проверяется отдельно и
 * без сети — вызовом самой функции, а не запросом к поднятому серверу.
 */
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

/** Модуль читает process.env при вызове, поэтому импорт один, а env меняем. */
const { default: proxy, config } = await import('../src/proxy.ts');

function request(password?: string) {
  const headers = new Headers();
  if (password !== undefined) {
    headers.set('authorization', `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`);
  }
  return new NextRequest('https://findmysmell.com/admin', { headers });
}

const PASSWORD = 'correct horse battery staple';

console.log('\nБез ADMIN_PASSWORD админки не существует');
{
  delete process.env.ADMIN_PASSWORD;
  // Забытая переменная должна означать «страницы нет», а не «вход свободный».
  const anonymous = await proxy(request());
  check('без пароля в окружении отдаётся 404', anonymous.status === 404,
    `статус ${anonymous.status}`);

  const withHeader = await proxy(request(PASSWORD));
  check('и с присланным паролем тоже 404', withHeader.status === 404,
    `статус ${withHeader.status}`);
}

console.log('\nС ADMIN_PASSWORD замок закрыт для всех остальных');
{
  process.env.ADMIN_PASSWORD = PASSWORD;

  const anonymous = await proxy(request());
  check('без заголовка — 401', anonymous.status === 401, `статус ${anonymous.status}`);
  check('браузеру сказано спросить пароль',
    (anonymous.headers.get('www-authenticate') ?? '').startsWith('Basic realm='),
    String(anonymous.headers.get('www-authenticate')));
  check('ответ 401 не кешируется',
    anonymous.headers.get('cache-control') === 'no-store');

  const wrong: Array<[string, string]> = [
    ['пустой пароль', ''],
    ['другой пароль', 'hunter2'],
    ['правильный с лишним символом', `${PASSWORD} `],
    ['правильный без последнего символа', PASSWORD.slice(0, -1)],
    ['правильный в другом регистре', PASSWORD.toUpperCase()],
  ];
  for (const [label, value] of wrong) {
    const res = await proxy(request(value));
    check(`отклоняется: ${label}`, res.status === 401, `статус ${res.status}`);
  }

  // Мусор вместо base64 не должен ронять функцию — только закрывать вход.
  const odd: Array<[string, string]> = [
    ['не base64', 'Basic @@@@@'],
    ['пустой', 'Basic '],
    ['base64 без двоеточия', `Basic ${Buffer.from(PASSWORD).toString('base64')}`],
    ['только логин', `Basic ${Buffer.from('admin:').toString('base64')}`],
  ];
  for (const [label, value] of odd) {
    const res = await proxy(new NextRequest('https://findmysmell.com/admin', {
      headers: new Headers({ authorization: value }),
    }));
    check(`битый заголовок (${label}) даёт 401, а не исключение`, res.status === 401,
      `статус ${res.status}`);
  }

  const bearer = new NextRequest('https://findmysmell.com/admin', {
    headers: new Headers({ authorization: `Bearer ${PASSWORD}` }),
  });
  check('не-Basic схема отклоняется', (await proxy(bearer)).status === 401);

  const ok = await proxy(request(PASSWORD));
  check('верный пароль пропускает', ok.status === 200, `статус ${ok.status}`);
  check('страница закрыта от поисковиков',
    (ok.headers.get('x-robots-tag') ?? '').includes('noindex'),
    String(ok.headers.get('x-robots-tag')));
}

console.log('\nЗамок стоит на всей ветке /admin');
{
  const matcher = (config as { matcher: string[] }).matcher;
  check('/admin в matcher', matcher.includes('/admin'), matcher.join(' '));
  check('вложенные адреса в matcher',
    matcher.some((m) => m.startsWith('/admin/')), matcher.join(' '));

  // Всё, что лежит под src/app/admin, обязано попадать под matcher — иначе
  // новый адрес однажды окажется открытым.
  const page = readFileSync('src/app/admin/page.tsx', 'utf8');
  check('страница не кешируется', page.includes("dynamic = 'force-dynamic'"));
  check('страница помечена noindex', page.includes('noindex'));

  const csv = readFileSync('src/app/admin/submissions.csv/route.ts', 'utf8');
  check('выгрузка не кешируется', csv.includes("dynamic = 'force-dynamic'"));
}

console.log('\nАдминка не раскрывает личных данных');
{
  const data = readFileSync('src/lib/admin-data.ts', 'utf8');
  // Адреса лежат в отдельной таблице по отдельному согласию. На странице
  // показывать их нельзя: она про ответы, а не про людей.
  check('адреса подписчиков не выбираются',
    !/subscribers\.email/.test(data),
    'в выборках админки не должно быть subscribers.email');
  check('ключи браузеров не выводятся в CSV',
    !/browserKey/.test(data.split('export async function submissionsCsv')[1] ?? ''),
    'ключ браузера — идентификатор, в выгрузку он не нужен');
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nвсе проверки прошли\n');
process.exit(failed ? 1 : 0);
