// Statistics and rate limit type definitions

export interface UsageStats {
  totalRequests: number;
  totalSearches: number;
  totalErrors: number;
  modelUsage: Record<string, number>;
  searchUsage: number;
  uptime: number;
  lastReset?: Date;
}

export interface RateLimitInfo {
  model: string;
  rpm: {
    current: number;
    limit: number;
    remaining: number;
  };
  tpm: {
    current: number;
    limit: number;
    remaining: number;
  };
  rpd: {
    current: number;
    limit: number;
    remaining: number;
  };
  nextReset: {
    rpm: Date;
    tpm: Date;
    rpd: Date;
  };
}