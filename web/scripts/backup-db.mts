/**
 * Ночная резервная копия базы в объектное хранилище.
 *
 * Запуск в проде: сервис `backup-and-watch` на Railway, ночью по расписанию.
 * Вручную:        cd web && npx tsx scripts/backup-db.mts
 *
 * ЗАЧЕМ ЭТО ВООБЩЕ ЕСТЬ. У тома Postgres на Railway встроенных копий мы
 * не нашли — ни в панели, ни через API. То есть до этого скрипта
 * единственный экземпляр всех прохождений лежал на одном диске, и его
 * потеря означала бы потерю всего, что люди написали. Заказчица назвала
 * открытые ответы самым важным в квизе; терять их нечем.
 *
 * ПОЧЕМУ НЕ pg_dump. Сервис собирается из этого репозитория, а не из
 * образа postgres: клиента pg_dump в нём нет. Поэтому копия снимается
 * запросами и пишется как NDJSON — по строке JSON на запись. Формат
 * выбран не для красоты: NDJSON читается построчно, поэтому битый хвост
 * (оборванная закачка, кончившееся место) портит последнюю строку, а не
 * весь файл, и восстановить можно всё остальное.
 *
 * ЧТО КОПИРУЕТСЯ. Всё, что нельзя восстановить из репозитория:
 * прохождения, тексты «Other», подписчики, воронка. Каталог парфюма
 * (`perfumes`) НЕ копируется — он целиком лежит в
 * `src/data/perfumes.json` и восстанавливается сидом.
 *
 * ПРОВЕРКА ПОСЛЕ ЗАПИСИ ОБЯЗАТЕЛЬНА. Копия, о которой известно только
 * то, что её «отправили», — не копия. Скрипт после заливки читает объект
 * обратно и сверяет размер; не сошлось — падает с ненулевым кодом, и
 * запуск в Railway виден как упавший.
 *
 * СРОК ХРАНЕНИЯ копий — BACKUP_KEEP_DAYS (по умолчанию 30). Старые
 * удаляются тем же запуском. Это не противоречит срокам хранения из
 * политики: те считаются от даты записи, а `purge-retention` чистит
 * саму базу; копия живёт заметно меньше любого из обещанных сроков.
 */
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { Client } from 'pg';
import { AwsClient } from 'aws4fetch';

const KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS ?? 30);

/* Таблицы в порядке восстановления: сначала те, на кого ссылаются.
   question_open_answers держит внешний ключ на submissions. */
const TABLES = ['submissions', 'question_open_answers', 'subscribers', 'funnel_events'];

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`нет переменной ${name}`);
  return value;
}

const s3 = new AwsClient({
  accessKeyId: need('BUCKET_ACCESS_KEY_ID'),
  secretAccessKey: need('BUCKET_SECRET_ACCESS_KEY'),
  service: 's3',
  region: process.env.BUCKET_REGION ?? 'auto',
});

/**
 * Адрес бакета. Railway отдаёт ENDPOINT без имени бакета
 * (`https://t3.storageapi.dev`) и ждёт virtual-hosted-стиль: имя бакета
 * поддоменом, а не первым сегментом пути. Путевой стиль там остался
 * только у бакетов, созданных до перехода, — новый ответит 404, и
 * копия молча уедет в никуда. Поэтому адрес собирается явно.
 */
const endpoint = new URL(need('BUCKET_ENDPOINT'));
const bucket = need('BUCKET_NAME');
const base = `${endpoint.protocol}//${bucket}.${endpoint.host}`;

const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const key = `db/${stamp}.ndjson.gz`;

async function dump(db: Client): Promise<Buffer> {
  const lines: string[] = [];
  for (const table of TABLES) {
    /* Курсор здесь не нужен: таблицы читаются целиком, и при разумных
       объёмах это десятки мегабайт. Когда перестанет помещаться в
       память, здесь появится COPY ... TO STDOUT — и это будет видно по
       упавшему запуску, а не по тихо усечённой копии. */
    const { rows } = await db.query(`select * from ${table}`);
    for (const row of rows) lines.push(JSON.stringify({ _t: table, ...row }));
    console.log(`  ${table.padEnd(22)} ${String(rows.length).padStart(7)} строк`);
  }
  const chunks: Buffer[] = [];
  const gzip = createGzip();
  gzip.on('data', (c: Buffer) => chunks.push(c));
  await pipeline(Readable.from(lines.map((l) => `${l}\n`)), gzip);
  return Buffer.concat(chunks);
}

/** Список копий в хранилище, от старых к новым. */
async function listBackups(): Promise<string[]> {
  const res = await s3.fetch(`${base}?list-type=2&prefix=db/`);
  if (!res.ok) throw new Error(`список копий: ${res.status} ${await res.text()}`);
  const xml = await res.text();
  return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]).sort();
}

async function main() {
  const db = new Client({ connectionString: need('DATABASE_URL') });
  await db.connect();

  console.log('\nСнимаю копию');
  const body = await dump(db);
  await db.end();
  console.log(`  сжато: ${(body.length / 1024).toFixed(1)} КБ\n`);

  const put = await s3.fetch(`${base}/${key}`, {
    method: 'PUT',
    body,
    headers: { 'content-type': 'application/gzip' },
  });
  if (!put.ok) throw new Error(`заливка: ${put.status} ${await put.text()}`);

  /* Читаем обратно. Копия, про которую известно только то, что её
     отправили, копией не является. */
  const back = await s3.fetch(`${base}/${key}`, { method: 'HEAD' });
  if (!back.ok) throw new Error(`проверка: объекта нет, ${back.status}`);
  const size = Number(back.headers.get('content-length'));
  if (size !== body.length) {
    throw new Error(`проверка: размер не сошёлся, ${size} вместо ${body.length}`);
  }
  console.log(`Копия на месте: ${key} (${size} байт)`);

  const all = await listBackups();
  const cutoff = Date.now() - KEEP_DAYS * 24 * 3600 * 1000;
  let removed = 0;
  for (const k of all) {
    const iso = k.slice(3, 13).replace(/-/g, '/');
    if (Number.isNaN(Date.parse(iso)) || Date.parse(iso) >= cutoff) continue;
    const del = await s3.fetch(`${base}/${k}`, { method: 'DELETE' });
    if (del.ok) removed += 1;
  }
  console.log(`Копий в хранилище: ${all.length - removed}, удалено старых: ${removed}`);
}

main().catch((error) => {
  console.error('\nКОПИЯ НЕ СНЯТА:', error instanceof Error ? error.message : error);
  process.exit(1);
});
