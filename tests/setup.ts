// Test setup file for common test configuration
import { afterEach, expect, mock } from "bun:test";

// Mock environment variables for tests
process.env.NODE_ENV = "test";
process.env.DISCORD_TOKEN = "test-discord-token";
process.env.DISCORD_CLIENT_ID = "test-client-id";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.BRAVE_SEARCH_API_KEY = "test-brave-key";
process.env.DATABASE_URL = "sqlite://tests/fixtures/test.sqlite";

// Create mocks for console methods
const consoleMocks = {
  log: mock(),
  info: mock(),
  warn: mock(),
  error: mock(),
};

// Global test utilities - suppress logs during tests
if (process.env.TEST_LOG_LEVEL !== "verbose") {
  global.console = {
    ...console,
    ...consoleMocks,
  };
}

// Mock fetch globally for API tests
const fetchMock = mock();
global.fetch = fetchMock as any;

// Cleanup after each test
afterEach(() => {
  // Clear all mocks individually
  Object.values(consoleMocks).forEach((mockFn) => (mockFn as any).mockClear());
  (fetchMock as any).mockClear();

  // Reset environment variables if they were modified in tests
  process.env.NODE_ENV = "test";
});

// TypeScript declaration for custom matcher
declare module "bun:test" {
  interface Matchers<T = unknown> {
    toBeValidDiscordMessage(): T;
  }
}

// Extend Jest matchers for better testing
expect.extend({
  toBeValidDiscordMessage(received: any) {
    const pass =
      received &&
      typeof received.content === "string" &&
      received.author &&
      received.channel &&
      received.guild;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Discord message`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Discord message`,
        pass: false,
      };
    }
  },
});
