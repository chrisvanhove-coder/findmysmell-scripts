import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Railway подставляет DATABASE_URL автоматически, когда сервис приложения
// слинкован с сервисом Postgres. Локально — через web/.env.
const connectionString = process.env.DATABASE_URL;

let pool: Pool | null = null;

export function getDb() {
  if (!connectionString) {
    throw new Error('DATABASE_URL не задан — свяжите сервис с Postgres в Railway.');
  }
  pool ??= new Pool({ connectionString });
  return drizzle(pool, { schema });
}

export { schema };
