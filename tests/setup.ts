// Jest setup file for common test configuration

import { jest } from "@jest/globals";

// Mock environment variables for tests
process.env.NODE_ENV = "test";
process.env.DISCORD_TOKEN = "test-discord-token";
process.env.DISCORD_CLIENT_ID = "test-client-id";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.BRAVE_SEARCH_API_KEY = "test-brave-key";
process.env.DATABASE_URL = "sqlite://tests/fixtures/test.sqlite";

// Global test utilities
global.console = {
  ...console,
  // Suppress logs during tests unless explicitly needed
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch globally for API tests
global.fetch = jest.fn();

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  // Reset environment variables if they were modified in tests
  process.env.NODE_ENV = "test";
});

// Extend Jest matchers for better testing
expect.extend({
  toBeValidDiscordMessage(received) {
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

// TypeScript declaration for custom matcher
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDiscordMessage(): R;
    }
  }
}
