// Unit tests for Gemini service

import { GeminiService } from "../../../src/services/gemini.js";
import { ConfigManager } from "../../../src/services/configManager.js";
import { APIError } from "../../../src/utils/errors.js";

describe("GeminiService", () => {
  let geminiService: GeminiService;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    // Set environment variable
    process.env.GEMINI_API_KEY = "test-api-key";

    // Create mock ConfigManager
    mockConfigManager = {
      getConfig: jest.fn().mockReturnValue({
        api: {
          gemini: {
            models: {
              primary: "gemini-2.0-flash",
              fallback: "gemini-2.5-flash-preview-0520",
            },
          },
        },
      }),
      getSearchFunctionDeclaration: jest.fn().mockReturnValue({
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
      getCharacterCountFunctionDeclaration: jest.fn().mockReturnValue({
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
    jest.clearAllMocks();
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
      expect(models).toContain("gemini-2.5-flash-preview-0520");
    });

    it("should switch models successfully", () => {
      expect(geminiService.getCurrentModel()).toBe("gemini-2.0-flash");

      geminiService.switchModel("gemini-2.5-flash-preview-0520");
      expect(geminiService.getCurrentModel()).toBe(
        "gemini-2.5-flash-preview-0520"
      );
    });

    it("should throw error for unsupported model", () => {
      expect(() => geminiService.switchModel("invalid-model")).toThrow(
        "Unsupported model: invalid-model"
      );
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