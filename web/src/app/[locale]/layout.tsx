import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Fraunces, Inconsolata, Montserrat } from 'next/font/google';
import { notFound } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from '@/lib/i18n';
import { fill, t } from '@/lib/copy';
import { TOTAL_STEPS } from '@/lib/quiz';
import { OG_IMAGE_SIZE, SITE_NAME, TWITTER_SITE, siteUrl } from '@/lib/site';
import { cld } from '@/lib/cloudinary';
import { HOME_HERO } from '@/lib/home';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ConsentGate from '@/components/ConsentGate';
import Grain from '@/components/Grain';
import '@/styles/global.css';
import '@/styles/archetypes.css';

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--fms-fraunces',
  display: 'swap',
});

const inconsolata = Inconsolata({
  subsets: ['latin', 'latin-ext'],
  variable: '--fms-mono',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  // 900 нужен заголовку главной: «THERE IS NO UNIVERSAL SCENT» в проде
  // набран Montserrat Black, и в меньшем весе приём не работает.
  weight: ['400', '600', '900'],
  variable: '--fms-sans',
  display: 'swap',
});

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  const lang: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return {
  /* Абсолютный адрес нужен og-тегам и sitemap: относительная ссылка на
     картинку в карточке превью не разворачивается. */
  metadataBase: new URL(siteUrl()),
  title: 'Find My Smell',
  // Число вопросов держим ОДНО на весь сайт: на живом сайте их три разных
  // (12 в шагах на главной, 7 в метаописании, 17 на самом деле).
  // Подставляется из TOTAL_STEPS, чтобы разойтись было нечем.
  description: fill(t(
    lang,
    'ui.siteDescription',
    'Answer {n} questions about how you feel right now — not notes, not trends. '
    + 'Get a perfume matched to who you are. No emails. No sign-ups. '
    + 'No boring perfume pyramids.',
  ), { n: TOTAL_STEPS }),
  /* Ссылка-превью. В проде эти теги есть (девять штук в home.head.html),
     в порте не было ни одного: ссылка приезжала голой строкой. Здесь
     основа на весь сайт — её получают экраны квиза и юридические
     страницы; главная и результат собирают свои через previewTags. */
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    images: [{ ...OG_IMAGE_SIZE, url: cld(HOME_HERO, 'og') }],
  },
  twitter: {
    card: 'summary_large_image',
    site: TWITTER_SITE,
    images: [cld(HOME_HERO, 'og')],
  },
  };
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} className={`${fraunces.variable} ${inconsolata.variable} ${montserrat.variable}`}>
      <body>
        <SiteHeader locale={locale} />
        {/* Зерно поверх всей страницы — в проде оно лежало копиями
            на семи страницах. */}
        <Grain />
        {children}
        <SiteFooter locale={locale} />
        <ConsentGate locale={locale} />
      </body>
    </html>
  );
}
