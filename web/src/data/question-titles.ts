/**
 * Тексты вопросов. Выгружены из Webflow через MCP 2026-09-11.
 *
 * В оригинале регистр букв был рваный — «How dO you Prefer Your sCent…» —
 * это приём под шрифт HIGHCRUISER. Шрифта у нас нет, и без него такой набор
 * читается как опечатки, поэтому текст приведён к обычному виду.
 * Смысл и формулировки не менялись.
 *
 * subtitle — уточнение под вопросом, если оно есть на странице.
 */

export interface QuestionTitle {
  title: string;
  subtitle?: string;
}

export const QUESTION_COPY: Record<string, QuestionTitle> = {
  Q_GENDER: { title: 'How do you prefer your scent to feel on you?' },
  Q_REGION_NOW: { title: 'Where do you live now?' },
  Q_GENERATION: { title: 'Which generation do you belong to?' },
  Q_DAYTDAY: { title: 'How do you live day to day?' },
  Q_STAYWELL: { title: 'What makes a space feel like yours?' },
  Q_ATMOS: { title: 'Which atmosphere feels most natural and comfortable for you?' },
  Q_YOURSELF: { title: 'Where do you feel most yourself?' },
  Q_EMO: { title: 'How do you want this perfume to make you feel?' },

  Q_CALM: { title: 'What does calm smell like to you?' },
  Q_ENERGY: { title: 'What does energy smell like to you?' },
  Q_COZY: { title: 'What does cozy smell like to you?' },
  Q_MYST: { title: 'What does mystery smell like to you?' },
  Q_SEXY: { title: 'What does sexy smell like to you?' },
  Q_FOCUS: { title: 'What helps you concentrate?' },
  Q_PLAY: { title: 'What does playful smell like to you?' },

  Q_ENV_CHILD: { title: 'What general environment did you grow up in?' },
  Q_REGION_CHILD: { title: 'Where did you grow up?' },
  Q_CELEBRATE: {
    title: "What's the first thing you smell when you think of celebration as a child?",
    subtitle: '(Choose the one that feels most true)',
  },
  Q_CALM_NOW: {
    title: 'Is there a smell that instantly calms you even now?',
    subtitle: '(Choose the closest one)',
  },

  Q_SWEET: { title: 'How do you feel about sweetness in a perfume on your skin?' },
  Q_WILD: {
    title: 'How do you feel about perfumes that have a more raw or natural edge?',
    subtitle: '(for example: smoke, leather, earth, not polished smells)',
  },
  Q_SKIN_BEHAVIOR: { title: 'How does perfume behave on your skin?' },
  Q_RADIUS: { title: 'Do you prefer your scent to stay close to the skin or project around you?' },

  Q_OPEN: { title: 'Anything else you want to tell us about your most memorable scent?' },
};

export const QUESTION_TITLES: Record<string, string> = Object.fromEntries(
  Object.entries(QUESTION_COPY).map(([id, c]) => [id, c.title]),
);
