// Runner for QA QualiGate tests — meets test-execution-agent's "Playwright config contract".
// Copy runner-template/ to ./qa-artifacts/, then `npm install && npx playwright install chromium`.
import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const RUN_ID = process.env.RUN_ID ?? 'latest';
const features = 'test-cases/**/*.feature';
const steps = ['test-cases/**/*.steps.ts', 'steps/*.ts'];

export default defineConfig({
  timeout: 60_000,
  retries: 0, // test-execution-agent retries network failures itself, once; never assertion failures
  reporter: [
    ['list'],
    ['json', { outputFile: `runs/${RUN_ID}/results.json` }],
    ['html', { open: 'never', outputFolder: `runs/${RUN_ID}/html` }],
    ...(process.env.CI ? ([['junit', { outputFile: `runs/${RUN_ID}/junit.xml` }]] as const) : []),
  ],
  outputDir: `runs/${RUN_ID}/artifacts`,
  snapshotPathTemplate: 'visual-baselines/{testFilePath}/{arg}-{projectName}{ext}',
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    navigationTimeout: 30_000,
    actionTimeout: 10_000,
    // storageState: '.auth/user.json', // saved login; never commit .auth/
  },
  projects: [
    {
      name: 'e2e',
      testDir: defineBddConfig({ outputDir: '.features-gen/e2e', features, steps, tags: 'not @api' }),
      use: { baseURL: process.env.BASE_URL },
    },
    {
      name: 'api',
      testDir: defineBddConfig({ outputDir: '.features-gen/api', features, steps, tags: '@api' }),
      use: { baseURL: process.env.API_BASE_URL },
    },
  ],
});
