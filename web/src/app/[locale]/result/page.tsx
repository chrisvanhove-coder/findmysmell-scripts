import { notFound } from 'next/navigation';
import { isLocale, LOCALES } from '@/lib/i18n';
import ResultRedirect from './ResultRedirect';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function ResultEntry({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ResultRedirect locale={locale} />;
}
