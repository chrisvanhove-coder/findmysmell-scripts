import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Fraunces, Inconsolata, Montserrat } from 'next/font/google';
import { notFound } from 'next/navigation';
import { LOCALES, isLocale } from '@/lib/i18n';
import { TOTAL_STEPS } from '@/lib/quiz';
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

export const metadata: Metadata = {
  title: 'Find My Smell',
  // Число вопросов держим ОДНО на весь сайт: на живом сайте их три разных
  // (12 в шагах на главной, 7 в метаописании, 17 на самом деле).
  // Подставляется из TOTAL_STEPS, чтобы разойтись было нечем.
  description:
    `Answer ${TOTAL_STEPS} questions about how you feel right now — not notes, not trends. `
    + 'Get a perfume matched to who you are. No emails. No sign-ups. '
    + 'No boring perfume pyramids.',
};

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
