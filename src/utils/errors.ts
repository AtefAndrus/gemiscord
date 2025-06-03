// Custom error classes for Gemiscord

import { ErrorCode } from "../types/index.js";

// Base error class
export class GemiscordError extends Error {
  public code: ErrorCode;
  public details?: unknown;
  public timestamp: Date;
  public context?: string;

  constructor(
    message: string,
    code: ErrorCode,
    details?: unknown,
    context?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    if ("captureStackTrace" in Error) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// API related errors
export class APIError extends GemiscordError {
  public status?: number;
  public endpoint?: string;

  constructor(
    message: string,
    status?: number,
    endpoint?: string,
    details?: any
  ) {
    super(message, ErrorCode.API_ERROR, details, "API");
    this.status = status;
    this.endpoint = endpoint;
  }
}

// Rate limit error
export class RateLimitError extends GemiscordError {
  public retryAfter?: number;
  public limit?: number;
  public remaining?: number;
  public model?: string;

  constructor(message: string, retryAfter?: number, model?: string) {
    super(
      message,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      { retryAfter, model },
      "RateLimit"
    );
    this.retryAfter = retryAfter;
    this.model = model;
  }
}

// Configuration error
export class ConfigurationError extends GemiscordError {
  public configKey?: string;
  public configFile?: string;

  constructor(message: string, configKey?: string, configFile?: string) {
    super(
      message,
      ErrorCode.CONFIGURATION_ERROR,
      { configKey, configFile },
      "Configuration"
    );
    this.configKey = configKey;
    this.configFile = configFile;
  }
}

// Validation error
export class ValidationError extends GemiscordError {
  public field?: string;
  public value?: unknown;
  public constraint?: string;

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    constraint?: string
  ) {
    super(
      message,
      ErrorCode.INVALID_INPUT,
      { field, value, constraint },
      "Validation"
    );
    this.field = field;
    this.value = value;
    this.constraint = constraint;
  }
}

// Permission error
export class PermissionError extends GemiscordError {
  public requiredPermission?: string;
  public userId?: string;
  public guildId?: string;

  constructor(
    message: string,
    requiredPermission?: string,
    userId?: string,
    guildId?: string
  ) {
    super(
      message,
      ErrorCode.PERMISSION_DENIED,
      { requiredPermission, userId, guildId },
      "Permission"
    );
    this.requiredPermission = requiredPermission;
    this.userId = userId;
    this.guildId = guildId;
  }
}

// Network error
export class NetworkError extends GemiscordError {
  public url?: string;
  public method?: string;
  public timeout?: number;

  constructor(
    message: string,
    url?: string,
    method?: string,
    timeout?: number
  ) {
    super(
      message,
      ErrorCode.NETWORK_ERROR,
      { url, method, timeout },
      "Network"
    );
    this.url = url;
    this.method = method;
    this.timeout = timeout;
  }
}

// Timeout error
export class TimeoutError extends GemiscordError {
  public operation?: string;
  public duration?: number;

  constructor(message: string, operation?: string, duration?: number) {
    super(message, ErrorCode.TIMEOUT, { operation, duration }, "Timeout");
    this.operation = operation;
    this.duration = duration;
  }
}

// Model unavailable error
export class ModelUnavailableError extends GemiscordError {
  public model?: string;
  public reason?: string;

  constructor(message: string, model?: string, reason?: string) {
    super(message, ErrorCode.MODEL_UNAVAILABLE, { model, reason }, "Model");
    this.model = model;
    this.reason = reason;
  }
}

// Error utility functions
export function isRetryableError(error: Error): boolean {
  if (error instanceof GemiscordError) {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.RATE_LIMIT_EXCEEDED,
    ].includes(error.code);
  }
  return false;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return "Unknown error occurred";
}

export function getUserFriendlyMessage(error: Error): string {
  if (error instanceof RateLimitError) {
    return `⚠️ リクエスト制限に達しました。${
      error.retryAfter
        ? `${error.retryAfter}秒後に再度お試しください。`
        : "しばらくしてから再度お試しください。"
    }`;
  }
  if (error instanceof APIError) {
    return "❌ 外部サービスでエラーが発生しました。しばらくしてから再度お試しください。";
  }
  if (error instanceof ValidationError) {
    return "❌ 入力内容に問題があります。もう一度確認してください。";
  }
  if (error instanceof PermissionError) {
    return "❌ この操作を実行する権限がありません。";
  }
  if (error instanceof ConfigurationError) {
    return "❌ 設定に問題があります。管理者にお問い合わせください。";
  }
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return "❌ 通信エラーが発生しました。インターネット接続を確認してください。";
  }
  if (error instanceof ModelUnavailableError) {
    return "❌ 現在、AIモデルが利用できません。しばらくしてから再度お試しください。";
  }
  return "❌ エラーが発生しました。しばらくしてから再度お試しください。";
}
