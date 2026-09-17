import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

/**
 * robots.txt. В Webflow он генерировался сам, в порте его не было
 * вовсе — то есть после переключения домена поисковик остался бы без
 * карты сайта, а `/admin` был закрыт только заголовком на самой
 * странице.
 *
 * `/admin` и `/api` закрыты явно. Это не защита — защита там пароль и
 * `X-Robots-Tag` из proxy.ts, — а просто чтобы робот туда не ходил.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
