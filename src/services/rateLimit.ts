// Rate limiting service implementation

import { IRateLimitService } from "../interfaces/services.js";
import {
  ModelRateLimitStatus,
  GEMINI_MODELS,
} from "../types/gemini.types.js";
import { RateLimitInfo } from "../types/status.types.js";
import { ConfigService } from "./config.js";
import { ConfigManager } from "./configManager.js";
import { discordLogger as logger } from "../utils/logger.js";
import { APIError } from "../utils/errors.js";

export class RateLimitService implements IRateLimitService {
  private configService: ConfigService;
  private configManager: ConfigManager;
  private readonly SAFETY_BUFFER = 0.8; // Use only 80% of limits for safety

  constructor(configService: ConfigService, configManager: ConfigManager) {
    this.configService = configService;
    this.configManager = configManager;

    logger.info("RateLimitService initialized", {
      safetyBuffer: this.SAFETY_BUFFER,
      modelsAvailable: Object.keys(GEMINI_MODELS),
    });
  }

  async initialize(): Promise<void> {
    try {
      // Initialize counters for all models
      for (const modelName of Object.keys(GEMINI_MODELS)) {
        await this.initializeModelCounters(modelName);
      }

      logger.info("Rate limit service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize rate limit service:", error);
      throw new APIError("Failed to initialize rate limit service", undefined, undefined, error);
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
      throw new APIError("Failed to check available models", undefined, undefined, error);
    }
  }

  async checkLimits(model: string): Promise<boolean> {
    try {
      if (!GEMINI_MODELS[model]) {
        throw new APIError(`Unknown model: ${model}`);
      }

      const rateLimit = await this.getRemainingCapacity(model);
      
      // Check if we can make a request (considering safety buffer)
      const canMakeRequest = rateLimit.canMakeRequest;

      logger.debug("Rate limit check", {
        model,
        canMakeRequest,
        percentage: rateLimit.percentage,
        safetyBuffer: this.SAFETY_BUFFER,
      });

      return canMakeRequest;
    } catch (error) {
      logger.error("Error checking limits:", error);
      return false;
    }
  }

  async isSearchAvailable(): Promise<boolean> {
    try {
      const searchUsage = await this.configService.getSearchUsage();
      const FREE_QUOTA = 2000; // Brave Search free quota
      
      const remaining = FREE_QUOTA - searchUsage;
      const canSearch = remaining > 0;

      logger.debug("Search availability check", {
        used: searchUsage,
        quota: FREE_QUOTA,
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
      if (!GEMINI_MODELS[model]) {
        throw new APIError(`Unknown model: ${model}`);
      }

      const now = new Date();

      // Update request counters
      if (usage.requests) {
        await this.incrementCounter(`${model}:rpm`, usage.requests, 60 * 1000); // 1 minute
        await this.incrementCounter(`${model}:rpd`, usage.requests, 24 * 60 * 60 * 1000); // 1 day
      }

      // Update token counters
      if (usage.tokens) {
        await this.incrementCounter(`${model}:tpm`, usage.tokens, 60 * 1000); // 1 minute
      }

      // Update last request timestamp
      await this.configService.setRateLimitString(`${model}:last_request`, now.toISOString());

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
      const statuses: ModelRateLimitStatus[] = [];

      for (const [modelName] of Object.entries(GEMINI_MODELS)) {
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
          switchThreshold: this.SAFETY_BUFFER * 100,
        };

        statuses.push(status);
      }

      return statuses;
    } catch (error) {
      logger.error("Error getting rate limit status:", error);
      throw new APIError("Failed to get rate limit status", undefined, undefined, error);
    }
  }

  async getRemainingCapacity(model: string): Promise<RateLimitInfo> {
    try {
      if (!GEMINI_MODELS[model]) {
        throw new APIError(`Unknown model: ${model}`);
      }

      const modelInfo = GEMINI_MODELS[model];
      const now = new Date();

      // Get current usage
      const currentRpm = await this.getCounter(`${model}:rpm`);
      const currentTpm = await this.getCounter(`${model}:tpm`);
      const currentRpd = await this.getCounter(`${model}:rpd`);

      // Calculate remaining
      const remainingRpm = Math.max(0, modelInfo.rateLimit.rpm - currentRpm);
      const remainingTpm = Math.max(0, modelInfo.rateLimit.tpm - currentTpm);
      const remainingRpd = Math.max(0, modelInfo.rateLimit.rpd - currentRpd);

      // Calculate reset times
      const resetRpm = new Date(now.getTime() + (60 * 1000 - (now.getTime() % (60 * 1000))));
      const resetTpm = new Date(now.getTime() + (60 * 1000 - (now.getTime() % (60 * 1000))));
      const resetRpd = new Date(now.getTime() + (24 * 60 * 60 * 1000 - (now.getTime() % (24 * 60 * 60 * 1000))));

      // Calculate overall usage percentage (considering safety buffer)
      const rpmPercentage = currentRpm / (modelInfo.rateLimit.rpm * this.SAFETY_BUFFER);
      const tpmPercentage = currentTpm / (modelInfo.rateLimit.tpm * this.SAFETY_BUFFER);
      const rpdPercentage = currentRpd / (modelInfo.rateLimit.rpd * this.SAFETY_BUFFER);
      
      const overallPercentage = Math.max(rpmPercentage, tpmPercentage, rpdPercentage);
      const canMakeRequest = overallPercentage < 1.0;

      const rateLimitInfo: RateLimitInfo = {
        model,
        limits: {
          rpm: modelInfo.rateLimit.rpm,
          tpm: modelInfo.rateLimit.tpm,
          rpd: modelInfo.rateLimit.rpd,
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
      throw new APIError("Failed to get remaining capacity", undefined, undefined, error);
    }
  }

  async resetCounters(model?: string): Promise<void> {
    try {
      const modelsToReset = model ? [model] : Object.keys(GEMINI_MODELS);

      for (const modelName of modelsToReset) {
        await this.configService.deleteRateLimitKey(`${modelName}:rpm`);
        await this.configService.deleteRateLimitKey(`${modelName}:tpm`);
        await this.configService.deleteRateLimitKey(`${modelName}:rpd`);
        await this.configService.deleteRateLimitKey(`${modelName}:last_request`);
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
      // Initialize counters if they don't exist
      const rpmKey = `${model}:rpm`;
      const tpmKey = `${model}:tpm`;
      const rpdKey = `${model}:rpd`;

      if (!(await this.configService.hasRateLimitKey(rpmKey))) {
        await this.configService.setRateLimitValue(rpmKey, 0, 60 * 1000);
      }
      if (!(await this.configService.hasRateLimitKey(tpmKey))) {
        await this.configService.setRateLimitValue(tpmKey, 0, 60 * 1000);
      }
      if (!(await this.configService.hasRateLimitKey(rpdKey))) {
        await this.configService.setRateLimitValue(rpdKey, 0, 24 * 60 * 60 * 1000);
      }

      logger.debug("Model counters initialized", { model });
    } catch (error) {
      logger.error("Error initializing model counters:", error);
      throw error;
    }
  }

  private async incrementCounter(key: string, value: number, ttl: number): Promise<void> {
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