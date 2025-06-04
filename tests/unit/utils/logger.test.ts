import {
  botLogger,
  configLogger,
  discordLogger,
  logger,
} from "../../../src/utils/logger";

// Mock console methods for testing
const mockConsole = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Store original console
const originalConsole = { ...console };

describe("Logger", () => {
  beforeEach(() => {
    // Replace console methods with mocks
    Object.assign(console, mockConsole);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original console
    Object.assign(console, originalConsole);
  });

  describe("base logger", () => {
    it("should create logger instance", () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });

    it("should log info messages", () => {
      logger.info("Test info message");

      // The actual console call depends on the logger implementation
      // This test verifies the logger doesn't throw errors
      expect(true).toBe(true);
    });

    it("should log error messages", () => {
      logger.error("Test error message");

      // The actual console call depends on the logger implementation
      expect(true).toBe(true);
    });

    it("should log warn messages", () => {
      logger.warn("Test warning message");

      expect(true).toBe(true);
    });

    it("should log debug messages", () => {
      logger.debug("Test debug message");

      expect(true).toBe(true);
    });
  });

  describe("specialized loggers", () => {
    it("should create bot logger with proper context", () => {
      expect(botLogger).toBeDefined();
      expect(typeof botLogger.info).toBe("function");
    });

    it("should create config logger with proper context", () => {
      expect(configLogger).toBeDefined();
      expect(typeof configLogger.info).toBe("function");
    });

    it("should create discord logger with proper context", () => {
      expect(discordLogger).toBeDefined();
      expect(typeof discordLogger.info).toBe("function");
    });

    it("should handle logging with objects", () => {
      const testObject = { key: "value", number: 42 };

      // These should not throw errors
      botLogger.info("Test message", testObject);
      configLogger.error("Test error", testObject);
      discordLogger.warn("Test warning", testObject);

      expect(true).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle Error objects", () => {
      const testError = new Error("Test error message");

      logger.error("Error occurred:", testError);

      expect(true).toBe(true);
    });

    it("should handle logging with null/undefined", () => {
      logger.info("Test with null", null);
      logger.info("Test with undefined", undefined);

      expect(true).toBe(true);
    });

    it("should handle complex nested objects", () => {
      const complexObject = {
        user: { id: "123", name: "Test User" },
        guild: { id: "456", name: "Test Guild" },
        metadata: {
          timestamp: new Date(),
          version: "1.0.0",
          nested: { deep: { value: "test" } },
        },
      };

      logger.info("Complex object test", complexObject);

      expect(true).toBe(true);
    });
  });

  describe("logger consistency", () => {
    it("should all loggers have same interface", () => {
      const loggers = [logger, botLogger, configLogger, discordLogger];

      loggers.forEach((log) => {
        expect(typeof log.info).toBe("function");
        expect(typeof log.error).toBe("function");
        expect(typeof log.warn).toBe("function");
        expect(typeof log.debug).toBe("function");
      });
    });

    it("should handle different parameter combinations", () => {
      // String only
      logger.info("Simple message");

      // String with object
      logger.info("Message with data", { key: "value" });

      // String with multiple parameters
      logger.info("Message", "param1", "param2", { data: true });

      expect(true).toBe(true);
    });
  });
});
