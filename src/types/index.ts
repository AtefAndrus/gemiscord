// Central export point for all type definitions

// Configuration types
export * from "./config.types.js";

// Discord types
export type {
  Command,
  ConfigCommandOptions,
  DiscordEmbed,
  EmbedField,
  EventHandler,
  ExtendedClient,
  InteractionContext,
  MessageContext,
  MessageType,
  ModelCommandOptions,
  ProcessedAttachment,
  ReadyData,
  ReferencedMessageContext,
  SearchCommandOptions,
  StatusCommandOptions,
} from "./discord.types.js";

export {
  ALLOWED_CHANNEL_TYPES,
  DISCORD_LIMITS,
  REQUIRED_PERMISSIONS,
} from "./discord.types.js";

// Gemini types
export type {
  FunctionCallingConfig,
  GeminiAttachment,
  GeminiConfig,
  GeminiError,
  GeminiFile,
  GeminiGenerateOptions,
  GeminiResponse,
  ModelInfo,
  ModelRateLimitStatus,
  TokenUsage,
} from "./gemini.types.js";

export {
  DEFAULT_GENERATION_CONFIG,
  DEFAULT_SAFETY_SETTINGS,
  GEMINI_MODELS,
} from "./gemini.types.js";

// Search types
export type {
  BraveFAQResult,
  BraveFAQResults,
  BraveInfobox,
  BraveNewsResult,
  BraveNewsResults,
  BraveQuery,
  BraveSearchRequest,
  BraveSearchResponse,
  BraveWebResult,
  BraveWebResults,
  FormattedSearchResult,
  SearchError,
  SearchQuery,
  SearchResponse,
  SearchServiceOptions,
  SearchUsageStats,
} from "./search.types.js";

// Response types
export type {
  CompressionRequest,
  DeferredResponse,
  ErrorResponse,
  FormattedResponse,
  ResponseContext,
  ResponseMetrics,
  ResponseStrategy,
  ResponseTemplate,
  SplitOptions,
  SplitResult,
} from "./response.types.js";

export { ErrorCode, RESPONSE_TEMPLATES } from "./response.types.js";

// Status types
export type {
  BotStatus,
  ConfigValue,
  ModelConfig,
  ModelStats,
  RateLimitInfo,
  SystemMetrics,
  UsageStats,
} from "./status.types.js";
