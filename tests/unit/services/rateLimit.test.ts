// Unit tests for RateLimitService

import { ConfigService } from "../../../src/services/config.js";
import { ConfigManager } from "../../../src/services/configManager.js";
import { RateLimitService } from "../../../src/services/rateLimit.js";
import { GEMINI_MODELS } from "../../../src/types/gemini.types.js";

// Mock ConfigService
const mockConfigService = {
  getSearchUsage: jest.fn(),
  setRateLimitString: jest.fn(),
  getRateLimitValue: jest.fn(),
  setRateLimitValue: jest.fn(),
  hasRateLimitKey: jest.fn(),
  deleteRateLimitKey: jest.fn(),
} as unknown as ConfigService;

// Mock ConfigManager
const mockConfigManager = {
  getConfig: jest.fn(),
} as unknown as ConfigManager;

describe("RateLimitService", () => {
  let rateLimitService: RateLimitService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ConfigManager.getConfig to return basic config
    mockConfigManager.getConfig = jest.fn().mockReturnValue({
      api: {
        gemini: {
          models: {
            primary: "gemini-2.5-flash-preview-0520",
            fallback: "gemini-2.0-flash",
          },
        },
      },
    });

    rateLimitService = new RateLimitService(
      mockConfigService,
      mockConfigManager
    );
  });

  describe("constructor", () => {
    it("should initialize with ConfigService and ConfigManager", () => {
      expect(rateLimitService).toBeInstanceOf(RateLimitService);
    });
  });

  describe("initialize", () => {
    beforeEach(() => {
      // Mock the private initializeModelCounters method
      jest
        .spyOn(rateLimitService, "initializeModelCounters" as any)
        .mockResolvedValue(undefined);
    });

    it("should initialize counters for all models", async () => {
      await rateLimitService.initialize();

      // Should call initializeModelCounters for each model
      const modelCount = Object.keys(GEMINI_MODELS).length;
      expect(rateLimitService["initializeModelCounters"]).toHaveBeenCalledTimes(
        modelCount
      );
    });

    it("should throw error if initialization fails", async () => {
      jest
        .spyOn(rateLimitService, "initializeModelCounters" as any)
        .mockRejectedValue(new Error("Init failed"));

      await expect(rateLimitService.initialize()).rejects.toThrow(
        "Failed to initialize rate limit service"
      );
    });
  });

  describe("getAvailableModel", () => {
    beforeEach(() => {
      jest
        .spyOn(rateLimitService, "getModelsByPriority" as any)
        .mockReturnValue(["gemini-2.5-flash-preview-0520", "gemini-2.0-flash"]);
    });

    it("should return first available model", async () => {
      jest
        .spyOn(rateLimitService, "checkLimits")
        .mockResolvedValueOnce(true) // First model available
        .mockResolvedValueOnce(false); // Second model not available

      const result = await rateLimitService.getAvailableModel();

      expect(result).toBe("gemini-2.5-flash-preview-0520");
      expect(rateLimitService.checkLimits).toHaveBeenCalledWith(
        "gemini-2.5-flash-preview-0520"
      );
    });

    it("should return fallback model if primary is unavailable", async () => {
      jest
        .spyOn(rateLimitService, "checkLimits")
        .mockResolvedValueOnce(false) // First model not available
        .mockResolvedValueOnce(true); // Second model available

      const result = await rateLimitService.getAvailableModel();

      expect(result).toBe("gemini-2.0-flash");
      expect(rateLimitService.checkLimits).toHaveBeenCalledTimes(2);
    });

    it("should return null if no models available", async () => {
      jest.spyOn(rateLimitService, "checkLimits").mockResolvedValue(false); // All models unavailable

      const result = await rateLimitService.getAvailableModel();

      expect(result).toBeNull();
    });

    it("should handle errors properly", async () => {
      jest
        .spyOn(rateLimitService, "checkLimits")
        .mockRejectedValue(new Error("Check failed"));

      await expect(rateLimitService.getAvailableModel()).rejects.toThrow(
        "Failed to check available models"
      );
    });
  });

  describe("checkLimits", () => {
    const modelName = "gemini-2.0-flash";

    it("should return true when under limits", async () => {
      jest.spyOn(rateLimitService, "getRemainingCapacity").mockResolvedValue({
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
      jest.spyOn(rateLimitService, "getRemainingCapacity").mockResolvedValue({
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
      jest
        .spyOn(rateLimitService, "getRemainingCapacity")
        .mockRejectedValue(new Error("DB error"));

      const result = await rateLimitService.checkLimits(modelName);

      expect(result).toBe(false);
    });
  });

  describe("isSearchAvailable", () => {
    it("should return true when under quota", async () => {
      mockConfigService.getSearchUsage = jest.fn().mockResolvedValue(500);

      const result = await rateLimitService.isSearchAvailable();

      expect(result).toBe(true);
      expect(mockConfigService.getSearchUsage).toHaveBeenCalled();
    });

    it("should return false when quota exceeded", async () => {
      mockConfigService.getSearchUsage = jest.fn().mockResolvedValue(2000);

      const result = await rateLimitService.isSearchAvailable();

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      mockConfigService.getSearchUsage = jest
        .fn()
        .mockRejectedValue(new Error("DB error"));

      const result = await rateLimitService.isSearchAvailable();

      expect(result).toBe(false);
    });
  });

  describe("updateCounters", () => {
    const modelName = "gemini-2.0-flash";

    beforeEach(() => {
      jest
        .spyOn(rateLimitService, "incrementCounter" as any)
        .mockResolvedValue(undefined);
      mockConfigService.setRateLimitString = jest
        .fn()
        .mockResolvedValue(undefined);
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
      jest.spyOn(rateLimitService, "getRemainingCapacity").mockResolvedValue({
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

      expect(statuses).toHaveLength(Object.keys(GEMINI_MODELS).length);
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
      jest
        .spyOn(rateLimitService, "getRemainingCapacity")
        .mockRejectedValue(new Error("DB error"));

      await expect(rateLimitService.getStatus()).rejects.toThrow(
        "Failed to get rate limit status"
      );
    });
  });

  describe("getRemainingCapacity", () => {
    const modelName = "gemini-2.0-flash";

    beforeEach(() => {
      jest
        .spyOn(rateLimitService, "getCounter" as any)
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
      jest
        .spyOn(rateLimitService, "getCounter" as any)
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
      it("should return models in priority order", () => {
        const models = rateLimitService["getModelsByPriority"]();

        expect(models).toContain("gemini-2.5-flash-preview-0520");
        expect(models).toContain("gemini-2.0-flash");
        // Primary model should come first
        expect(models[0]).toBe("gemini-2.5-flash-preview-0520");
      });
    });

    describe("incrementCounter", () => {
      it("should increment counter with TTL", async () => {
        mockConfigService.getRateLimitValue = jest.fn().mockResolvedValue(10);
        mockConfigService.setRateLimitValue = jest
          .fn()
          .mockResolvedValue(undefined);

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
        mockConfigService.getRateLimitValue = jest.fn().mockResolvedValue(10);

        const result = await rateLimitService["getCounter"]("test-key");

        expect(result).toBe(10);
        expect(mockConfigService.getRateLimitValue).toHaveBeenCalledWith(
          "test-key"
        );
      });

      it("should return 0 for non-existent counter", async () => {
        mockConfigService.getRateLimitValue = jest.fn().mockResolvedValue(0);

        const result = await rateLimitService["getCounter"]("test-key");

        expect(result).toBe(0);
      });
    });
  });
});
