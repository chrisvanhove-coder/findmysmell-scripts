/**
 * Тексты вопросов, выгружены из Webflow через MCP 2026-09-11.
 *
 * Регистр букв сохранён как в оригинале: «How dO you Prefer Your sCent…» —
 * это не опечатки, а приём бренда, рассчитанный на шрифт HIGHCRUISER.
 * Не «исправлять» без отдельного решения.
 *
 * subtitle — уточнение под вопросом, если оно есть на странице.
 */

export interface QuestionTitle {
  title: string;
  subtitle?: string;
}

export const QUESTION_COPY: Record<string, QuestionTitle> = {
  Q_GENDER: { title: 'How dO you Prefer Your sCent To fEel oN you?' },
  Q_REGION_NOW: { title: 'where do you live now?' },
  Q_GENERATION: { title: 'WhicH gEneraTion dO you BeloNg to?' },
  Q_DAYTDAY: { title: 'How do yOu live day to day?' },
  Q_STAYWELL: { title: 'What mAkes a Space Feel lIkE yoUrs?' },
  Q_ATMOS: { title: 'Which atmosphere feels Most natural and comfortable for you?' },
  Q_YOURSELF: { title: 'where do you feeL Most yourself?' },
  Q_EMO: { title: 'How do You Want This pErfume tO Make yOu Feel?' },

  Q_CALM: { title: 'What does Calm smell like to you?' },
  Q_ENERGY: { title: 'What does energy smell like to you?' },
  Q_COZY: { title: 'wHat does cozy smell like to you?' },
  Q_MYST: { title: 'What does mystery smell like to you?' },
  Q_SEXY: { title: 'what does sexy sMell like to you?' },
  Q_FOCUS: { title: 'What helps you concentrate?' },
  Q_PLAY: { title: 'What does playful smell Like to you?' },

  Q_ENV_CHILD: { title: 'What geneRal eNvironment Did yoU grOw uP in?' },
  Q_REGION_CHILD: { title: 'Where did you grow up?' },
  Q_CELEBRATE: {
    title: "What's the first thing you smell when you think of celebration as a child?",
    subtitle: '(Choose the one that feels most true)',
  },
  Q_CALM_NOW: {
    title: 'Is there a smell that instantly calms you even now?',
    subtitle: '(Choose the closest one)',
  },

  Q_SWEET: { title: 'How do yOu feeL aboUt sweEtness in a perfume On yoUr skiN?' },
  Q_WILD: {
    title: 'How do you feeL aboUt perfuMes thAt havE a moRe raw or nAtural edGe?',
    subtitle: '(for example: smoke, leather, earth, not polished smells)',
  },
  Q_SKIN_BEHAVIOR: { title: 'how does perfume behave on your skin?' },
  Q_RADIUS: { title: 'Do you prefer your scent to stay close to the skin or project around you?' },

  // TODO: выгрузка Q_OPEN упёрлась в лимит запросов Webflow (429).
  // Текст ниже — заглушка, заменить на оригинал со страницы /q-open.
  Q_OPEN: { title: 'Anything else you want to tell us?' },
};

export const QUESTION_TITLES: Record<string, string> = Object.fromEntries(
  Object.entries(QUESTION_COPY).map(([id, c]) => [id, c.title]),
);
