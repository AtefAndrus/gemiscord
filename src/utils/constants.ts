// Application constants for Gemiscord

// Environment variables with defaults
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "INFO",
  DATABASE_URL: process.env.DATABASE_URL || "sqlite://config/bot.sqlite",
} as const;

// Application metadata
export const APP_INFO = {
  NAME: "Gemiscord",
  VERSION: "1.0.0",
  DESCRIPTION: "Discord bot with Gemini AI integration",
  AUTHOR: "AtefAndrus",
  REPOSITORY: "https://github.com/AtefAndrus/gemiscord",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  GEMINI: {
    BASE_URL: "https://generativelanguage.googleapis.com",
    API_VERSION: "v1beta",
  },
  BRAVE_SEARCH: {
    BASE_URL: "https://api.search.brave.com",
    SEARCH_ENDPOINT: "/res/v1/web/search",
  },
} as const;

// Rate limiting constants
export const RATE_LIMITS = {
  // Model switch threshold (percentage)
  SWITCH_THRESHOLD: 0.8, // Switch at 80% capacity

  // Rate limit windows
  WINDOWS: {
    MINUTE: 60 * 1000, // 1 minute in ms
    DAY: 24 * 60 * 60 * 1000, // 24 hours in ms
  },

  // Buffer for rate limit calculations
  BUFFER_PERCENTAGE: 0.9, // Use 90% of actual limit
} as const;

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  RATE_LIMIT_MINUTE: 60 * 1000, // 1 minute
  RATE_LIMIT_DAY: 24 * 60 * 60 * 1000, // 24 hours
  SEARCH_USAGE: 30 * 24 * 60 * 60 * 1000, // 30 days
  RESPONSE_CACHE: 5 * 60 * 1000, // 5 minutes
  FILE_CACHE: 60 * 60 * 1000, // 1 hour
} as const;

// Discord-specific constants
export const DISCORD = {
  // Message limits
  MESSAGE_MAX_LENGTH: 2000,
  EMBED_MAX_LENGTH: 6000,
  EMBED_FIELD_MAX: 25,
  EMBED_TITLE_MAX: 256,
  EMBED_DESCRIPTION_MAX: 4096,
  EMBED_FIELD_NAME_MAX: 256,
  EMBED_FIELD_VALUE_MAX: 1024,

  // File limits
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB

  // Interaction limits
  INTERACTION_TIMEOUT: 15 * 60 * 1000, // 15 minutes
  DEFER_TIMEOUT: 3000, // 3 seconds to defer

  // Colors (as integers)
  COLORS: {
    PRIMARY: 0x5865f2, // Discord blurple
    SUCCESS: 0x57f287, // Green
    WARNING: 0xfee75c, // Yellow
    ERROR: 0xed4245, // Red
    INFO: 0x5865f2, // Blue
  },
} as const;

// Gemini-specific constants
export const GEMINI = {
  // Default generation config
  DEFAULT_TEMPERATURE: 0.9,
  DEFAULT_TOP_P: 0.95,
  DEFAULT_TOP_K: 40,
  DEFAULT_MAX_OUTPUT_TOKENS: 8192,

  // File upload limits
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
  SUPPORTED_IMAGE_TYPES: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/heic",
    "image/heif",
  ],

  // Function calling
  FUNCTION_CALLING_MODE: "AUTO",

  // Timeouts
  REQUEST_TIMEOUT: 30 * 1000, // 30 seconds
  FILE_UPLOAD_TIMEOUT: 60 * 1000, // 60 seconds
} as const;

// Search-specific constants
export const SEARCH = {
  // Default search parameters
  DEFAULT_COUNT: 5,
  MAX_RESULTS: 20,
  DEFAULT_REGION: "JP",
  DEFAULT_LANGUAGE: "ja",
  DEFAULT_SAFESEARCH: "moderate" as const,

  // Free tier limits
  FREE_TIER_MONTHLY_LIMIT: 2000,

  // Search timeout
  TIMEOUT: 10 * 1000, // 10 seconds
} as const;

// Message processing constants
export const MESSAGE_PROCESSING = {
  // Mention placeholders
  PLACEHOLDERS: {
    USER: "[ユーザー]",
    CHANNEL: "[チャンネル]",
    ROLE: "[ロール]",
    CODE_BLOCK: "[コードブロック]",
  },

  // Regex patterns
  PATTERNS: {
    USER_MENTION: /<@!?(\d+)>/g,
    CHANNEL_MENTION: /<#(\d+)>/g,
    ROLE_MENTION: /<@&(\d+)>/g,
    CUSTOM_EMOJI: /<a?:([^:]+):\d+>/g,
    CODE_BLOCK: /```[\s\S]*?```/g,
    URL: /https?:\/\/[^\s]+/g,
  },

  // Split message preferences
  SPLIT_PREFERENCES: {
    MAX_LENGTH: 1900, // Leave room for formatting
    PREFER_LINE_BREAKS: true,
    PRESERVE_CODE_BLOCKS: true,
  },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  // API errors
  API_KEY_MISSING: "API key is not configured",
  API_REQUEST_FAILED: "API request failed",

  // Configuration errors
  CONFIG_NOT_FOUND: "Configuration file not found",
  CONFIG_INVALID: "Invalid configuration format",

  // Permission errors
  BOT_PERMISSION_MISSING: "Bot lacks required permissions",
  USER_PERMISSION_MISSING: "You do not have permission to use this command",

  // Rate limit errors
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
  ALL_MODELS_EXHAUSTED: "All AI models are currently rate limited",

  // Search errors
  SEARCH_QUOTA_EXCEEDED: "Monthly search quota exceeded",
  SEARCH_FAILED: "Search request failed",

  // General errors
  UNKNOWN_ERROR: "An unknown error occurred",
  TIMEOUT: "Request timed out",
} as const;

// Default configurations
export const DEFAULTS = {
  // Guild defaults
  GUILD: {
    MENTION_ENABLED: true,
    RESPONSE_CHANNELS: [] as string[],
    SEARCH_ENABLED: true,
    MESSAGE_LIMIT_STRATEGY: "compress" as const,
  },

  // System prompts
  PROMPTS: {
    COMPRESS_INSTRUCTION: "2000文字以内で簡潔に応答してください",
  },
} as const;

// Monitoring constants
export const MONITORING = {
  // Health check interval
  HEALTH_CHECK_INTERVAL: 60 * 1000, // 1 minute

  // Metrics collection
  METRICS_INTERVAL: 5 * 60 * 1000, // 5 minutes

  // Memory thresholds
  MEMORY_WARNING_THRESHOLD: 100 * 1024 * 1024, // 100MB
  MEMORY_CRITICAL_THRESHOLD: 150 * 1024 * 1024, // 150MB
} as const;
