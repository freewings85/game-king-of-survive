// Playwright E2E test configuration for King of Survive
const { defineConfig } = require('@playwright/test') || {};

module.exports = {
  testDir: './tests',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'cd .. && mvn -f server/pom.xml spring-boot:run',
    url: 'http://localhost:8080',
    timeout: 120000,
    reuseExistingServer: true,
  },
};
