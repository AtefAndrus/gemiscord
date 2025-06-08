// Unit tests for Gemini service

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { GeminiService } from "../../../src/services/gemini.js";

describe("GeminiService", () => {
  let geminiService: GeminiService;
  let mockConfigManager: any;

  beforeEach(() => {
    // Set environment variable
    process.env.GEMINI_API_KEY = "test-api-key";

    // Create mock ConfigManager
    mockConfigManager = {
      getConfig: mock().mockReturnValue({
        api: {
          gemini: {
            models: {
              primary: "gemini-2.0-flash",
              fallback: "gemini-2.5-flash-preview-05-20",
              available: ["gemini-2.5-flash-preview-05-20", "gemini-2.0-flash"],
            },
          },
        },
      }),
      getSearchFunctionDeclaration: mock().mockReturnValue({
        functionDeclarations: [
          {
            name: "search_web",
            description: "Search the web",
            parameters: {
              type: "OBJECT",
              properties: {
                query: { type: "STRING", description: "Search query" },
                region: { type: "STRING", description: "Search region" },
              },
              required: ["query"],
            },
          },
        ],
      }),
      getCharacterCountFunctionDeclaration: mock().mockReturnValue({
        functionDeclarations: [
          {
            name: "count_characters",
            description: "Count characters",
            parameters: {
              type: "OBJECT",
              properties: {
                message: { type: "STRING", description: "Message to count" },
              },
              required: ["message"],
            },
          },
        ],
      }),
    } as any;

    geminiService = new GeminiService(mockConfigManager);
  });

  afterEach(() => {
    // Clear all mocks individually
    Object.values(mockConfigManager).forEach((mockFn) => {
      if (typeof mockFn === "function") {
        (mockFn as any).mockClear();
      }
    });
    delete process.env.GEMINI_API_KEY;
  });

  describe("constructor", () => {
    it("should initialize with config manager", () => {
      expect(geminiService).toBeInstanceOf(GeminiService);
      expect(geminiService.getCurrentModel()).toBe("gemini-2.0-flash");
    });

    it("should throw error without API key", () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => new GeminiService(mockConfigManager)).toThrow(
        "GEMINI_API_KEY is not set"
      );
    });
  });

  describe("model management", () => {
    it("should return available models", () => {
      const models = geminiService.getAvailableModels();
      expect(models).toContain("gemini-2.0-flash");
      expect(models).toContain("gemini-2.5-flash-preview-05-20");
    });

    it("should switch models successfully", () => {
      expect(geminiService.getCurrentModel()).toBe("gemini-2.0-flash");

      geminiService.switchModel("gemini-2.5-flash-preview-05-20");
      expect(geminiService.getCurrentModel()).toBe(
        "gemini-2.5-flash-preview-05-20"
      );
    });

    it("should throw error for unsupported model", () => {
      expect(() => geminiService.switchModel("invalid-model")).toThrow(
        "Unsupported model: invalid-model"
      );
    });
  });

  describe("caching functionality", () => {
    it("should handle Japanese characters in cache keys", () => {
      // Test that Japanese characters don't cause InvalidCharacterError
      const japaneseMessage = "こんにちは、世界！今日の天気はどうですか？";
      const systemPrompt = "あなたは親切なAIアシスタントです。";

      // This should not throw an InvalidCharacterError
      expect(() => {
        // Access the private method through any cast for testing
        const service = geminiService as any;
        const cacheKey = service.createCacheKey({
          model: "gemini-2.0-flash",
          systemPrompt,
          userMessage: japaneseMessage,
          functionCallingEnabled: false,
        });

        // Verify the cache key is a valid string
        expect(typeof cacheKey).toBe("string");
        expect(cacheKey.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it("should generate consistent cache keys for same input", () => {
      const service = geminiService as any;
      const options = {
        model: "gemini-2.0-flash",
        systemPrompt: "Test system prompt",
        userMessage: "Test user message",
        functionCallingEnabled: false,
      };

      const key1 = service.createCacheKey(options);
      const key2 = service.createCacheKey(options);

      expect(key1).toBe(key2);
    });

    it("should generate different cache keys for different inputs", () => {
      const service = geminiService as any;
      const options1 = {
        model: "gemini-2.0-flash",
        systemPrompt: "Test system prompt",
        userMessage: "Test user message 1",
        functionCallingEnabled: false,
      };

      const options2 = {
        model: "gemini-2.0-flash",
        systemPrompt: "Test system prompt",
        userMessage: "Test user message 2",
        functionCallingEnabled: false,
      };

      const key1 = service.createCacheKey(options1);
      const key2 = service.createCacheKey(options2);

      expect(key1).not.toBe(key2);
    });
  });

  describe("executeFunction", () => {
    it("should execute character count function", async () => {
      const result = await geminiService.executeFunction("count_characters", {
        message: "Hello world",
      });

      expect(result).toEqual({
        character_count: 11,
        is_within_discord_limit: true,
        requires_compression: false,
        estimated_messages_if_split: 1,
      });
    });

    it("should handle long messages for character count", async () => {
      const longMessage = "a".repeat(3000);
      const result = await geminiService.executeFunction("count_characters", {
        message: longMessage,
      });

      expect(result).toEqual({
        character_count: 3000,
        is_within_discord_limit: false,
        requires_compression: true,
        estimated_messages_if_split: 2,
      });
    });

    it("should throw error for search function", async () => {
      await expect(
        geminiService.executeFunction("search_web", { query: "test" })
      ).rejects.toThrow("Search function should be handled by SearchService");
    });

    it("should throw error for unknown function", async () => {
      await expect(
        geminiService.executeFunction("unknown_function", {})
      ).rejects.toThrow("Unknown function: unknown_function");
    });

    it("should validate character count parameters", async () => {
      await expect(
        geminiService.executeFunction("count_characters", { message: 123 })
      ).rejects.toThrow("Invalid message parameter for character count");
    });
  });
});
