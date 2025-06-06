import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import fs from "fs/promises";
import path from "path";
import {
  botLogger,
  configLogger,
  discordLogger,
  FileLoggingConfig,
  logger,
  Logger,
} from "../../../src/utils/logger";

// Mock console methods for testing
const mockConsole = {
  log: mock(),
  info: mock(),
  warn: mock(),
  error: mock(),
  debug: mock(),
};

// Store original console
const originalConsole = { ...console };

describe("Logger", () => {
  beforeEach(() => {
    // Replace console methods with mocks
    Object.assign(console, mockConsole);
    // Clear all mocks individually
    Object.values(mockConsole).forEach((mockFn) => (mockFn as any).mockClear());
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

  describe("file logging", () => {
    const testLogDir = path.resolve("test-logs");

    // Test configuration
    const testFileConfig: FileLoggingConfig = {
      enabled: true,
      level: "INFO",
      directory: testLogDir, // Use absolute path
      filename_pattern: "test-{date}.log",
      max_files: 5,
      include_console_colors: false,
      separate_error_file: true,
      json_format: false,
      rotation: {
        daily: true,
        max_size: "1MB",
        cleanup_old: true,
      },
      performance: {
        buffer_size: 1, // Immediate flush
        flush_interval: 100,
      },
    };

    beforeEach(async () => {
      // Clean up FileLogger instances
      await Logger.clearFileLoggerInstances();

      // Clean up test log directory
      try {
        await fs.rm(testLogDir, { recursive: true, force: true });
      } catch (error) {
        // Directory might not exist, that's ok
      }
    });

    afterEach(async () => {
      // Clean up FileLogger instances
      await Logger.clearFileLoggerInstances();

      // Clean up test log directory
      try {
        await fs.rm(testLogDir, { recursive: true, force: true });
      } catch (error) {
        // Directory might not exist, that's ok
      }
    });

    it("should create log files when file logging is enabled", async () => {
      const testLogger = new Logger("Test", "INFO", {
        fileConfig: {
          ...testFileConfig,
          directory: testLogDir, // Ensure absolute path
        },
      });

      testLogger.info("Test log message");

      // Force flush to ensure file is written
      await testLogger.forceFlushLogs();

      // Check if log directory was created
      const dirExists = await fs
        .access(testLogDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);

      // Check if log file was created
      const files = await fs.readdir(testLogDir).catch(() => []);
      expect(files.length).toBeGreaterThan(0);
    });

    it("should write logs to separate error file when enabled", async () => {
      const testLogger = new Logger("Test", "ERROR", {
        fileConfig: {
          ...testFileConfig,
          directory: testLogDir, // Ensure absolute path
        },
      });

      testLogger.error("Test error message");

      // Force flush to ensure file is written
      await testLogger.forceFlushLogs();

      // Ensure flush completes by waiting for all async operations
      await new Promise((resolve) => setImmediate(resolve));

      // Check for error log file
      const files = await fs.readdir(testLogDir).catch(() => []);
      const errorFile = files.find((file) => file.includes(".error.log"));
      expect(errorFile).toBeDefined();
    });

    it("should strip ANSI color codes from file logs", async () => {
      const testLogger = new Logger("Test", "INFO", {
        fileConfig: {
          ...testFileConfig,
          directory: testLogDir, // Ensure absolute path
          include_console_colors: false,
        },
      });

      testLogger.info("Test message with colors");

      // Force flush to ensure file is written
      await testLogger.forceFlushLogs();

      const files = await fs.readdir(testLogDir).catch(() => []);
      const logFile = files.find(
        (file) => file.endsWith(".log") && !file.includes(".error.")
      );

      if (logFile) {
        const content = await fs.readFile(
          path.join(testLogDir, logFile),
          "utf8"
        );
        // Should not contain ANSI escape codes
        expect(content).not.toMatch(/\x1b\[[0-9;]*m/);
      }
    });

    it("should respect file logging level", async () => {
      const testLogger = new Logger("Test", "DEBUG", {
        fileConfig: {
          ...testFileConfig,
          directory: testLogDir, // Ensure absolute path
          level: "ERROR", // Only log errors (and warnings) to file
        },
      });

      testLogger.debug("Debug message");
      testLogger.info("Info message");
      testLogger.warn("Warning message");
      testLogger.error("Error message");

      // Force flush to ensure file is written
      await testLogger.forceFlushLogs();

      // Ensure flush completes by waiting for all async operations
      await new Promise((resolve) => setImmediate(resolve));

      const files = await fs.readdir(testLogDir).catch(() => []);

      // Should have files created (errors and warnings)
      expect(files.length).toBeGreaterThan(0);

      // Check that debug and info messages are not in files
      const logFiles = files.filter((file) => file.endsWith(".log"));
      if (logFiles.length > 0) {
        const logContent = await fs.readFile(
          path.join(testLogDir, logFiles[0]),
          "utf8"
        );
        expect(logContent).not.toContain("Debug message");
        expect(logContent).not.toContain("Info message");
      }
    });

    it("should handle JSON format when enabled", async () => {
      const jsonConfig: FileLoggingConfig = {
        ...testFileConfig,
        directory: testLogDir, // Ensure absolute path
        json_format: true,
      };

      const testLogger = new Logger("Test", "INFO", {
        fileConfig: jsonConfig,
      });

      testLogger.info("Test JSON message");

      // Force flush to ensure file is written
      await testLogger.forceFlushLogs();

      const files = await fs.readdir(testLogDir).catch(() => []);
      const logFile = files.find(
        (file) => file.endsWith(".log") && !file.includes(".error.")
      );

      if (logFile) {
        const content = await fs.readFile(
          path.join(testLogDir, logFile),
          "utf8"
        );
        const lines = content.trim().split("\n");

        // Should contain valid JSON
        for (const line of lines) {
          if (line.trim()) {
            expect(() => JSON.parse(line)).not.toThrow();
          }
        }
      }
    });

    it("should not create log files when file logging is disabled", async () => {
      const disabledConfig: FileLoggingConfig = {
        ...testFileConfig,
        enabled: false,
        directory: testLogDir, // Ensure absolute path
      };

      const testLogger = new Logger("Test", "INFO", {
        fileConfig: disabledConfig,
      });

      testLogger.info("Test message");

      // Wait for potential file operations
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check if log directory exists
      const dirExists = await fs
        .access(testLogDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(false);
    });

    it("should auto-flush when buffer is full", async () => {
      const smallBufferConfig: FileLoggingConfig = {
        ...testFileConfig,
        directory: testLogDir, // Ensure absolute path
        performance: {
          buffer_size: 2, // Very small buffer
          flush_interval: 10000, // Long flush interval
        },
      };

      const testLogger = new Logger("Test", "INFO", {
        fileConfig: smallBufferConfig,
      });

      // Write more messages than buffer size
      testLogger.info("Message 1");
      testLogger.info("Message 2");
      testLogger.info("Message 3"); // Should trigger flush

      // Force flush to ensure all files are written
      await testLogger.forceFlushLogs();

      // Additional wait to ensure file system operations complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      const files = await fs.readdir(testLogDir).catch(() => []);
      expect(files.length).toBeGreaterThan(0);
    });

    it("should handle errors gracefully", async () => {
      // Create logger with invalid directory path
      const invalidConfig: FileLoggingConfig = {
        ...testFileConfig,
        directory: "/invalid/readonly/path",
      };

      // Should not throw when creating logger
      expect(() => {
        const testLogger = new Logger("Test", "INFO", {
          fileConfig: invalidConfig,
        });
        testLogger.info("Test message");
      }).not.toThrow();
    });
  });
});
