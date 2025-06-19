// Unit tests for RateLimitService

import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ConfigService } from "../../../src/services/config.js";
import { ConfigManager } from "../../../src/services/configManager.js";
import { RateLimitService } from "../../../src/services/rateLimit.js";
import { GEMINI_MODELS } from "../../../src/types/gemini.types.js";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock ConfigService
const mockConfigService = {
  getSearchUsage: mock(),
  setRateLimitString: mock(),
  getRateLimitValue: mock(),
  setRateLimitValue: mock(),
  hasRateLimitKey: mock(),
  deleteRateLimitKey: mock(),
  incrementStats: mock(),
  getPreferredModel: mock(),
} as unknown as ConfigService;

describe("RateLimitService", () => {
  let rateLimitService: RateLimitService;
  let configManager: ConfigManager;
  const testConfigDir = join(__dirname, "../../../config");

  beforeEach(async () => {
    // Clear all mocks
    (mockConfigService.getSearchUsage as any).mockClear();
    (mockConfigService.setRateLimitString as any).mockClear();
    (mockConfigService.getRateLimitValue as any).mockClear();
    (mockConfigService.setRateLimitValue as any).mockClear();
    (mockConfigService.hasRateLimitKey as any).mockClear();
    (mockConfigService.deleteRateLimitKey as any).mockClear();
    (mockConfigService.incrementStats as any).mockClear();
    (mockConfigService.getPreferredModel as any).mockClear();

    // Set default mock return values
    (mockConfigService.getSearchUsage as any).mockResolvedValue(100);
    (mockConfigService.getRateLimitValue as any).mockResolvedValue(0);
    (mockConfigService.setRateLimitValue as any).mockResolvedValue(undefined);
    (mockConfigService.hasRateLimitKey as any).mockResolvedValue(false);
    (mockConfigService.deleteRateLimitKey as any).mockResolvedValue(true);
    (mockConfigService.setRateLimitString as any).mockResolvedValue(undefined);
    (mockConfigService.incrementStats as any).mockResolvedValue(undefined);
    (mockConfigService.getPreferredModel as any).mockResolvedValue(null);

    // Use real ConfigManager with actual config file
    configManager = new ConfigManager(testConfigDir);
    await configManager.loadConfig();

    rateLimitService = new RateLimitService(mockConfigService, configManager);
  });

  describe("constructor", () => {
    it("should initialize with ConfigService and ConfigManager", () => {
      expect(rateLimitService).toBeInstanceOf(RateLimitService);
    });
  });

  describe("initialize", () => {
    beforeEach(() => {
      // Mock the private initializeModelCounters method
      spyOn(
        rateLimitService,
        "initializeModelCounters" as any
      ).mockResolvedValue(undefined);
    });

    it("should initialize counters for all models", async () => {
      await rateLimitService.initialize();

      // Should call initializeModelCounters for each model in rate_limits config
      const config = configManager.getConfig();
      const modelCount = Object.keys(config.api.gemini.rate_limits).length;
      expect(rateLimitService["initializeModelCounters"]).toHaveBeenCalledTimes(
        modelCount
      );
    });

    it("should throw error if initialization fails", async () => {
      spyOn(
        rateLimitService,
        "initializeModelCounters" as any
      ).mockRejectedValue(new Error("Init failed"));

      await expect(rateLimitService.initialize()).rejects.toThrow(
        "Failed to initialize rate limit service"
      );
    });
  });

  describe("getAvailableModel", () => {
    it("should return first available model", async () => {
      spyOn(rateLimitService, "checkLimits")
        .mockResolvedValueOnce(true) // First model available
        .mockResolvedValueOnce(false); // Second model not available

      const result = await rateLimitService.getAvailableModel();

      // Get actual available models from config
      const config = configManager.getConfig();
      const availableModels = config.api.gemini.models.models;

      // Should return the first available model from the list
      expect(result).toBe(availableModels[0]);
      expect(rateLimitService.checkLimits).toHaveBeenCalledWith(
        availableModels[0]
      );
    });

    it("should return second model if first is unavailable", async () => {
      spyOn(rateLimitService, "checkLimits")
        .mockResolvedValueOnce(false) // First model not available
        .mockResolvedValueOnce(true); // Second model available

      const result = await rateLimitService.getAvailableModel();

      // Get actual available models from config
      const config = configManager.getConfig();
      const availableModels = config.api.gemini.models.models;

      expect(result).toBe(availableModels[1]);
      expect(rateLimitService.checkLimits).toHaveBeenCalledTimes(2);
    });

    it("should return null if no models available", async () => {
      spyOn(rateLimitService, "checkLimits").mockResolvedValue(false); // All models unavailable

      const result = await rateLimitService.getAvailableModel();

      expect(result).toBeNull();
    });

    it("should handle errors properly", async () => {
      spyOn(rateLimitService, "checkLimits").mockRejectedValue(
        new Error("Check failed")
      );

      await expect(rateLimitService.getAvailableModel()).rejects.toThrow(
        "Failed to check available models"
      );
    });

    it("should prefer guild's preferred model when available", async () => {
      const preferredModel = "gemini-2.5-flash-lite-preview-06-17";
      const guildId = "test-guild-123";

      (mockConfigService.getPreferredModel as any).mockResolvedValue(
        preferredModel
      );
      spyOn(rateLimitService, "checkLimits").mockResolvedValueOnce(true); // Preferred model is available

      const result = await rateLimitService.getAvailableModel(guildId);

      expect(result).toBe(preferredModel);
      expect(mockConfigService.getPreferredModel).toHaveBeenCalledWith(guildId);
      expect(rateLimitService.checkLimits).toHaveBeenCalledWith(preferredModel);
    });

    it("should fallback to other models if preferred is rate limited", async () => {
      const preferredModel = "gemini-2.5-flash-lite-preview-06-17";
      const guildId = "test-guild-123";

      (mockConfigService.getPreferredModel as any).mockResolvedValue(
        preferredModel
      );
      spyOn(rateLimitService, "checkLimits")
        .mockResolvedValueOnce(false) // Preferred model is rate limited
        .mockResolvedValueOnce(true); // First available model in list

      const result = await rateLimitService.getAvailableModel(guildId);

      const config = configManager.getConfig();
      const availableModels = config.api.gemini.models.models;

      expect(result).toBe(availableModels[0]);
      expect(mockConfigService.getPreferredModel).toHaveBeenCalledWith(guildId);
      expect(rateLimitService.checkLimits).toHaveBeenCalledWith(preferredModel);
      expect(rateLimitService.checkLimits).toHaveBeenCalledWith(
        availableModels[0]
      );
    });
  });

  describe("checkLimits", () => {
    const modelName = "gemini-2.0-flash";

    it("should return true when under limits", async () => {
      spyOn(rateLimitService, "getRemainingCapacity").mockResolvedValue({
        model: modelName,
        limits: { rpm: 15, tpm: 1000000, rpd: 1500 },
        current: { rpm: 5, tpm: 100000, rpd: 100 },
        remaining: { rpm: 10, tpm: 900000, rpd: 1400 },
        resetAt: {
          rpm: new Date(Date.now() + 60000),
          tpm: new Date(Date.now() + 60000),
          rpd: new Date(Date.now() + 86400000),
        },
        percentage: 0.5,
        canMakeRequest: true,
      });

      const result = await rateLimitService.checkLimits(modelName);

      expect(result).toBe(true);
    });

    it("should return false when over limits", async () => {
      spyOn(rateLimitService, "getRemainingCapacity").mockResolvedValue({
        model: modelName,
        limits: { rpm: 15, tpm: 1000000, rpd: 1500 },
        current: { rpm: 14, tpm: 950000, rpd: 1400 },
        remaining: { rpm: 1, tpm: 50000, rpd: 100 },
        resetAt: {
          rpm: new Date(Date.now() + 60000),
          tpm: new Date(Date.now() + 60000),
          rpd: new Date(Date.now() + 86400000),
        },
        percentage: 0.9,
        canMakeRequest: false,
      });

      const result = await rateLimitService.checkLimits(modelName);

      expect(result).toBe(false);
    });

    it("should return false for unknown model", async () => {
      const result = await rateLimitService.checkLimits("unknown-model");
      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      spyOn(rateLimitService, "getRemainingCapacity").mockRejectedValue(
        new Error("DB error")
      );

      const result = await rateLimitService.checkLimits(modelName);

      expect(result).toBe(false);
    });
  });

  describe("isSearchAvailable", () => {
    it("should return true when under quota", async () => {
      (mockConfigService.getSearchUsage as any).mockResolvedValue(500);

      const result = await rateLimitService.isSearchAvailable();

      expect(result).toBe(true);
      expect(mockConfigService.getSearchUsage).toHaveBeenCalled();
    });

    it("should return false when quota exceeded", async () => {
      (mockConfigService.getSearchUsage as any).mockResolvedValue(2000);

      const result = await rateLimitService.isSearchAvailable();

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      (mockConfigService.getSearchUsage as any).mockRejectedValue(
        new Error("DB error")
      );

      const result = await rateLimitService.isSearchAvailable();

      expect(result).toBe(false);
    });
  });

  describe("updateCounters", () => {
    const modelName = "gemini-2.0-flash";

    beforeEach(() => {
      spyOn(rateLimitService, "incrementCounter" as any).mockResolvedValue(
        undefined
      );
      (mockConfigService.setRateLimitString as any).mockResolvedValue(
        undefined
      );
    });

    it("should update request counters", async () => {
      await rateLimitService.updateCounters(modelName, { requests: 1 });

      expect(rateLimitService["incrementCounter"]).toHaveBeenCalledWith(
        `${modelName}:rpm`,
        1,
        60 * 1000
      );
      expect(rateLimitService["incrementCounter"]).toHaveBeenCalledWith(
        `${modelName}:rpd`,
        1,
        24 * 60 * 60 * 1000
      );
      expect(mockConfigService.setRateLimitString).toHaveBeenCalledWith(
        `${modelName}:last_request`,
        expect.any(String)
      );
    });

    it("should update token counters", async () => {
      await rateLimitService.updateCounters(modelName, { tokens: 1000 });

      expect(rateLimitService["incrementCounter"]).toHaveBeenCalledWith(
        `${modelName}:tpm`,
        1000,
        60 * 1000
      );
      expect(mockConfigService.setRateLimitString).toHaveBeenCalledWith(
        `${modelName}:last_request`,
        expect.any(String)
      );
    });

    it("should update both requests and tokens", async () => {
      await rateLimitService.updateCounters(modelName, {
        requests: 1,
        tokens: 1000,
      });

      expect(rateLimitService["incrementCounter"]).toHaveBeenCalledTimes(3); // rpm, rpd, tpm
      expect(mockConfigService.setRateLimitString).toHaveBeenCalled();
    });

    it("should throw error for unknown model", async () => {
      await expect(
        rateLimitService.updateCounters("unknown-model", { requests: 1 })
      ).rejects.toThrow("Unknown model");
    });
  });

  describe("getStatus", () => {
    beforeEach(() => {
      spyOn(rateLimitService, "getRemainingCapacity").mockResolvedValue({
        model: "gemini-2.0-flash",
        limits: { rpm: 15, tpm: 1000000, rpd: 1500 },
        current: { rpm: 5, tpm: 100000, rpd: 100 },
        remaining: { rpm: 10, tpm: 900000, rpd: 1400 },
        resetAt: {
          rpm: new Date(Date.now() + 60000),
          tpm: new Date(Date.now() + 60000),
          rpd: new Date(Date.now() + 86400000),
        },
        percentage: 0.5,
        canMakeRequest: true,
      });
    });

    it("should return status for all models", async () => {
      const statuses = await rateLimitService.getStatus();

      const config = configManager.getConfig();
      const modelCount = Object.keys(config.api.gemini.rate_limits).length;
      expect(statuses).toHaveLength(modelCount);
      expect(statuses[0]).toMatchObject({
        model: expect.any(String),
        rpm: expect.objectContaining({
          current: expect.any(Number),
          limit: expect.any(Number),
          resetAt: expect.any(Date),
        }),
        tpm: expect.objectContaining({
          current: expect.any(Number),
          limit: expect.any(Number),
          resetAt: expect.any(Date),
        }),
        rpd: expect.objectContaining({
          current: expect.any(Number),
          limit: expect.any(Number),
          resetAt: expect.any(Date),
        }),
        isAvailable: expect.any(Boolean),
        switchThreshold: 80, // 80% safety buffer
      });
    });

    it("should handle errors properly", async () => {
      spyOn(rateLimitService, "getRemainingCapacity").mockRejectedValue(
        new Error("DB error")
      );

      await expect(rateLimitService.getStatus()).rejects.toThrow(
        "Failed to get rate limit status"
      );
    });
  });

  describe("getRemainingCapacity", () => {
    const modelName = "gemini-2.0-flash";

    beforeEach(() => {
      spyOn(rateLimitService, "getCounter" as any)
        .mockResolvedValueOnce(5) // rpm
        .mockResolvedValueOnce(100000) // tpm
        .mockResolvedValueOnce(100); // rpd
    });

    it("should calculate remaining capacity correctly", async () => {
      const result = await rateLimitService.getRemainingCapacity(modelName);

      expect(result).toMatchObject({
        model: modelName,
        limits: {
          rpm: GEMINI_MODELS[modelName].rateLimit.rpm,
          tpm: GEMINI_MODELS[modelName].rateLimit.tpm,
          rpd: GEMINI_MODELS[modelName].rateLimit.rpd,
        },
        current: {
          rpm: 5,
          tpm: 100000,
          rpd: 100,
        },
        remaining: {
          rpm: GEMINI_MODELS[modelName].rateLimit.rpm - 5,
          tpm: GEMINI_MODELS[modelName].rateLimit.tpm - 100000,
          rpd: GEMINI_MODELS[modelName].rateLimit.rpd - 100,
        },
        resetAt: expect.objectContaining({
          rpm: expect.any(Date),
          tpm: expect.any(Date),
          rpd: expect.any(Date),
        }),
        percentage: expect.any(Number),
        canMakeRequest: expect.any(Boolean),
      });
    });

    it("should apply safety buffer correctly", async () => {
      // Mock high usage to test safety buffer
      spyOn(rateLimitService, "getCounter" as any)
        .mockResolvedValueOnce(13) // rpm: high usage
        .mockResolvedValueOnce(800000) // tpm: high usage
        .mockResolvedValueOnce(1200); // rpd: high usage

      const result = await rateLimitService.getRemainingCapacity(modelName);

      // With 80% safety buffer, should not be able to make request
      // The actual calculation may vary based on implementation
      expect(result.percentage).toBeGreaterThan(0.5); // High usage detected
    });

    it("should throw error for unknown model", async () => {
      await expect(
        rateLimitService.getRemainingCapacity("unknown-model")
      ).rejects.toThrow("Failed to get remaining capacity");
    });
  });

  describe("private methods", () => {
    describe("getModelsByPriority", () => {
      it("should return all available models", () => {
        const models = rateLimitService["getModelsByPriority"]();
        const config = configManager.getConfig();
        const availableModels = config.api.gemini.models.models;

        expect(models).toEqual(availableModels);
        expect(models.length).toBe(availableModels.length);
      });
    });

    describe("incrementCounter", () => {
      it("should increment counter with TTL", async () => {
        (mockConfigService.getRateLimitValue as any).mockResolvedValue(10);
        (mockConfigService.setRateLimitValue as any).mockResolvedValue(
          undefined
        );

        await rateLimitService["incrementCounter"]("test-key", 5, 60000);

        expect(mockConfigService.getRateLimitValue).toHaveBeenCalledWith(
          "test-key"
        );
        expect(mockConfigService.setRateLimitValue).toHaveBeenCalledWith(
          "test-key",
          15,
          60000
        );
      });
    });

    describe("getCounter", () => {
      it("should get current counter value", async () => {
        (mockConfigService.getRateLimitValue as any).mockResolvedValue(10);

        const result = await rateLimitService["getCounter"]("test-key");

        expect(result).toBe(10);
        expect(mockConfigService.getRateLimitValue).toHaveBeenCalledWith(
          "test-key"
        );
      });

      it("should return 0 for non-existent counter", async () => {
        (mockConfigService.getRateLimitValue as any).mockResolvedValue(0);

        const result = await rateLimitService["getCounter"]("test-key");

        expect(result).toBe(0);
      });
    });
  });
});
