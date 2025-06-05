// Unit tests for Gemini service

import { ConfigManager } from "../../../src/services/configManager.js";
import { GeminiService } from "../../../src/services/gemini.js";
import { APIError } from "../../../src/utils/errors.js";

// Mock the @google/genai module
jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn(),
    },
    files: {
      upload: jest.fn(),
      delete: jest.fn(),
    },
  })),
  FunctionCallingConfigMode: {
    AUTO: "AUTO",
  },
}));

// Mock the ConfigManager
jest.mock("../../../src/services/configManager.js");

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

  describe("initialize", () => {
    it("should initialize successfully", async () => {
      const mockResponse = { text: "test", functionCalls: null };
      const { GoogleGenAI } = require("@google/genai");
      const mockClient = new GoogleGenAI();
      mockClient.models.generateContent.mockResolvedValue(mockResponse);

      await expect(geminiService.initialize()).resolves.not.toThrow();
    });

    it("should handle initialization errors", async () => {
      const { GoogleGenAI } = require("@google/genai");
      const mockClient = new GoogleGenAI();
      mockClient.models.generateContent.mockRejectedValue(
        new Error("Connection failed")
      );

      await expect(geminiService.initialize()).rejects.toThrow(APIError);
    });
  });

  describe("generateContent", () => {
    beforeEach(async () => {
      const { GoogleGenAI } = require("@google/genai");
      const mockClient = new GoogleGenAI();
      mockClient.models.generateContent.mockResolvedValue({
        text: "init",
        functionCalls: null,
      });
      await geminiService.initialize();
    });

    it("should generate text content without function calling", async () => {
      const mockResponse = {
        text: "Hello, this is a response!",
        functionCalls: null,
        usage: {
          promptTokens: 10,
          candidatesTokenCount: 15,
          totalTokenCount: 25,
        },
      };

      const { GoogleGenAI } = require("@google/genai");
      const mockClient = new GoogleGenAI();
      mockClient.models.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateContent({
        model: "gemini-2.0-flash",
        systemPrompt: "You are a helpful assistant",
        userMessage: "Hello",
        functionCallingEnabled: false,
      });

      expect(result.text).toBe("Hello, this is a response!");
      expect(result.functionCalls).toBeUndefined();
      expect(result.modelUsed).toBe("gemini-2.0-flash");
    });

    it("should handle function calling response", async () => {
      const mockResponse = {
        text: "",
        functionCalls: [
          {
            name: "search_web",
            args: { query: "test query", region: "JP" },
          },
        ],
      };

      const { GoogleGenAI } = require("@google/genai");
      const mockClient = new GoogleGenAI();
      mockClient.models.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateContent({
        model: "gemini-2.0-flash",
        systemPrompt: "You are a helpful assistant",
        userMessage: "Search for something",
        functionCallingEnabled: true,
      });

      expect(result.functionCalls).toHaveLength(1);
      expect(result.functionCalls![0].name).toBe("search_web");
      expect(result.functionCalls![0].args.query).toBe("test query");
    });

    it("should handle API errors", async () => {
      const { GoogleGenAI } = require("@google/genai");
      const mockClient = new GoogleGenAI();
      mockClient.models.generateContent.mockRejectedValue(
        new Error("429 Rate limit exceeded")
      );

      await expect(
        geminiService.generateContent({
          model: "gemini-2.0-flash",
          systemPrompt: "You are a helpful assistant",
          userMessage: "Hello",
          functionCallingEnabled: false,
        })
      ).rejects.toThrow(APIError);
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

  describe("file operations", () => {
    it("should upload file successfully", async () => {
      const mockFileResult = {
        name: "test-file",
        displayName: "Test File",
        mimeType: "image/png",
        sizeBytes: "1024",
        createTime: "2025-01-01T00:00:00Z",
        updateTime: "2025-01-01T00:00:00Z",
        uri: "gs://test-bucket/test-file",
        state: "ACTIVE",
      };

      const { GoogleGenAI } = require("@google/genai");
      const mockClient = new GoogleGenAI();
      mockClient.files.upload.mockResolvedValue(mockFileResult);

      const testBuffer = Buffer.from("test file content");
      const result = await geminiService.uploadFile(
        testBuffer,
        "image/png",
        "Test File"
      );

      expect(result.name).toBe("test-file");
      expect(result.mimeType).toBe("image/png");
      expect(result.state).toBe("ACTIVE");
    });

    it("should delete file successfully", async () => {
      const { GoogleGenAI } = require("@google/genai");
      const mockClient = new GoogleGenAI();
      mockClient.files.delete.mockResolvedValue({});

      await expect(
        geminiService.deleteFile("gs://test-bucket/test-file")
      ).resolves.not.toThrow();

      expect(mockClient.files.delete).toHaveBeenCalledWith({
        name: "gs://test-bucket/test-file",
      });
    });
  });
});
