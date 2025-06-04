// Logging utility for Gemiscord

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

// Logger implementation
export class Logger implements ILogger {
  private level: LogLevel;
  private readonly prefix: string;
  private readonly enableColors: boolean;
  private readonly enableTimestamp: boolean;

  constructor(
    prefix: string = "Gemiscord",
    level: LogLevel = "INFO",
    options: {
      enableColors?: boolean;
      enableTimestamp?: boolean;
    } = {}
  ) {
    this.prefix = prefix;
    this.level = level;
    this.enableColors = options.enableColors ?? process.stdout.isTTY;
    this.enableTimestamp = options.enableTimestamp ?? true;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
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
    if (this.shouldLog("DEBUG")) {
      console.log(this.formatMessage("DEBUG", message, args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("INFO")) {
      console.log(this.formatMessage("INFO", message, args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("WARN")) {
      console.warn(this.formatMessage("WARN", message, args));
    }
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (this.shouldLog("ERROR")) {
      const errorMessage = error
        ? this.formatMessage("ERROR", message, args) + this.formatError(error)
        : this.formatMessage("ERROR", message, args);
      console.error(errorMessage);
    }
  }
}

// Default logger instance
export const logger = new Logger(
  "Gemiscord",
  (process.env.LOG_LEVEL as LogLevel) || "INFO"
);

// Specialized loggers for different components
export const createLogger = (component: string, level?: LogLevel): Logger => {
  return new Logger(
    `Gemiscord:${component}`,
    level || (process.env.LOG_LEVEL as LogLevel) || "INFO"
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
