// Logging utility for Gemiscord

import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import yaml from "yaml";
import { ILogger } from "../interfaces/services.js";
import { LogLevel } from "../types/index.js";

// ANSI color codes for terminal output
const COLORS = {
  RESET: "\x1b[0m",
  BRIGHT: "\x1b[1m",
  DIM: "\x1b[2m",

  // Foreground colors
  BLACK: "\x1b[30m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  WHITE: "\x1b[37m",
  GRAY: "\x1b[90m",

  // Background colors
  BG_RED: "\x1b[41m",
  BG_GREEN: "\x1b[42m",
  BG_YELLOW: "\x1b[43m",
  BG_BLUE: "\x1b[44m",
} as const;

// Log level configuration
const LOG_LEVELS: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Log level colors
const LEVEL_COLORS: Record<LogLevel, string> = {
  ERROR: COLORS.RED,
  WARN: COLORS.YELLOW,
  INFO: COLORS.CYAN,
  DEBUG: COLORS.GRAY,
};

// File logging configuration interface
export interface FileLoggingConfig {
  enabled: boolean;
  level: LogLevel;
  directory: string;
  filename_pattern: string;
  max_files: number;
  include_console_colors: boolean;
  separate_error_file: boolean;
  json_format: boolean;
  rotation: {
    daily: boolean;
    max_size: string;
    cleanup_old: boolean;
  };
  performance: {
    buffer_size: number;
    flush_interval: number;
  };
}

// File logging utilities
class FileLogger {
  private static instances = new Map<string, FileLogger>();
  private writeBuffer: string[] = [];
  private errorBuffer: string[] = [];
  private flushTimer?: NodeJS.Timeout;
  private flushPromise?: Promise<void>;

  private constructor(
    private config: FileLoggingConfig,
    private logDirectory: string
  ) {
    this.ensureLogDirectorySync();
    this.setupPeriodicFlush();
  }

  static getInstance(
    config: FileLoggingConfig,
    logDirectory: string
  ): FileLogger {
    // Include config in key to ensure different configurations get separate instances
    const configHash = JSON.stringify({
      enabled: config.enabled,
      level: config.level,
      separate_error_file: config.separate_error_file,
      json_format: config.json_format,
      include_console_colors: config.include_console_colors,
    });
    const key = `${logDirectory}:${config.filename_pattern}:${configHash}`;

    if (!this.instances.has(key)) {
      this.instances.set(key, new FileLogger(config, logDirectory));
    }
    return this.instances.get(key)!;
  }

  static getAllInstances(): FileLogger[] {
    return Array.from(this.instances.values());
  }

  // For testing - clear all instances
  static async clearAllInstances(): Promise<void> {
    const promises = Array.from(this.instances.values()).map((instance) =>
      instance.destroy()
    );
    await Promise.all(promises);
    this.instances.clear();
  }

  private ensureLogDirectorySync(): void {
    try {
      fsSync.mkdirSync(this.logDirectory, { recursive: true });
    } catch (error) {
      console.error(
        `Failed to create log directory: ${this.logDirectory}`,
        error
      );
    }
  }

  private setupPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.performance.flush_interval);
  }

  private stripAnsiCodes(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, "");
  }

  private formatForFile(message: string): string {
    const cleanMessage = this.config.include_console_colors
      ? message
      : this.stripAnsiCodes(message);

    if (this.config.json_format) {
      const timestamp = new Date().toISOString();
      const logMatch = cleanMessage.match(/\[(.*?)\] \[(\w+)\] \[(.*?)\] (.+)/);
      if (logMatch && logMatch.length >= 5) {
        const [, , level, component, text] = logMatch;
        return (
          JSON.stringify({
            timestamp,
            level,
            component,
            message: (text || "").trim(),
          }) + "\n"
        );
      }
    }

    return cleanMessage + "\n";
  }

  private generateFilename(isError = false): string {
    const date =
      new Date().toISOString().split("T")[0] ||
      new Date().toISOString().substring(0, 10); // YYYY-MM-DD
    const baseFilename = this.config.filename_pattern.replace("{date}", date);

    if (isError && this.config.separate_error_file) {
      const ext = path.extname(baseFilename) || ".log";
      const name = path.basename(baseFilename, ext);
      return `${name}.error${ext}`;
    }

    return baseFilename;
  }

  async writeLog(message: string, isError = false): Promise<void> {
    if (!this.config.enabled) return;

    const formattedMessage = this.formatForFile(message);

    if (isError && this.config.separate_error_file) {
      this.errorBuffer.push(formattedMessage);
    } else {
      this.writeBuffer.push(formattedMessage);
    }

    // Auto-flush if buffer is getting full
    if (
      this.writeBuffer.length + this.errorBuffer.length >=
      this.config.performance.buffer_size
    ) {
      await this.flush();
    }
  }

  // Immediate flush for testing purposes
  async forceFlush(): Promise<void> {
    await this.flush();
  }

  async flush(): Promise<void> {
    // If a flush is already in progress, wait for it
    if (this.flushPromise) {
      await this.flushPromise;
    }

    if (this.writeBuffer.length === 0 && this.errorBuffer.length === 0) {
      return;
    }

    // Start new flush operation
    this.flushPromise = this._doFlush();
    await this.flushPromise;
    this.flushPromise = undefined;
  }

  private async _doFlush(): Promise<void> {
    try {
      // Write main log file
      if (this.writeBuffer.length > 0) {
        const filename = this.generateFilename(false);
        const filepath = path.join(this.logDirectory, filename);
        const content = this.writeBuffer.join("");
        this.writeBuffer = [];

        await fs.appendFile(filepath, content, "utf8");
      }

      // Write error log file (if separate file is enabled and we have error logs)
      if (this.errorBuffer.length > 0) {
        if (this.config.separate_error_file) {
          const filename = this.generateFilename(true);
          const filepath = path.join(this.logDirectory, filename);
          const content = this.errorBuffer.join("");
          this.errorBuffer = [];

          await fs.appendFile(filepath, content, "utf8");
        } else {
          // If separate error file is disabled, write errors to main log
          const filename = this.generateFilename(false);
          const filepath = path.join(this.logDirectory, filename);
          const content = this.errorBuffer.join("");
          this.errorBuffer = [];

          await fs.appendFile(filepath, content, "utf8");
        }
      }

      // Cleanup old files if enabled
      if (this.config.rotation.cleanup_old) {
        await this.cleanupOldFiles();
      }
    } catch (error) {
      console.error("Failed to write log file:", error);
    }
  }

  private async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDirectory);
      const logFiles = files
        .filter(
          (file) => file.startsWith("gemiscord-") && file.endsWith(".log")
        )
        .map((file) => ({
          name: file,
          path: path.join(this.logDirectory, file),
        }));

      if (logFiles.length > this.config.max_files) {
        // Sort by filename (which includes date) and keep only the newest files
        const sortedFiles = logFiles.sort((a, b) =>
          b.name.localeCompare(a.name)
        );
        const filesToDelete = sortedFiles.slice(this.config.max_files);

        for (const file of filesToDelete) {
          await fs.unlink(file.path);
        }
      }
    } catch (error) {
      console.error("Failed to cleanup old log files:", error);
    }
  }

  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }
}

// Logger implementation
export class Logger implements ILogger {
  private level: LogLevel;
  private readonly prefix: string;
  private readonly enableColors: boolean;
  private readonly enableTimestamp: boolean;
  private fileLogger?: FileLogger;
  private fileLevel: LogLevel;

  constructor(
    prefix: string = "Gemiscord",
    level: LogLevel = "INFO",
    options: {
      enableColors?: boolean;
      enableTimestamp?: boolean;
      fileConfig?: FileLoggingConfig;
    } = {}
  ) {
    this.prefix = prefix;
    this.level = level;
    this.enableColors = options.enableColors ?? process.stdout.isTTY;
    this.enableTimestamp = options.enableTimestamp ?? true;
    this.fileLevel = options.fileConfig?.level || "INFO";

    // Initialize file logging if configuration is provided
    if (options.fileConfig?.enabled) {
      this.initializeFileLogging(options.fileConfig);
    }
  }

  private initializeFileLogging(config: FileLoggingConfig): void {
    try {
      const logDirectory = path.resolve(config.directory);
      this.fileLogger = FileLogger.getInstance(config, logDirectory);
    } catch (error) {
      console.error("Failed to initialize file logging:", error);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  private shouldLogToFile(level: LogLevel): boolean {
    return !!(
      this.fileLogger && LOG_LEVELS[level] <= LOG_LEVELS[this.fileLevel]
    );
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatPrefix(level: LogLevel): string {
    const timestamp = this.enableTimestamp
      ? `[${this.formatTimestamp()}] `
      : "";
    const levelStr = `[${level}]`;
    const prefixStr = `[${this.prefix}]`;

    if (this.enableColors) {
      const color = LEVEL_COLORS[level];
      return `${COLORS.DIM}${timestamp}${COLORS.RESET}${color}${levelStr}${COLORS.RESET} ${COLORS.BRIGHT}${prefixStr}${COLORS.RESET}`;
    }

    return `${timestamp}${levelStr} ${prefixStr}`;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    args: unknown[]
  ): string {
    const prefix = this.formatPrefix(level);
    const formattedArgs = args.map((arg) => {
      if (typeof arg === "object") {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    });

    const fullMessage =
      formattedArgs.length > 0
        ? `${message} ${formattedArgs.join(" ")}`
        : message;

    return `${prefix} ${fullMessage}`;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      const errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 5).join("\n"), // Limit stack trace
        ...("details" in error && typeof error.details === "object"
          ? error.details
          : {}),
      };
      return "\n" + JSON.stringify(errorInfo, null, 2);
    }
    return String(error);
  }

  debug(message: string, ...args: unknown[]): void {
    const formattedMessage = this.formatMessage("DEBUG", message, args);

    if (this.shouldLog("DEBUG")) {
      console.log(formattedMessage);
    }

    if (this.shouldLogToFile("DEBUG")) {
      this.fileLogger?.writeLog(formattedMessage, false);
    }
  }

  info(message: string, ...args: unknown[]): void {
    const formattedMessage = this.formatMessage("INFO", message, args);

    if (this.shouldLog("INFO")) {
      console.log(formattedMessage);
    }

    if (this.shouldLogToFile("INFO")) {
      this.fileLogger?.writeLog(formattedMessage, false);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    const formattedMessage = this.formatMessage("WARN", message, args);

    if (this.shouldLog("WARN")) {
      console.warn(formattedMessage);
    }

    if (this.shouldLogToFile("WARN")) {
      this.fileLogger?.writeLog(formattedMessage, false);
    }
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    const errorMessage = error
      ? this.formatMessage("ERROR", message, args) + this.formatError(error)
      : this.formatMessage("ERROR", message, args);

    if (this.shouldLog("ERROR")) {
      console.error(errorMessage);
    }

    if (this.shouldLogToFile("ERROR")) {
      this.fileLogger?.writeLog(errorMessage, true);
    }
  }

  // For testing: force flush file logs
  async forceFlushLogs(): Promise<void> {
    if (this.fileLogger) {
      await this.fileLogger.forceFlush();
    }
  }

  // For testing: clear all FileLogger instances
  static async clearFileLoggerInstances(): Promise<void> {
    await FileLogger.clearAllInstances();
  }
}

// Configuration loader for file logging (synchronous for reliability)
function loadFileLoggingConfig(): FileLoggingConfig | undefined {
  try {
    const configPath = path.resolve("config/bot-config.yaml");
    const configContent = fsSync.readFileSync(configPath, "utf8");
    const config = yaml.parse(configContent);

    if (config?.logging?.file) {
      return {
        enabled: config.logging.file.enabled,
        level: config.logging.file.level,
        directory: config.logging.file.directory,
        filename_pattern: config.logging.file.filename_pattern,
        max_files: config.logging.file.max_files,
        include_console_colors: config.logging.file.include_console_colors,
        separate_error_file: config.logging.file.separate_error_file,
        json_format: config.logging.file.json_format,
        rotation: config.logging.rotation,
        performance: config.logging.performance,
      };
    }
  } catch (error) {
    // Silently fail if config is not available - file logging will be disabled
    return undefined;
  }
  return undefined;
}

// Global file logging configuration - loaded once at startup
const globalFileConfig = loadFileLoggingConfig();

// Default logger instance
export const logger = new Logger(
  "Gemiscord",
  (process.env.LOG_LEVEL as LogLevel) || "INFO",
  {
    fileConfig: globalFileConfig,
  }
);

// Specialized loggers for different components
export const createLogger = (component: string, level?: LogLevel): Logger => {
  return new Logger(
    `Gemiscord:${component}`,
    level || (process.env.LOG_LEVEL as LogLevel) || "INFO",
    {
      fileConfig: globalFileConfig,
    }
  );
};

// Export commonly used loggers
export const botLogger = createLogger("Bot");
export const configLogger = createLogger("Config");
export const discordLogger = createLogger("Discord");
export const geminiLogger = createLogger("Gemini");
export const searchLogger = createLogger("Search");
export const rateLimitLogger = createLogger("RateLimit");

// Utility function for structured logging
export function logStructured(
  logger: Logger,
  level: LogLevel,
  event: string,
  data: Record<string, unknown>
): void {
  const structuredLog = {
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };

  switch (level) {
    case "DEBUG":
      logger.debug(event, structuredLog);
      break;
    case "INFO":
      logger.info(event, structuredLog);
      break;
    case "WARN":
      logger.warn(event, structuredLog);
      break;
    case "ERROR":
      logger.error(event, structuredLog);
      break;
  }
}

// Performance logging utility
export class PerformanceLogger {
  private startTimes: Map<string, number> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  start(operation: string): void {
    this.startTimes.set(operation, Date.now());
    this.logger.debug(`Performance: ${operation} started`);
  }

  end(operation: string, metadata?: Record<string, unknown>): void {
    const startTime = this.startTimes.get(operation);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.startTimes.delete(operation);
      this.logger.info(`Performance: ${operation} completed`, {
        duration: `${duration}ms`,
        ...metadata,
      });
    }
  }
}

// Graceful shutdown handling for file logging
async function gracefulShutdown(): Promise<void> {
  const fileLoggers = FileLogger.getAllInstances();
  await Promise.all(fileLoggers.map((logger) => logger.destroy()));
}

// Register shutdown handlers
process.on("SIGINT", async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on("beforeExit", async () => {
  await gracefulShutdown();
});
