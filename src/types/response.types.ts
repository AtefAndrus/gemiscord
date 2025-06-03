// Response handling type definitions

import { Message, Embed, Attachment, CommandInteraction } from "discord.js";

// Response processing types
export interface ResponseContext {
  originalResponse: string;
  processedResponse: string;
  strategy: ResponseStrategy;
  messageCount: number;
  characterCount: number;
  requiresProcessing: boolean;
}

export type ResponseStrategy = "direct" | "compress" | "split";

// Message splitting options
export interface SplitOptions {
  maxLength: number;
  preferLineBreaks: boolean;
  preserveCodeBlocks?: boolean;
  preserveFormatting?: boolean;
}

// Split message result
export interface SplitResult {
  messages: string[];
  totalParts: number;
  characterCounts: number[];
}

// Compression request
export interface CompressionRequest {
  originalText: string;
  targetLength: number;
  compressionInstruction: string;
  preserveKeyInfo?: boolean;
}

// Response formatting
export interface FormattedResponse {
  content: string;
  embeds?: Embed[];
  files?: Attachment[];
  allowedMentions?: {
    parse?: ("users" | "roles" | "everyone")[];
    users?: string[];
    roles?: string[];
    repliedUser?: boolean;
  };
}

// Error response types
export interface ErrorResponse {
  message: string;
  code: string;
  details?: string;
  userFriendlyMessage: string;
  shouldRetry: boolean;
  retryAfter?: number;
}

export enum ErrorCode {
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE",
  API_ERROR = "API_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// Response metrics
export interface ResponseMetrics {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  modelUsed: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  functionCallsCount: number;
  searchPerformed: boolean;
  compressionApplied: boolean;
  messagesSent: number;
}

// Deferred response handling
export interface DeferredResponse {
  interaction?: CommandInteraction;
  message?: Message;
  placeholderSent: boolean;
  startTime: Date;
  timeout: NodeJS.Timeout;
}

// Response cache
export interface CachedResponse {
  query: string;
  response: string;
  timestamp: Date;
  modelUsed: string;
  ttl: number;
}

// Response validation
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Response moderation
export interface ModerationResult {
  flagged: boolean;
  categories: {
    violence: boolean;
    hate: boolean;
    harassment: boolean;
    selfHarm: boolean;
    sexual: boolean;
    dangerous: boolean;
  };
  action: "allow" | "block" | "modify";
  modifiedContent?: string;
}

// Streaming response support (future)
export interface StreamingOptions {
  enabled: boolean;
  chunkSize: number;
  updateInterval: number;
  placeholder: string;
}

// Response templates
export interface ResponseTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  context: "error" | "success" | "info" | "warning";
}

// Common response templates
export const RESPONSE_TEMPLATES: Record<string, ResponseTemplate> = {
  RATE_LIMIT: {
    id: "rate_limit",
    name: "Rate Limit Exceeded",
    template:
      "⚠️ 申し訳ございません。現在リクエスト制限に達しています。{retryAfter}秒後に再度お試しください。",
    variables: ["retryAfter"],
    context: "warning",
  },
  API_ERROR: {
    id: "api_error",
    name: "API Error",
    template:
      "❌ エラーが発生しました: {error}。しばらくしてから再度お試しください。",
    variables: ["error"],
    context: "error",
  },
  THINKING: {
    id: "thinking",
    name: "Processing",
    template: "🤔 考えています...",
    variables: [],
    context: "info",
  },
  SEARCH_IN_PROGRESS: {
    id: "search_in_progress",
    name: "Searching",
    template: '🔍 "{query}" について検索しています...',
    variables: ["query"],
    context: "info",
  },
};
