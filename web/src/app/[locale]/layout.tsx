import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Fraunces, Inconsolata, Montserrat } from 'next/font/google';
import { notFound } from 'next/navigation';
import { LOCALES, isLocale } from '@/lib/i18n';
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
  weight: ['400', '600'],
  variable: '--fms-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Find My Smell',
  description:
    'Answer the quiz and get a personalised perfume match. No emails. No sign-ups. No boring perfume pyramids.',
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
      <body>{children}</body>
    </html>
  );
}
