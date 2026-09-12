import next from 'eslint-config-next';

/**
 * Конфига линтера в проекте не было вовсе: скрипт `npm run lint` падал на
 * «couldn't find eslint.config», а сам eslint даже не стоял в зависимостях —
 * подхватывался глобальный, если он был в системе. То есть по коду линтер
 * ни разу не проходил, хотя в компонентах уже стояли eslint-disable
 * на правила Next.
 */
const config = [
  ...next,
  {
    ignores: [
      '.next/**',
      'drizzle/**',
      'node_modules/**',
      // Сгенерированные данные — правит их генератор, не человек.
      'src/data/**',
    ],
  },
];

export default config;
