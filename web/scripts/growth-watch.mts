/**
 * Сторож роста: то, что ломается не сразу, а когда придут люди.
 *
 * Запуск в проде: тем же сервисом, что и копия базы, сразу после неё.
 * Вручную:        cd web && npx tsx scripts/growth-watch.mts
 *
 * ЗАЧЕМ. Заказчица запускает квиз на аудиторию и попросила следить за
 * пределами, а не узнавать о них по факту. Все три предела здесь —
 * из тех, что не дают о себе знать заранее: место на диске кончается
 * молча, лимит писем кончается молча, и узнаёшь об этом, когда человек
 * не получил результат.
 *
 * Скрипт НИЧЕГО НЕ ЧИНИТ. Он считает и кричит. Падает (ненулевой код)
 * только когда предел уже близко — тогда запуск в Railway виден красным,
 * а не теряется среди зелёных.
 *
 * ПОРОГИ ЗДЕСЬ, А НЕ В ГОЛОВЕ. Меняются правкой этого файла: если
 * увеличить том или тариф, поправить надо здесь, иначе сторож будет
 * врать в обе стороны.
 */
import { Client } from 'pg';

/** Сколько мегабайт у тома Postgres. Railway: сервис Postgres → том. */
const VOLUME_MB = Number(process.env.WATCH_VOLUME_MB ?? 500);
/** Доля тома, после которой пора шевелиться. */
const WARN_AT = 0.7;
const FAIL_AT = 0.85;

let alarms = 0;
function line(name: string, value: string, level: 'ok' | 'warn' | 'fail' = 'ok') {
  const mark = level === 'ok' ? '  ok  ' : level === 'warn' ? ' ВНИМ ' : ' ПОРА ';
  if (level !== 'ok') alarms += 1;
  console.log(`${mark} ${name.padEnd(34)} ${value}`);
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  console.log('\nМесто на диске');
  {
    const { rows } = await db.query<{ mb: string }>(
      'select pg_database_size(current_database()) / 1024 / 1024 as mb',
    );
    const mb = Number(rows[0].mb);
    const share = mb / VOLUME_MB;
    line('база занимает', `${mb} МБ из ${VOLUME_MB} (${(share * 100).toFixed(0)}%)`,
      share >= FAIL_AT ? 'fail' : share >= WARN_AT ? 'warn' : 'ok');

    const { rows: big } = await db.query<{ t: string; mb: string }>(`
      select relname t, pg_total_relation_size(c.oid) / 1024 / 1024 mb
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by pg_total_relation_size(c.oid) desc limit 4`);
    for (const r of big) line(`  таблица ${r.t}`, `${r.mb} МБ`);
  }

  console.log('\nСколько событий воронки на одно прохождение');
  {
    /* Воронка растёт быстрее всего: она пишется на каждый показ и на
       каждый ответ. Если на прохождение их станет заметно больше, чем
       шагов квиза, значит где-то дубли — и диск съест именно это. */
    const { rows } = await db.query<{ events: string; runs: string }>(
      "select count(*) events, count(distinct run_token) runs from funnel_events",
    );
    const events = Number(rows[0].events);
    const runs = Number(rows[0].runs) || 1;
    const per = events / runs;
    line('событий на прохождение', per.toFixed(1),
      per > 60 ? 'fail' : per > 45 ? 'warn' : 'ok');
    line('  всего событий', String(events));
  }

  console.log('\nПисьма');
  {
    const { rows } = await db.query<{ day: string; week: string }>(`
      select count(*) filter (where consent_at > now() - interval '1 day') day,
             count(*) filter (where consent_at > now() - interval '7 days') week
      from subscribers`);
    line('подписок за сутки', rows[0].day);
    line('подписок за неделю', rows[0].week);

    /* Остаток по тарифу спрашиваем у самого Brevo: считать его по своей
       таблице нельзя — она не знает ни про тариф, ни про рассылки,
       отправленные из панели. Ключ приходит ссылкой на переменную
       сервиса web, значением его здесь никто не видит. */
    const key = process.env.BREVO_API_KEY;
    if (!key) {
      line('остаток писем у Brevo', 'ключа нет, проверка пропущена', 'warn');
    } else {
      try {
        const res = await fetch('https://api.brevo.com/v3/account', {
          headers: { 'api-key': key, accept: 'application/json' },
        });
        if (!res.ok) {
          line('остаток писем у Brevo', `ответ ${res.status}`, 'warn');
        } else {
          const acc = await res.json() as {
            plan?: Array<{ type?: string; credits?: number; creditsType?: string }>;
          };
          const sending = (acc.plan ?? []).filter((p) => p.creditsType === 'sendLimit');
          if (sending.length === 0) line('остаток писем у Brevo', 'тариф без лимита писем');
          for (const p of sending) {
            const left = Number(p.credits ?? 0);
            line(`остаток писем (${p.type ?? 'план'})`, String(left),
              left < 100 ? 'fail' : left < 500 ? 'warn' : 'ok');
          }
        }
      } catch (e) {
        line('остаток писем у Brevo', `не спросить: ${String(e)}`, 'warn');
      }
    }
  }

  await db.end();

  console.log(alarms === 0
    ? '\nПределы далеко.\n'
    : `\nТребует внимания: ${alarms}. Подробности выше.\n`);
  /* Падаем только когда что-то реально близко: иначе красный запуск
     перестанут читать. */
  process.exit(alarms > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\nСТОРОЖ НЕ ОТРАБОТАЛ:', error instanceof Error ? error.message : error);
  process.exit(1);
});
