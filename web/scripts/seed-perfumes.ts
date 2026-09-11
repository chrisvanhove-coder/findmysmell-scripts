/**
 * Заливает каталог парфюма из web/src/data/perfumes.json в Postgres.
 * Идемпотентен: повторный запуск обновляет существующие записи по id из CMS,
 * а не плодит дубли. Запускается вручную или как шаг деплоя.
 *
 *   DATABASE_URL=... npx tsx scripts/seed-perfumes.ts
 */
import { sql } from 'drizzle-orm';
import { getDb } from '../src/db';
import { perfumes } from '../src/db/schema';
import catalog from '../src/data/perfumes.json';

interface CatalogItem {
  id: string;
  order: number;
  name: string;
  house: string;
  archetype: string | null;
  description: string;
  imageUrl: string;
  shopUrl: string;
  isMain: boolean;
  sweet: number | null;
  raw: number | null;
  projection: number | null;
  isDraft: boolean;
  isArchived: boolean;
}

async function main() {
  const items = (catalog as CatalogItem[]).filter(
    (p) => !p.isDraft && !p.isArchived && p.archetype,
  );

  if (!items.length) throw new Error('каталог пуст — нечего заливать');

  const db = getDb();

  const rows = items.map((p) => ({
    cmsId: p.id,
    sortOrder: p.order,
    archetype: p.archetype!,
    name: p.name,
    house: p.house,
    description: p.description,
    imageUrl: p.imageUrl,
    shopUrl: p.shopUrl,
    isMain: p.isMain,
    sweet: p.sweet,
    raw: p.raw,
    projection: p.projection,
  }));

  await db
    .insert(perfumes)
    .values(rows)
    .onConflictDoUpdate({
      target: perfumes.cmsId,
      set: {
        sortOrder: sql`excluded.sort_order`,
        archetype: sql`excluded.archetype`,
        name: sql`excluded.name`,
        house: sql`excluded.house`,
        description: sql`excluded.description`,
        imageUrl: sql`excluded.image_url`,
        shopUrl: sql`excluded.shop_url`,
        isMain: sql`excluded.is_main`,
        sweet: sql`excluded.sweet`,
        raw: sql`excluded.raw`,
        projection: sql`excluded.projection`,
        updatedAt: sql`now()`,
      },
    });

  const withAxes = rows.filter((r) => r.sweet !== null && r.raw !== null && r.projection !== null);
  console.log(`залито позиций: ${rows.length} (с полными осями: ${withAxes.length})`);
  process.exit(0);
}

main().catch((e) => {
  console.error('сид не прошёл:', e.message);
  process.exit(1);
});
