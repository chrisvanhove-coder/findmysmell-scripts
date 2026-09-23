import { notFound } from 'next/navigation';
import { isLocale, LOCALES } from '@/lib/i18n';
import { QUESTIONS, questionBySlug } from '@/lib/quiz';
import { QUESTION_COPY } from '@/data/question-titles';
import { t } from '@/lib/copy';
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

  const copy = QUESTION_COPY[question.id];

  return (
    <QuizScreen
      locale={locale}
      question={question}
      /* Заголовок и уточнение — по локали. Английский лежит в
         question-titles.ts и остаётся запасным вариантом, если
         перевода для этого вопроса ещё нет (см. lib/copy.ts). */
      title={t(locale, `q.${question.id}.title`, copy?.title ?? question.id)}
      subtitle={
        copy?.subtitle === undefined
          ? undefined
          : t(locale, `q.${question.id}.subtitle`, copy.subtitle)
      }
    />
  );
}
