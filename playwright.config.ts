import { defineConfig } from '@playwright/test'

const useRealAi = process.env.USE_REAL_AI === '1'

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'api',
      testMatch: 'tests/api/**/*.spec.ts',
    },
  ],
  webServer: [
    ...(useRealAi
      ? []
      : [
          {
            command: 'node tests/helpers/mock-ai-server.mjs',
            port: 4010,
            reuseExistingServer: true,
            timeout: 10_000,
          },
        ]),
    {
      command: 'dotenv -e .env -- pnpm --filter api dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 30_000,
      env: useRealAi
        ? {}
        : {
            GROQ_BASE_URL: 'http://localhost:4010',
            OPENROUTER_BASE_URL: 'http://localhost:4010',
          },
    },
  ],
})
