// Configuration type definitions for Gemiscord

// Static YAML configuration structure
export interface YAMLConfig {
  prompts: {
    base_system: string;
  };

  function_calling: {
    search_function: FunctionDeclarationConfig;
    character_count_function: FunctionDeclarationConfig;
  };

  response_handling: {
    message_limit_strategy: MessageLimitStrategy;
    max_characters: number;
    compress_instruction: string;
    split_options: SplitOptions;
  };

  message_processing: {
    mention_placeholder: MentionPlaceholder;
  };

  api: {
    gemini: GeminiApiConfig;
    brave_search: BraveSearchApiConfig;
  };

  constants: {
    cache: CacheTTLConfig;
  };

  // UI/UX configuration
  ui: {
    activity: {
      update_interval: number;
      messages: string[];
    };
    messaging: {
      split_delay: number;
      preview_length: number;
    };
    emojis: {
      success: string;
      error: string;
      warning: string;
      search: string;
    };
  };

  // Search and AI parameters
  search: {
    defaults: {
      count: number;
      max_results: number;
      display_count: number;
    };
    validation: {
      query: {
        min_length: number;
        max_length: number;
      };
    };
    formatting: {
      preview_length: number;
    };
  };

  ai: {
    timeout: number;
    temperature: number;
  };

  // Monitoring and alerting
  monitoring: {
    thresholds: {
      usage: {
        warning: number;
        critical: number;
      };
      memory: {
        warning: number;
        critical: number;
      };
    };
    intervals: {
      health_check: number;
      metrics: number;
    };
  };

  // Logging configuration
  logging: {
    file: {
      enabled: boolean;
      level: LogLevel;
      directory: string;
      filename_pattern: string;
      max_files: number;
      include_console_colors: boolean;
      separate_error_file: boolean;
      json_format: boolean;
    };
    rotation: {
      daily: boolean;
      max_size: string;
      cleanup_old: boolean;
    };
    performance: {
      buffer_size: number;
      flush_interval: number;
    };
  };

  // Rate limiting enhancements
  rate_limiting: {
    safety_buffer: number;
    buffer_percentage: number;
    time_windows: {
      minute: number;
      day: number;
      month: number;
    };
  };
}

export interface FunctionDeclarationConfig {
  name: string;
  description: string;
}

export type MessageLimitStrategy = "compress" | "split";

export interface SplitOptions {
  max_length: number;
  prefer_line_breaks: boolean;
}

export interface MentionPlaceholder {
  user: string;
  channel: string;
  role: string;
}

export interface GeminiApiConfig {
  models: {
    primary: string;
    fallback: string;
    available: string[];
  };
  rate_limits: {
    [model: string]: ModelRateLimit;
  };
}

export interface ModelRateLimit {
  rpm: number; // Requests per minute
  tpm: number; // Tokens per minute
  rpd: number; // Requests per day
}

export interface BraveSearchApiConfig {
  endpoint: string;
  free_quota: number;
  rate_limits: {
    requests_per_second: number;
  };
}

export interface CacheTTLConfig {
  ttl_minutes: {
    rate_limit_rpm: number;
    rate_limit_rpd: number;
    search_usage: number;
  };
}

// Dynamic configuration (stored in keyv)
export interface DynamicConfig {
  guild: GuildConfig;
  channel: ChannelConfig;
  rate_limits: RateLimitConfig;
  search_usage: SearchUsageConfig;
  stats: StatsConfig;
}

export interface GuildConfig {
  mention_enabled: boolean;
  response_channels: string[];
  search_enabled: boolean;
  server_prompt?: string;
  message_limit_strategy: MessageLimitStrategy;
}

export interface ChannelConfig {
  channel_prompt?: string;
}

export interface RateLimitConfig {
  [model: string]: {
    rpm_current?: number;
    tpm_current?: number;
    rpd_current?: number;
  };
}

export interface SearchUsageConfig {
  monthly_usage: number;
  last_reset_date: string;
}

export interface StatsConfig {
  total_requests: number;
  model_usage: { [model: string]: number };
  search_usage: number;
}

// Environment configuration
export interface EnvConfig {
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  GEMINI_API_KEY: string;
  BRAVE_SEARCH_API_KEY: string;
  NODE_ENV: "development" | "production" | "test";
  LOG_LEVEL: LogLevel;
  DATABASE_URL: string;
}

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

// Configuration key patterns for keyv storage
export const CONFIG_KEYS = {
  GUILD: {
    MENTION_ENABLED: (guildId: string) => `guild:${guildId}:mention_enabled`,
    RESPONSE_CHANNELS: (guildId: string) =>
      `guild:${guildId}:response_channels`,
    SEARCH_ENABLED: (guildId: string) => `guild:${guildId}:search_enabled`,
    SERVER_PROMPT: (guildId: string) => `guild:${guildId}:server_prompt`,
    MESSAGE_LIMIT_STRATEGY: (guildId: string) =>
      `guild:${guildId}:message_limit_strategy`,
  },
  CHANNEL: {
    CHANNEL_PROMPT: (channelId: string) =>
      `channel:${channelId}:channel_prompt`,
  },
  RATE_LIMIT: {
    RPM: (model: string, minute: number) => `ratelimit:${model}:rpm:${minute}`,
    TPM: (model: string, minute: number) => `ratelimit:${model}:tpm:${minute}`,
    RPD: (model: string, day: string) => `ratelimit:${model}:rpd:${day}`,
  },
  SEARCH: {
    MONTHLY_USAGE: (month: string) => `search:monthly_usage:${month}`,
  },
  STATS: {
    TOTAL_REQUESTS: "stats:total_requests",
    MODEL_USAGE: (model: string) => `stats:model_usage:${model}`,
    SEARCH_USAGE: "stats:search_usage",
  },
} as const;
