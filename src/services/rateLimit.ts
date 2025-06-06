// Rate limiting service implementation

import { IRateLimitService } from "../interfaces/services.js";
import { ModelRateLimitStatus } from "../types/gemini.types.js";
import { RateLimitInfo } from "../types/status.types.js";
import { APIError } from "../utils/errors.js";
import { discordLogger as logger } from "../utils/logger.js";
import { ConfigService } from "./config.js";
import { ConfigManager } from "./configManager.js";

export class RateLimitService implements IRateLimitService {
  private configService: ConfigService;
  private configManager: ConfigManager;

  constructor(configService: ConfigService, configManager: ConfigManager) {
    this.configService = configService;
    this.configManager = configManager;
    const config = this.configManager.getConfig();

    logger.info("RateLimitService initialized", {
      safetyBuffer: config.rate_limiting.safety_buffer,
      modelsAvailable: Object.keys(config.api.gemini.rate_limits),
    });
  }

  async initialize(): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      // Initialize counters for all models
      for (const modelName of Object.keys(config.api.gemini.rate_limits)) {
        await this.initializeModelCounters(modelName);
      }

      logger.info("Rate limit service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize rate limit service:", error);
      throw new APIError(
        "Failed to initialize rate limit service",
        undefined,
        undefined,
        error
      );
    }
  }

  async getAvailableModel(): Promise<string | null> {
    try {
      const models = this.getModelsByPriority();

      for (const modelName of models) {
        if (await this.checkLimits(modelName)) {
          logger.debug("Model available", {
            model: modelName,
            available: true,
          });
          return modelName;
        }
      }

      logger.warn("No models available due to rate limits");
      return null;
    } catch (error) {
      logger.error("Error checking available models:", error);
      throw new APIError(
        "Failed to check available models",
        undefined,
        undefined,
        error
      );
    }
  }

  async checkLimits(model: string): Promise<boolean> {
    try {
      const config = this.configManager.getConfig();
      if (!config.api.gemini.rate_limits[model]) {
        throw new APIError(`Unknown model: ${model}`);
      }

      const rateLimit = await this.getRemainingCapacity(model);

      // Check if we can make a request (considering safety buffer)
      const canMakeRequest = rateLimit.canMakeRequest;

      logger.debug("Rate limit check", {
        model,
        canMakeRequest,
        percentage: rateLimit.percentage,
        safetyBuffer: config.rate_limiting.safety_buffer,
      });

      return canMakeRequest;
    } catch (error) {
      logger.error("Error checking limits:", error);
      return false;
    }
  }

  async isSearchAvailable(): Promise<boolean> {
    try {
      const config = this.configManager.getConfig();
      const searchUsage = await this.configService.getSearchUsage();
      const freeQuota = config.api.brave_search.free_quota;

      const remaining = freeQuota - searchUsage;
      const canSearch = remaining > 0;

      logger.debug("Search availability check", {
        used: searchUsage,
        quota: freeQuota,
        remaining,
        canSearch,
      });

      return canSearch;
    } catch (error) {
      logger.error("Error checking search availability:", error);
      return false;
    }
  }

  async updateCounters(
    model: string,
    usage: { tokens?: number; requests?: number }
  ): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      if (!config.api.gemini.rate_limits[model]) {
        throw new APIError(`Unknown model: ${model}`);
      }

      const now = new Date();
      const timeWindows = config.rate_limiting.time_windows;

      // Update request counters
      if (usage.requests) {
        await this.incrementCounter(
          `${model}:rpm`,
          usage.requests,
          timeWindows.minute
        );
        await this.incrementCounter(
          `${model}:rpd`,
          usage.requests,
          timeWindows.day
        );
      }

      // Update token counters
      if (usage.tokens) {
        await this.incrementCounter(
          `${model}:tpm`,
          usage.tokens,
          timeWindows.minute
        );
      }

      // Update last request timestamp
      await this.configService.setRateLimitString(
        `${model}:last_request`,
        now.toISOString()
      );

      logger.debug("Rate limit counters updated", {
        model,
        usage,
        timestamp: now.toISOString(),
      });
    } catch (error) {
      logger.error("Error updating counters:", error);
      throw error;
    }
  }

  async getStatus(): Promise<ModelRateLimitStatus[]> {
    try {
      const config = this.configManager.getConfig();
      const statuses: ModelRateLimitStatus[] = [];

      for (const [modelName] of Object.entries(config.api.gemini.rate_limits)) {
        const rateLimit = await this.getRemainingCapacity(modelName);

        const status: ModelRateLimitStatus = {
          model: modelName,
          rpm: {
            current: rateLimit.current.rpm,
            limit: rateLimit.limits.rpm,
            resetAt: rateLimit.resetAt.rpm,
          },
          tpm: {
            current: rateLimit.current.tpm,
            limit: rateLimit.limits.tpm,
            resetAt: rateLimit.resetAt.tpm,
          },
          rpd: {
            current: rateLimit.current.rpd,
            limit: rateLimit.limits.rpd,
            resetAt: rateLimit.resetAt.rpd,
          },
          isAvailable: rateLimit.canMakeRequest,
          switchThreshold: config.rate_limiting.safety_buffer * 100,
        };

        statuses.push(status);
      }

      return statuses;
    } catch (error) {
      logger.error("Error getting rate limit status:", error);
      throw new APIError(
        "Failed to get rate limit status",
        undefined,
        undefined,
        error
      );
    }
  }

  async getRemainingCapacity(model: string): Promise<RateLimitInfo> {
    try {
      const config = this.configManager.getConfig();
      const modelRateLimit = config.api.gemini.rate_limits[model];

      if (!modelRateLimit) {
        throw new APIError(`Unknown model: ${model}`);
      }

      const now = new Date();
      const timeWindows = config.rate_limiting.time_windows;
      const safetyBuffer = config.rate_limiting.safety_buffer;

      // Get current usage
      const currentRpm = await this.getCounter(`${model}:rpm`);
      const currentTpm = await this.getCounter(`${model}:tpm`);
      const currentRpd = await this.getCounter(`${model}:rpd`);

      // Calculate remaining
      const remainingRpm = Math.max(0, modelRateLimit.rpm - currentRpm);
      const remainingTpm = Math.max(0, modelRateLimit.tpm - currentTpm);
      const remainingRpd = Math.max(0, modelRateLimit.rpd - currentRpd);

      // Calculate reset times
      const resetRpm = new Date(
        now.getTime() +
          (timeWindows.minute - (now.getTime() % timeWindows.minute))
      );
      const resetTpm = new Date(
        now.getTime() +
          (timeWindows.minute - (now.getTime() % timeWindows.minute))
      );
      const resetRpd = new Date(
        now.getTime() + (timeWindows.day - (now.getTime() % timeWindows.day))
      );

      // Calculate overall usage percentage (considering safety buffer)
      const rpmPercentage = currentRpm / (modelRateLimit.rpm * safetyBuffer);
      const tpmPercentage = currentTpm / (modelRateLimit.tpm * safetyBuffer);
      const rpdPercentage = currentRpd / (modelRateLimit.rpd * safetyBuffer);

      const overallPercentage = Math.max(
        rpmPercentage,
        tpmPercentage,
        rpdPercentage
      );
      const canMakeRequest = overallPercentage < 1.0;

      const rateLimitInfo: RateLimitInfo = {
        model,
        limits: {
          rpm: modelRateLimit.rpm,
          tpm: modelRateLimit.tpm,
          rpd: modelRateLimit.rpd,
        },
        current: {
          rpm: currentRpm,
          tpm: currentTpm,
          rpd: currentRpd,
        },
        remaining: {
          rpm: remainingRpm,
          tpm: remainingTpm,
          rpd: remainingRpd,
        },
        resetAt: {
          rpm: resetRpm,
          tpm: resetTpm,
          rpd: resetRpd,
        },
        percentage: Math.min(100, overallPercentage * 100),
        canMakeRequest,
      };

      return rateLimitInfo;
    } catch (error) {
      logger.error("Error getting remaining capacity:", error);
      throw new APIError(
        "Failed to get remaining capacity",
        undefined,
        undefined,
        error
      );
    }
  }

  async resetCounters(model?: string): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      const modelsToReset = model
        ? [model]
        : Object.keys(config.api.gemini.rate_limits);

      for (const modelName of modelsToReset) {
        await this.configService.deleteRateLimitKey(`${modelName}:rpm`);
        await this.configService.deleteRateLimitKey(`${modelName}:tpm`);
        await this.configService.deleteRateLimitKey(`${modelName}:rpd`);
        await this.configService.deleteRateLimitKey(
          `${modelName}:last_request`
        );
      }

      logger.info("Rate limit counters reset", {
        models: modelsToReset,
      });
    } catch (error) {
      logger.error("Error resetting counters:", error);
      throw error;
    }
  }

  private async initializeModelCounters(model: string): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      const timeWindows = config.rate_limiting.time_windows;

      // Initialize counters if they don't exist
      const rpmKey = `${model}:rpm`;
      const tpmKey = `${model}:tpm`;
      const rpdKey = `${model}:rpd`;

      if (!(await this.configService.hasRateLimitKey(rpmKey))) {
        await this.configService.setRateLimitValue(
          rpmKey,
          0,
          timeWindows.minute
        );
      }
      if (!(await this.configService.hasRateLimitKey(tpmKey))) {
        await this.configService.setRateLimitValue(
          tpmKey,
          0,
          timeWindows.minute
        );
      }
      if (!(await this.configService.hasRateLimitKey(rpdKey))) {
        await this.configService.setRateLimitValue(rpdKey, 0, timeWindows.day);
      }

      logger.debug("Model counters initialized", { model });
    } catch (error) {
      logger.error("Error initializing model counters:", error);
      throw error;
    }
  }

  private async incrementCounter(
    key: string,
    value: number,
    ttl: number
  ): Promise<void> {
    try {
      const current = await this.configService.getRateLimitValue(key);
      await this.configService.setRateLimitValue(key, current + value, ttl);
    } catch (error) {
      logger.error("Error incrementing counter:", error);
      throw error;
    }
  }

  private async getCounter(key: string): Promise<number> {
    try {
      return await this.configService.getRateLimitValue(key);
    } catch (error) {
      logger.error("Error getting counter:", error);
      return 0;
    }
  }

  private getModelsByPriority(): string[] {
    // Return models in priority order based on configuration
    const config = this.configManager.getConfig();
    return [
      config.api.gemini.models.primary,
      config.api.gemini.models.fallback,
    ].filter(Boolean);
  }
}
