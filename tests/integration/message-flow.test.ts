// E2E Integration tests for complete message flow

import { MessageCreateHandler } from "../../src/handlers/messageCreate.js";
import { GeminiService } from "../../src/services/gemini.js";
import { BraveSearchService } from "../../src/services/braveSearch.js";
import { RateLimitService } from "../../src/services/rateLimit.js";
import { ConfigService } from "../../src/services/config.js";
import { ConfigManager } from "../../src/services/configManager.js";
import { MessageProcessor } from "../../src/services/messageProcessor.js";
import { ExtendedClient } from "../../src/types/index.js";

// Mock Discord.js components
const mockMessage = {
  content: "",
  author: { bot: false, id: "user123", username: "TestUser" },
  guild: { id: "guild123", name: "Test Guild" },
  channel: {
    id: "channel123",
    name: "test-channel",
    type: 0,
    sendTyping: jest.fn(),
    send: jest.fn(),
  },
  client: { user: { id: "bot123" } },
  mentions: { users: new Map() },
  reply: jest.fn(),
};

const mockClient = {
  user: { id: "bot123" },
} as ExtendedClient;

// Mock external services
// Create a global mock for configService
const globalMockConfigService = {
  isMentionEnabled: jest.fn(),
  isSearchEnabled: jest.fn(),
  isResponseChannel: jest.fn(),
  incrementStats: jest.fn(),
};

// Mock the configService import from bot.js
jest.mock("../../src/bot.js", () => ({
  configService: globalMockConfigService,
}));

jest.mock("../../src/services/gemini.js");
jest.mock("../../src/services/braveSearch.js");
jest.mock("../../src/services/rateLimit.js");
jest.mock("../../src/services/config.js");
jest.mock("../../src/services/configManager.js");

const MockedGeminiService = GeminiService as jest.MockedClass<
  typeof GeminiService
>;
const MockedBraveSearchService = BraveSearchService as jest.MockedClass<
  typeof BraveSearchService
>;
const MockedRateLimitService = RateLimitService as jest.MockedClass<
  typeof RateLimitService
>;
const MockedConfigManager = ConfigManager as jest.MockedClass<
  typeof ConfigManager
>;

describe("Message Flow Integration Tests", () => {
  let handler: MessageCreateHandler;
  let mockGeminiService: jest.Mocked<GeminiService>;
  let mockBraveSearchService: jest.Mocked<BraveSearchService>;
  let mockRateLimitService: jest.Mocked<RateLimitService>;
  let mockConfigService: any;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset message mock
    mockMessage.content = "";
    mockMessage.mentions.users.clear();
    mockMessage.reply = jest.fn();
    mockMessage.channel.sendTyping = jest.fn();

    // Use the global mock
    mockConfigService = globalMockConfigService;

    mockConfigManager = new MockedConfigManager() as jest.Mocked<ConfigManager>;
    mockGeminiService = new MockedGeminiService(
      mockConfigManager
    ) as jest.Mocked<GeminiService>;
    mockBraveSearchService = new MockedBraveSearchService(
      {} as any
    ) as jest.Mocked<BraveSearchService>;
    mockRateLimitService = new MockedRateLimitService(
      {} as any,
      mockConfigManager
    ) as jest.Mocked<RateLimitService>;

    // Mock ConfigManager
    mockConfigManager.loadConfig = jest.fn().mockResolvedValue(undefined);
    mockConfigManager.getBaseSystemPrompt = jest
      .fn()
      .mockReturnValue("You are a helpful AI assistant.");

    // Mock service initialization
    mockGeminiService.initialize = jest.fn().mockResolvedValue(undefined);
    mockBraveSearchService.initialize = jest.fn().mockResolvedValue(undefined);
    mockRateLimitService.initialize = jest.fn().mockResolvedValue(undefined);

    // Create handler and override services
    handler = new MessageCreateHandler();
    (handler as any).geminiService = mockGeminiService;
    (handler as any).braveSearchService = mockBraveSearchService;
    (handler as any).rateLimitService = mockRateLimitService;
    (handler as any).configManager = mockConfigManager;
  });

  describe("Mention Response Flow", () => {
    beforeEach(() => {
      // Setup mention
      mockMessage.content = "@bot123 Hello, how are you?";
      mockMessage.mentions.users.set("bot123", {} as any);

      // Mock config service responses
      mockConfigService.isMentionEnabled = jest.fn().mockResolvedValue(true);
      mockConfigService.isSearchEnabled = jest.fn().mockResolvedValue(true);
      mockConfigService.incrementStats = jest.fn().mockResolvedValue(undefined);
    });

    it("should handle simple text response without function calling", async () => {
      // Mock rate limit check
      mockRateLimitService.getAvailableModel = jest
        .fn()
        .mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = jest
        .fn()
        .mockResolvedValue(true);
      mockRateLimitService.updateCounters = jest
        .fn()
        .mockResolvedValue(undefined);

      // Mock Gemini response (no function call)
      mockGeminiService.switchModel = jest.fn();
      mockGeminiService.generateContent = jest.fn().mockResolvedValue({
        text: "Hello! I'm doing well, thank you for asking. How can I help you today?",
        functionCalls: [],
        usage: { totalTokens: 50 },
      });

      await handler.execute(mockClient, mockMessage as any);

      expect(mockMessage.reply).toHaveBeenCalledWith({
        content:
          "Hello! I'm doing well, thank you for asking. How can I help you today?",
        allowedMentions: { repliedUser: true },
      });
      expect(mockGeminiService.generateContent).toHaveBeenCalledTimes(1);
      expect(mockBraveSearchService.search).not.toHaveBeenCalled();
    });

    it("should handle search function call and final response", async () => {
      mockMessage.content = "@bot123 What's the weather like in Tokyo today?";

      // Mock rate limit checks
      mockRateLimitService.getAvailableModel = jest
        .fn()
        .mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = jest
        .fn()
        .mockResolvedValue(true);
      mockRateLimitService.updateCounters = jest
        .fn()
        .mockResolvedValue(undefined);

      // Mock Gemini first response (with function call)
      mockGeminiService.switchModel = jest.fn();
      mockGeminiService.generateContent = jest
        .fn()
        .mockResolvedValueOnce({
          text: null,
          functionCalls: [
            {
              name: "search_web",
              args: { query: "Tokyo weather today", region: "JP" },
            },
          ],
          usage: { totalTokens: 30 },
        })
        .mockResolvedValueOnce({
          text: "According to the latest weather information, Tokyo is experiencing sunny weather with a temperature of 25°C today.",
          functionCalls: [],
          usage: { totalTokens: 80 },
        });

      // Mock search service
      mockBraveSearchService.search = jest.fn().mockResolvedValue({
        query: "Tokyo weather today",
        region: "JP",
        totalResults: 3,
        searchTime: 500,
        results: [
          {
            title: "Tokyo Weather Today",
            url: "https://weather.com/tokyo",
            description: "Sunny, 25°C in Tokyo today",
          },
        ],
      });
      mockBraveSearchService.formatResultsForDiscord = jest
        .fn()
        .mockReturnValue("🔍 Tokyo weather: Sunny, 25°C");

      await handler.execute(mockClient, mockMessage as any);

      expect(mockGeminiService.generateContent).toHaveBeenCalledTimes(2);
      expect(mockBraveSearchService.search).toHaveBeenCalledWith({
        query: "Tokyo weather today",
        region: "JP",
        count: 5,
      });
      expect(mockMessage.reply).toHaveBeenCalledWith({
        content:
          "According to the latest weather information, Tokyo is experiencing sunny weather with a temperature of 25°C today.",
        allowedMentions: { repliedUser: true },
      });
    });

    it("should handle character count function call", async () => {
      mockMessage.content =
        "@bot123 Count the characters in this text: Hello World";

      // Mock rate limit checks
      mockRateLimitService.getAvailableModel = jest
        .fn()
        .mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = jest
        .fn()
        .mockResolvedValue(false);
      mockRateLimitService.updateCounters = jest
        .fn()
        .mockResolvedValue(undefined);

      // Mock Gemini responses
      mockGeminiService.switchModel = jest.fn();
      mockGeminiService.generateContent = jest
        .fn()
        .mockResolvedValueOnce({
          text: null,
          functionCalls: [
            {
              name: "count_characters",
              args: { text: "Hello World" },
            },
          ],
          usage: { totalTokens: 25 },
        })
        .mockResolvedValueOnce({
          text: "The text 'Hello World' contains 11 characters.",
          functionCalls: [],
          usage: { totalTokens: 40 },
        });

      // Mock function execution
      mockGeminiService.executeFunction = jest.fn().mockResolvedValue({
        characterCount: 11,
        text: "Hello World",
      });

      await handler.execute(mockClient, mockMessage as any);

      expect(mockGeminiService.executeFunction).toHaveBeenCalledWith(
        "count_characters",
        { text: "Hello World" }
      );
      expect(mockGeminiService.generateContent).toHaveBeenCalledTimes(2);
      expect(mockMessage.reply).toHaveBeenCalledWith({
        content: "The text 'Hello World' contains 11 characters.",
        allowedMentions: { repliedUser: true },
      });
    });

    it("should handle rate limit exceeded", async () => {
      // Mock rate limit exceeded
      mockRateLimitService.getAvailableModel = jest
        .fn()
        .mockResolvedValue(null);

      await handler.execute(mockClient, mockMessage as any);

      expect(mockMessage.reply).toHaveBeenCalledWith({
        content:
          "申し訳ございません。現在利用量が上限に達しています。しばらくしてから再度お試しください。",
        allowedMentions: { repliedUser: true },
      });
      expect(mockGeminiService.generateContent).not.toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      // Mock rate limit check
      mockRateLimitService.getAvailableModel = jest
        .fn()
        .mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = jest
        .fn()
        .mockResolvedValue(true);

      // Mock Gemini error
      mockGeminiService.switchModel = jest.fn();
      mockGeminiService.generateContent = jest
        .fn()
        .mockRejectedValue(new Error("API Error"));

      await handler.execute(mockClient, mockMessage as any);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        "申し訳ございません。エラーが発生しました。しばらくしてから再度お試しください。"
      );
    });
  });

  describe("Auto Response Flow", () => {
    beforeEach(() => {
      mockMessage.content = "What's the latest news?";
      // No mention, but auto-response channel

      mockConfigService.isMentionEnabled = jest.fn().mockResolvedValue(true);
      mockConfigService.isSearchEnabled = jest.fn().mockResolvedValue(true);
      mockConfigService.isResponseChannel = jest.fn().mockResolvedValue(true);
      mockConfigService.incrementStats = jest.fn().mockResolvedValue(undefined);
    });

    it("should handle auto-response in configured channel", async () => {
      // Mock rate limit check
      mockRateLimitService.getAvailableModel = jest
        .fn()
        .mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = jest
        .fn()
        .mockResolvedValue(true);
      mockRateLimitService.updateCounters = jest
        .fn()
        .mockResolvedValue(undefined);

      // Mock Gemini response
      mockGeminiService.switchModel = jest.fn();
      mockGeminiService.generateContent = jest.fn().mockResolvedValue({
        text: "Here are today's top news headlines...",
        functionCalls: [],
        usage: { totalTokens: 60 },
      });

      await handler.execute(mockClient, mockMessage as any);

      expect(mockConfigService.isResponseChannel).toHaveBeenCalledWith(
        "guild123",
        "channel123"
      );
      expect(mockMessage.reply).toHaveBeenCalledWith({
        content: "Here are today's top news headlines...",
        allowedMentions: { repliedUser: true },
      });
    });

    it("should not respond in non-configured channel", async () => {
      mockConfigService.isResponseChannel = jest.fn().mockResolvedValue(false);

      await handler.execute(mockClient, mockMessage as any);

      expect(mockGeminiService.generateContent).not.toHaveBeenCalled();
      expect(mockMessage.reply).not.toHaveBeenCalled();
    });
  });

  describe("Message Length Handling", () => {
    beforeEach(() => {
      mockMessage.content = "@bot123 Tell me a very long story";
      mockMessage.mentions.users.set("bot123", {} as any);

      mockConfigService.isMentionEnabled = jest.fn().mockResolvedValue(true);
      mockConfigService.isSearchEnabled = jest.fn().mockResolvedValue(true);
      mockConfigService.incrementStats = jest.fn().mockResolvedValue(undefined);
    });

    it("should split long messages correctly", async () => {
      // Mock rate limit check
      mockRateLimitService.getAvailableModel = jest
        .fn()
        .mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = jest
        .fn()
        .mockResolvedValue(true);
      mockRateLimitService.updateCounters = jest
        .fn()
        .mockResolvedValue(undefined);

      // Mock very long response
      const longResponse = "Very long story... ".repeat(200); // Over 2000 chars
      mockGeminiService.switchModel = jest.fn();
      mockGeminiService.generateContent = jest.fn().mockResolvedValue({
        text: longResponse,
        functionCalls: [],
        usage: { totalTokens: 500 },
      });

      await handler.execute(mockClient, mockMessage as any);

      // Should reply first part and send additional parts
      expect(mockMessage.reply).toHaveBeenCalledTimes(1);
      expect(mockMessage.channel.send).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockMessage.content = "@bot123 Test message";
      mockMessage.mentions.users.set("bot123", {} as any);
    });

    it("should handle validation errors", async () => {
      // Mock message processor to throw validation error
      const messageProcessor = new MessageProcessor();
      jest.spyOn(messageProcessor, "shouldProcess").mockResolvedValue(false);
      (handler as any).messageProcessor = messageProcessor;

      await handler.execute(mockClient, mockMessage as any);

      expect(mockGeminiService.generateContent).not.toHaveBeenCalled();
      expect(mockMessage.reply).not.toHaveBeenCalled();
    });

    it("should handle service initialization errors", async () => {
      mockGeminiService.initialize = jest
        .fn()
        .mockRejectedValue(new Error("Init failed"));

      await expect(handler.initialize()).rejects.toThrow("Init failed");
    });
  });

  describe("Bot Mention Detection", () => {
    it("should respond to only mention with greeting", async () => {
      mockMessage.content = "@bot123";
      mockMessage.mentions.users.set("bot123", {} as any);

      mockConfigService.isMentionEnabled = jest.fn().mockResolvedValue(true);

      await handler.execute(mockClient, mockMessage as any);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        "こんにちは！何かお手伝いできることはありますか？ 😊"
      );
      expect(mockGeminiService.generateContent).not.toHaveBeenCalled();
    });

    it("should not respond when mentions are disabled", async () => {
      mockMessage.content = "@bot123 Hello";
      mockMessage.mentions.users.set("bot123", {} as any);

      mockConfigService.isMentionEnabled = jest.fn().mockResolvedValue(false);

      await handler.execute(mockClient, mockMessage as any);

      expect(mockMessage.reply).not.toHaveBeenCalled();
      expect(mockGeminiService.generateContent).not.toHaveBeenCalled();
    });
  });
});
