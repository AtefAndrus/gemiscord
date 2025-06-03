// Status-related type definitions

export interface BotStatus {
  online: boolean;
  uptime: number;
  startTime: Date;
  currentModel: string;
  activeGuilds: number;
  activeChannels: number;
  version: string;
  environment: string;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  responseTime?: {
    average: number;
    p95: number;
    p99: number;
  };
  errors?: {
    total: number;
    rate: number;
  };
}

export interface ModelStats {
  model: string;
  requestsTotal: number;
  requestsToday: number;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  averageLatency: number;
  errorRate: number;
  lastUsed?: Date;
}

export interface ModelConfig {
  model: string;
  enabled: boolean;
  priority?: number;
  rateLimits: {
    rpm: number;
    tpm: number;
    rpd: number;
  };
  functionCalling?: {
    enabled: boolean;
    availableFunctions: string[];
  };
}

export type ConfigValue = string | number | boolean | string[] | Record<string, unknown>;

// Usage statistics
export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  modelUsage: Record<string, ModelStats>;
  searchUsage: {
    total: number;
    monthly: number;
    daily: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  lastUpdated: Date;
}

// Rate limit information
export interface RateLimitInfo {
  model: string;
  limits: {
    rpm: number;
    tpm: number;
    rpd: number;
  };
  current: {
    rpm: number;
    tpm: number;
    rpd: number;
  };
  remaining: {
    rpm: number;
    tpm: number;
    rpd: number;
  };
  resetAt: {
    rpm: Date;
    tpm: Date;
    rpd: Date;
  };
  percentage: number; // Overall usage percentage
  canMakeRequest: boolean;
}