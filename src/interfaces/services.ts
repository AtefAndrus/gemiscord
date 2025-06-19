// Service layer interfaces
import { FunctionCall, Tool } from "@google/genai";
import { Attachment, Message, TextChannel } from "discord.js";
import {
  ChannelConfig,
  GeminiFile,
  GeminiGenerateOptions,
  GeminiResponse,
  GuildConfig,
  LogLevel,
  MessageContext,
  MessageLimitStrategy,
  ModelConfig,
  ModelRateLimitStatus,
  ProcessedAttachment,
  RateLimitInfo,
  ResponseContext,
  SearchQuery,
  SearchResponse,
  SplitOptions,
  SplitResult,
  UsageStats,
  YAMLConfig,
} from "../types/index.js";

// Configuration management interfaces
export interface IConfigManager {
  // Load configuration from YAML files
  loadConfig(): Promise<void>;

  // Get configuration values
  getConfig(): YAMLConfig;
  getBaseSystemPrompt(): string;
  getSearchFunctionDeclaration(): Tool;
  getCharacterCountFunctionDeclaration(): Tool;
  getResponseStrategy(): MessageLimitStrategy;
  getModelConfig(model: string): ModelConfig;
  getCacheTTL(key: string): number;

  // Reload configuration
  reloadConfig(): Promise<void>;
}

export interface IConfigService {
  // Initialize keyv connection
  initialize(): Promise<void>;

  // Guild configuration
  getGuildConfig(guildId: string): Promise<GuildConfig>;
  setGuildConfig(guildId: string, config: Partial<GuildConfig>): Promise<void>;

  // Channel configuration
  getChannelConfig(channelId: string): Promise<ChannelConfig>;
  setChannelConfig(
    channelId: string,
    config: Partial<ChannelConfig>
  ): Promise<void>;

  // Mention and response settings
  isMentionEnabled(guildId: string): Promise<boolean>;
  isResponseChannel(guildId: string, channelId: string): Promise<boolean>;

  // Search settings
  isSearchEnabled(guildId: string): Promise<boolean>;
  getSearchUsage(): Promise<number>;
  incrementSearchUsage(): Promise<void>;
  resetSearchUsage(): Promise<void>;

  // Statistics
  getStats(availableModels?: string[]): Promise<UsageStats>;
  incrementStats(key: string, value?: number): Promise<void>;

  // Model preferences
  getPreferredModel(guildId: string): Promise<string | null>;
  setPreferredModel(guildId: string, model: string): Promise<void>;

  // Cleanup old data
  cleanup(): Promise<void>;
}

export interface IGeminiService {
  // Initialize service
  initialize(): Promise<void>;

  // Generate content
  generateContent(options: GeminiGenerateOptions): Promise<GeminiResponse>;

  // File handling
  uploadFile(
    file: Buffer,
    mimeType: string,
    displayName: string
  ): Promise<GeminiFile>;
  deleteFile(fileUri: string): Promise<void>;

  // Model information
  getAvailableModels(): string[];
  getCurrentModel(): string;
  switchModel(model: string): void;

  // Function calling
  executeFunction(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown>;
}

export interface ISearchService {
  // Initialize service
  initialize(): Promise<void>;

  // Search operations
  search(query: SearchQuery): Promise<SearchResponse>;

  // Usage tracking
  getUsageStats(): Promise<{ monthlyUsage: number; remainingQueries: number }>;
  canSearch(): Promise<boolean>;

  // Format results for Discord
  formatResultsForDiscord(results: SearchResponse): string;
}

export interface IRateLimitService {
  // Initialize service
  initialize(): Promise<void>;

  // Check availability
  getAvailableModel(guildId?: string): Promise<string | null>;
  checkLimits(model: string): Promise<boolean>;
  isSearchAvailable(): Promise<boolean>;

  // Update counters
  updateCounters(
    model: string,
    usage: { tokens?: number; requests?: number }
  ): Promise<void>;

  // Get status
  getStatus(): Promise<ModelRateLimitStatus[]>;
  getRemainingCapacity(model: string): Promise<RateLimitInfo>;

  // Reset counters (for testing)
  resetCounters(model?: string): Promise<void>;
}

export interface IMessageProcessor {
  // Process incoming messages
  processMessage(message: Message): Promise<MessageContext>;

  // Sanitize content
  sanitizeContent(content: string): string;

  // Extract mentions
  extractMentions(content: string): {
    users: string[];
    channels: string[];
    roles: string[];
  };

  // Process attachments
  processAttachments(attachments: Attachment[]): Promise<ProcessedAttachment[]>;

  // Build context
  buildContext(message: Message): Promise<MessageContext>;
}

export interface IResponseManager {
  // Handle response length
  handleResponse(
    response: string,
    strategy: MessageLimitStrategy
  ): Promise<ResponseContext>;

  // Split messages
  splitMessage(content: string, options?: SplitOptions): SplitResult;

  // Compress response
  compressResponse(content: string, targetLength: number): Promise<string>;

  // Format for Discord
  formatForDiscord(content: string): string;

  // Send response
  sendResponse(
    channel: TextChannel,
    responseContext: ResponseContext
  ): Promise<void>;
}

export interface IPromptBuilder {
  // Build system prompt
  buildSystemPrompt(
    guildId: string,
    channelId?: string,
    temporaryInstructions?: string
  ): Promise<string>;

  // Build user prompt
  buildUserPrompt(context: MessageContext): string;

  // Get prompt hierarchy
  getPromptHierarchy(guildId: string, channelId?: string): Promise<string[]>;
}

export interface IFunctionCallingService {
  // Get available functions
  getAvailableFunctions(): Promise<Tool[]>;

  // Execute function
  executeFunction(functionCall: FunctionCall): Promise<unknown>;

  // Validate function call
  validateFunctionCall(functionCall: FunctionCall): boolean;

  // Format function response
  formatFunctionResponse(functionName: string, response: unknown): string;
}

export interface IFileProcessor {
  // Process Discord attachment
  processAttachment(attachment: Attachment): Promise<ProcessedAttachment>;

  // Download file
  downloadFile(url: string): Promise<Buffer>;

  // Validate file
  validateFile(buffer: Buffer, mimeType: string): boolean;

  // Convert for Gemini
  prepareForGemini(buffer: Buffer, mimeType: string): Promise<GeminiFile>;
}

// Logger interface
export interface ILogger {
  setLevel(level: LogLevel): void;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: unknown, ...args: unknown[]): void;
}
