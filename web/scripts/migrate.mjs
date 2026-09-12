/**
 * Прогон миграций перед деплоем. Вызывается из railway.json
 * (deploy.preDeployCommand) и ничего не печатает в норме, кроме итога.
 *
 * Почему не `npx drizzle-kit migrate`, как было раньше: drizzle-kit лежит
 * в devDependencies, а читает он ещё и drizzle.config.ts — то есть требует
 * и dev-зависимости, и TypeScript в рантайм-образе. Railpack образ для
 * рантайма обрезает до production-зависимостей, так что это могло молча
 * не найтись (или полезть тянуть пакет из сети на каждый деплой).
 *
 * Здесь используются только `drizzle-orm` и `pg` — обе в dependencies,
 * и обычный .mjs без сборки. Миграции те же, из папки drizzle/.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'DATABASE_URL не задан. В Railway он появляется, когда сервис приложения ' +
      'слинкован с сервисом Postgres (переменная DATABASE_URL = ${{Postgres.DATABASE_URL}}).',
  );
  process.exit(1);
}

const pool = new Pool({ connectionString });

try {
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  console.log('Миграции применены.');
} catch (error) {
  // Падаем с ненулевым кодом: деплой не должен встать на базе,
  // схема которой не соответствует коду.
  console.error('Миграции не применились:', error);
  process.exit(1);
} finally {
  await pool.end();
}
