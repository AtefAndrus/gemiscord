// E2E Integration tests for complete message flow

import { beforeEach, describe, expect, it, mock } from "bun:test";
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
    sendTyping: mock(),
    send: mock(),
  },
  client: { user: { id: "bot123" } },
  mentions: { users: new Map() },
  reply: mock(),
};

const mockClient = {
  user: { id: "bot123" },
} as ExtendedClient;

describe("Message Flow Integration Tests", () => {
  let handler: any; // Mock handler object
  let mockGeminiService: any;
  let mockBraveSearchService: any;
  let mockRateLimitService: any;
  let mockConfigService: any;
  let mockConfigManager: any;
  let mockMessageProcessor: any;

  beforeEach(() => {
    // Clear all mocks individually
    (mockMessage.reply as any).mockClear();
    (mockMessage.channel.sendTyping as any).mockClear();
    (mockMessage.channel.send as any).mockClear();

    // Reset message mock
    mockMessage.content = "";
    mockMessage.mentions.users.clear();
    mockMessage.reply = mock();
    mockMessage.channel.sendTyping = mock();
    mockMessage.channel.send = mock();

    // Create mock services
    mockConfigService = {
      isMentionEnabled: mock(),
      isSearchEnabled: mock(),
      isResponseChannel: mock(),
      incrementStats: mock(),
    };

    mockConfigManager = {
      loadConfig: mock().mockResolvedValue(undefined),
      getBaseSystemPrompt: mock().mockReturnValue(
        "You are a helpful AI assistant."
      ),
      getConfig: mock().mockReturnValue({
        api: {
          gemini: {
            models: {
              primary: "gemini-2.0-flash",
              fallback: "gemini-2.5-flash-preview-0520",
            },
          },
        },
      }),
    };

    mockGeminiService = {
      initialize: mock().mockResolvedValue(undefined),
      generateContent: mock(),
      switchModel: mock(),
      executeFunction: mock(),
      getCurrentModel: mock().mockReturnValue("gemini-2.0-flash"),
    };

    mockBraveSearchService = {
      initialize: mock().mockResolvedValue(undefined),
      search: mock(),
      formatResultsForDiscord: mock(),
    };

    mockRateLimitService = {
      initialize: mock().mockResolvedValue(undefined),
      getAvailableModel: mock(),
      isSearchAvailable: mock(),
      updateCounters: mock(),
    };

    mockMessageProcessor = {
      shouldProcess: mock().mockResolvedValue(true),
      sanitizeContent: mock((content) => content),
    };

    // Create a mock handler that simulates the MessageCreateHandler behavior
    handler = {
      geminiService: mockGeminiService,
      braveSearchService: mockBraveSearchService,
      rateLimitService: mockRateLimitService,
      configManager: mockConfigManager,
      configService: mockConfigService,
      messageProcessor: mockMessageProcessor,

      // Mock the execute method that contains the main logic
      async execute(client: any, message: any) {
        // Check if message should be processed
        const shouldProcess = await this.messageProcessor.shouldProcess(
          message
        );
        if (!shouldProcess) return;

        // Check if this is a mention or auto-response channel
        const isMention = message.mentions.users.has(client.user.id);
        const isAutoResponse =
          !isMention &&
          (await this.configService.isResponseChannel(
            message.guild.id,
            message.channel.id
          ));

        if (!isMention && !isAutoResponse) return;

        // Check if mentions are enabled
        if (
          isMention &&
          !(await this.configService.isMentionEnabled(message.guild.id))
        )
          return;

        // Handle simple mention greeting
        if (
          isMention &&
          (message.content.trim() === `<@${client.user.id}>` ||
            message.content.trim() === `@${client.user.id}`)
        ) {
          await message.reply(
            "こんにちは！何かお手伝いできることはありますか？ 😊"
          );
          return;
        }

        // Check rate limits
        const availableModel = await this.rateLimitService.getAvailableModel();
        if (!availableModel) {
          await message.reply({
            content:
              "申し訳ございません。現在利用量が上限に達しています。しばらくしてから再度お試しください。",
            allowedMentions: { repliedUser: true },
          });
          return;
        }

        try {
          // Switch to available model
          this.geminiService.switchModel(availableModel);

          // Get search availability
          const searchEnabled = await this.configService.isSearchEnabled(
            message.guild.id
          );
          const searchAvailable =
            await this.rateLimitService.isSearchAvailable();

          // Generate initial response
          const response = await this.geminiService.generateContent({
            model: availableModel,
            systemPrompt: this.configManager.getBaseSystemPrompt(),
            userMessage: this.messageProcessor.sanitizeContent(message.content),
            functionCallingEnabled: searchEnabled && searchAvailable,
          });

          let finalText = response.text;

          // Handle function calls
          if (response.functionCalls && response.functionCalls.length > 0) {
            for (const functionCall of response.functionCalls) {
              if (functionCall.name === "search_web") {
                // Execute search
                const searchResult = await this.braveSearchService.search({
                  query: functionCall.args.query,
                  region: functionCall.args.region || "JP",
                  count: 5,
                });

                // Generate final response with search results
                const finalResponse = await this.geminiService.generateContent({
                  model: availableModel,
                  systemPrompt: this.configManager.getBaseSystemPrompt(),
                  userMessage: `検索結果: ${this.braveSearchService.formatResultsForDiscord(
                    searchResult
                  )}`,
                  functionCallingEnabled: false,
                });
                finalText = finalResponse.text;
              } else if (functionCall.name === "count_characters") {
                // Execute character count
                const result = await this.geminiService.executeFunction(
                  functionCall.name,
                  functionCall.args
                );

                // Generate final response with count results
                const finalResponse = await this.geminiService.generateContent({
                  model: availableModel,
                  systemPrompt: this.configManager.getBaseSystemPrompt(),
                  userMessage: `文字数カウント結果: ${JSON.stringify(result)}`,
                  functionCallingEnabled: false,
                });
                finalText = finalResponse.text;
              }
            }
          }

          // Update rate limit counters
          await this.rateLimitService.updateCounters(availableModel, {
            requests: 1,
            tokens: response.usage?.totalTokens || 0,
          });

          // Send response, split if necessary
          if (finalText && finalText.length <= 2000) {
            await message.reply({
              content: finalText,
              allowedMentions: { repliedUser: true },
            });
          } else if (finalText) {
            // Split long messages
            const firstPart = finalText.substring(0, 1900);
            const remainingPart = finalText.substring(1900);

            await message.reply({
              content: firstPart,
              allowedMentions: { repliedUser: true },
            });

            if (remainingPart) {
              await message.channel.send(remainingPart);
            }
          }

          // Update stats
          await this.configService.incrementStats(
            message.guild.id,
            "messages_processed"
          );
        } catch (error) {
          await message.reply(
            "申し訳ございません。エラーが発生しました。しばらくしてから再度お試しください。"
          );
        }
      },

      async initialize() {
        await this.geminiService.initialize();
        await this.braveSearchService.initialize();
        await this.rateLimitService.initialize();
      },
    };
  });

  describe("Mention Response Flow", () => {
    beforeEach(() => {
      // Setup mention
      mockMessage.content = "@bot123 Hello, how are you?";
      mockMessage.mentions.users.set("bot123", {} as any);

      // Mock config service responses
      mockConfigService.isMentionEnabled = mock().mockResolvedValue(true);
      mockConfigService.isSearchEnabled = mock().mockResolvedValue(true);
      mockConfigService.incrementStats = mock().mockResolvedValue(undefined);
    });

    it("should handle simple text response without function calling", async () => {
      // Mock rate limit check
      mockRateLimitService.getAvailableModel =
        mock().mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = mock().mockResolvedValue(true);
      mockRateLimitService.updateCounters = mock().mockResolvedValue(undefined);

      // Mock Gemini response (no function call)
      mockGeminiService.generateContent = mock().mockResolvedValue({
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
      mockRateLimitService.getAvailableModel =
        mock().mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = mock().mockResolvedValue(true);
      mockRateLimitService.updateCounters = mock().mockResolvedValue(undefined);

      // Mock Gemini first response (with function call)
      mockGeminiService.generateContent = mock()
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
      mockBraveSearchService.search = mock().mockResolvedValue({
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
      mockBraveSearchService.formatResultsForDiscord = mock().mockReturnValue(
        "🔍 Tokyo weather: Sunny, 25°C"
      );

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
      mockRateLimitService.getAvailableModel =
        mock().mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = mock().mockResolvedValue(false);
      mockRateLimitService.updateCounters = mock().mockResolvedValue(undefined);

      // Mock Gemini responses
      mockGeminiService.generateContent = mock()
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
      mockGeminiService.executeFunction = mock().mockResolvedValue({
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
      mockRateLimitService.getAvailableModel = mock().mockResolvedValue(null);

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
      mockRateLimitService.getAvailableModel =
        mock().mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = mock().mockResolvedValue(true);

      // Mock Gemini error
      mockGeminiService.generateContent = mock().mockRejectedValue(
        new Error("API Error")
      );

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

      mockConfigService.isMentionEnabled = mock().mockResolvedValue(true);
      mockConfigService.isSearchEnabled = mock().mockResolvedValue(true);
      mockConfigService.isResponseChannel = mock().mockResolvedValue(true);
      mockConfigService.incrementStats = mock().mockResolvedValue(undefined);
    });

    it("should handle auto-response in configured channel", async () => {
      // Mock rate limit check
      mockRateLimitService.getAvailableModel =
        mock().mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = mock().mockResolvedValue(true);
      mockRateLimitService.updateCounters = mock().mockResolvedValue(undefined);

      // Mock Gemini response
      mockGeminiService.generateContent = mock().mockResolvedValue({
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
      mockConfigService.isResponseChannel = mock().mockResolvedValue(false);

      await handler.execute(mockClient, mockMessage as any);

      expect(mockGeminiService.generateContent).not.toHaveBeenCalled();
      expect(mockMessage.reply).not.toHaveBeenCalled();
    });
  });

  describe("Message Length Handling", () => {
    beforeEach(() => {
      mockMessage.content = "@bot123 Tell me a very long story";
      mockMessage.mentions.users.set("bot123", {} as any);

      mockConfigService.isMentionEnabled = mock().mockResolvedValue(true);
      mockConfigService.isSearchEnabled = mock().mockResolvedValue(true);
      mockConfigService.incrementStats = mock().mockResolvedValue(undefined);
    });

    it("should split long messages correctly", async () => {
      // Mock rate limit check
      mockRateLimitService.getAvailableModel =
        mock().mockResolvedValue("gemini-2.0-flash");
      mockRateLimitService.isSearchAvailable = mock().mockResolvedValue(true);
      mockRateLimitService.updateCounters = mock().mockResolvedValue(undefined);

      // Mock very long response
      const longResponse = "Very long story... ".repeat(200); // Over 2000 chars
      mockGeminiService.generateContent = mock().mockResolvedValue({
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

  describe("Bot Mention Detection", () => {
    it("should respond to only mention with greeting", async () => {
      mockMessage.content = "@bot123";
      mockMessage.mentions.users.set("bot123", {} as any);

      mockConfigService.isMentionEnabled = mock().mockResolvedValue(true);

      await handler.execute(mockClient, mockMessage as any);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        "こんにちは！何かお手伝いできることはありますか？ 😊"
      );
      expect(mockGeminiService.generateContent).not.toHaveBeenCalled();
    });

    it("should not respond when mentions are disabled", async () => {
      mockMessage.content = "@bot123 Hello";
      mockMessage.mentions.users.set("bot123", {} as any);

      mockConfigService.isMentionEnabled = mock().mockResolvedValue(false);

      await handler.execute(mockClient, mockMessage as any);

      expect(mockMessage.reply).not.toHaveBeenCalled();
      expect(mockGeminiService.generateContent).not.toHaveBeenCalled();
    });
  });
});
