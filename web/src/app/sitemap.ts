import type { MetadataRoute } from 'next';
import { LOCALES } from '@/lib/i18n';
import { ARCHETYPE_KEYS } from '@/lib/archetype-colors';
import { FIRST_QUESTION, toSlug } from '@/lib/quiz';
import { siteUrl } from '@/lib/site';

/**
 * sitemap.xml. В Webflow он генерировался сам; в порте его не было.
 *
 * ЧТО ВНУТРИ И ПОЧЕМУ ИМЕННО ЭТО:
 *
 *   главная            — то, что нужно искать;
 *   первый экран квиза — единственная страница квиза, на которую есть
 *                        смысл приходить из поиска;
 *   семь результатов   — ими делятся, и по ним приходят;
 *   политика и юр. страницы — обязательны к наличию, и их спрашивают.
 *
 * Чего внутри НЕТ: остальных 23 экранов квиза. Это шаги прохождения, а
 * не страницы, на которые приходят: человек, попавший из поиска на
 * «а чем для тебя пахнет спокойствие?», не понимает, где он и что это.
 * В Webflow они в карту попадали, и это была не польза, а шум.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const out: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    out.push({
      url: `${base}/${locale}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
    });
    out.push({
      url: `${base}/${locale}/quiz/${toSlug(FIRST_QUESTION.id)}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    });
    /* Страниц результата в карте сайта НЕТ. Они закрыты пропуском
       (components/ResultGate.tsx): без пройденного квиза там пусто.
       Звать на них поисковик — звать людей в пустую комнату. */
    out.push({
      url: `${base}/${locale}/privacy-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    });
    out.push({
      url: `${base}/${locale}/legal-notice`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    });
  }

  return out;
}
