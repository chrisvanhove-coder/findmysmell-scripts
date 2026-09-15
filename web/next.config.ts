import type { NextConfig } from 'next';

const config: NextConfig = {
  // Next 16 иначе роняет свои AGENTS.md и CLAUDE.md прямо в web/ при каждом
  // запуске dev-сервера. В репозитории они не нужны.
  agentRules: false,
  // Railway запускает контейнер, а не serverless — standalone режет размер образа.
  output: 'standalone',
  images: {
    // Все изображения уже на Cloudinary и на CDN Webflow, они сами умеют
    // ресайз и webp через параметры URL. Свой оптимизатор только жёг бы CPU.
    unoptimized: true,
  },
};

export default config;
