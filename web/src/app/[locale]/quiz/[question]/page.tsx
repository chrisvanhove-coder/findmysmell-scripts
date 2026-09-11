import { notFound } from 'next/navigation';
import { isLocale, LOCALES } from '@/lib/i18n';
import { QUESTIONS, questionBySlug } from '@/lib/quiz';
import { QUESTION_COPY } from '@/data/question-titles';
import QuizScreen from './QuizScreen';

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    Object.values(QUESTIONS).map((q) => ({ locale, question: q.slug })),
  );
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ locale: string; question: string }>;
}) {
  const { locale, question: slug } = await params;
  if (!isLocale(locale)) notFound();

  const question = questionBySlug(slug);
  if (!question) notFound();

  return (
    <QuizScreen
      locale={locale}
      question={question}
      title={QUESTION_COPY[question.id]?.title ?? question.id}
      subtitle={QUESTION_COPY[question.id]?.subtitle}
    />
  );
}
