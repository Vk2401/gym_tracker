import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const localChromium = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'iphone',
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
        launchOptions: existsSync(localChromium) ? { executablePath: localChromium } : {},
      },
    },
  ],
  webServer: {
    command: 'VITE_E2E=true npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
