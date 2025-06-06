// Discord message create event handler

import { Message, TextChannel } from "discord.js";
import { configManager, configService } from "../bot.js";
import { IMessageHandler } from "../interfaces/handlers.js";
import { BraveSearchService } from "../services/braveSearch.js";
import { GeminiService } from "../services/gemini.js";
import { MessageProcessor } from "../services/messageProcessor.js";
import { RateLimitService } from "../services/rateLimit.js";
import {
  ExtendedClient,
  GeminiGenerateOptions,
  MessageContext,
  SearchQuery,
} from "../types/index.js";
import {
  APIError,
  getUserFriendlyMessage,
  ValidationError,
} from "../utils/errors.js";
import { discordLogger as logger } from "../utils/logger.js";

export class MessageCreateHandler implements IMessageHandler {
  name: "messageCreate" = "messageCreate";
  private messageProcessor: MessageProcessor;
  private geminiService: GeminiService;
  private braveSearchService: BraveSearchService;
  private rateLimitService: RateLimitService;

  constructor() {
    this.messageProcessor = new MessageProcessor();
    this.geminiService = new GeminiService(configManager);
    this.braveSearchService = new BraveSearchService(
      configService,
      configManager
    );
    this.rateLimitService = new RateLimitService(configService, configManager);
  }

  async initialize(): Promise<void> {
    try {
      await this.geminiService.initialize();
      await this.braveSearchService.initialize();
      await this.rateLimitService.initialize();

      logger.info("MessageCreateHandler initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize MessageCreateHandler:", error);
      throw error;
    }
  }

  async execute(_client: ExtendedClient, message: Message): Promise<void> {
    try {
      // Check if message should be processed
      if (!(await this.shouldRespond(message))) {
        return;
      }

      // Process the message
      const context = await this.messageProcessor.processMessage(message);

      // Log message reception
      logger.info("Message received", {
        guild: message.guild?.name,
        channel:
          message.channel.type === 0
            ? `#${(message.channel as TextChannel).name}`
            : "thread",
        user: this.messageProcessor.formatUserForLog(message),
        preview: this.messageProcessor.getMessagePreview(message.content),
        mentioned: context.isMentioned,
      });

      // Route to appropriate handler
      if (context.isMentioned) {
        await this.handleMentionResponse(message, context);
      } else if (await this.isAutoResponseChannel(context)) {
        context.isAutoResponse = true;
        await this.handleAutoResponse(message, context);
      }
    } catch (error) {
      logger.error("Error handling message:", error);

      // Send error message if it's a validation error
      if (error instanceof ValidationError) {
        try {
          await message.reply(getUserFriendlyMessage(error));
        } catch (replyError) {
          logger.error("Failed to send error reply:", replyError);
        }
      }
    }
  }

  async shouldRespond(message: Message): Promise<boolean> {
    // Use message processor's validation
    if (!(await this.messageProcessor.shouldProcess(message))) {
      return false;
    }

    // Additional checks specific to responding
    const client = message.client as ExtendedClient;

    // Check if bot was mentioned or if it's an auto-response channel
    const isMentioned = message.mentions.users.has(client.user?.id || "");
    const isAutoResponse = await this.isAutoResponseChannel({
      guildId: message.guild?.id || "",
      channelId: message.channel.id,
    } as MessageContext);

    return isMentioned || isAutoResponse;
  }

  async handleMentionResponse(
    message: Message,
    context: MessageContext
  ): Promise<void> {
    try {
      // Check if mention responses are enabled for this guild
      const mentionEnabled = await configService.isMentionEnabled(
        context.guildId
      );
      if (!mentionEnabled) {
        logger.debug("Mention responses disabled for guild", {
          guildId: context.guildId,
        });
        return;
      }

      // Check if it's only a mention with no other content
      if (this.messageProcessor.isOnlyMentions(message.content)) {
        await message.reply(
          "こんにちは！何かお手伝いできることはありますか？ 😊"
        );
        return;
      }

      // Process and respond
      await this.processAndRespond(message, context);
    } catch (error) {
      logger.error("Error handling mention response:", error);
      throw error;
    }
  }

  async handleAutoResponse(
    message: Message,
    context: MessageContext
  ): Promise<void> {
    try {
      // Additional validation for auto-response
      const searchEnabled = await configService.isSearchEnabled(
        context.guildId
      );
      logger.debug("Auto-response triggered", {
        guildId: context.guildId,
        channelId: context.channelId,
        searchEnabled,
      });

      // Process and respond
      await this.processAndRespond(message, context);
    } catch (error) {
      logger.error("Error handling auto response:", error);
      throw error;
    }
  }

  async processAndRespond(
    message: Message,
    context: MessageContext
  ): Promise<void> {
    try {
      // Show typing indicator
      if (message.channel.type === 0) {
        // GUILD_TEXT channel
        await message.channel.sendTyping();
      }

      // Update statistics
      await configService.incrementStats("total_requests");

      // Generate AI response
      const response = await this.generateAIResponse(message, context);

      // Handle response length and send
      await this.sendResponse(message, response);

      logger.info("AI response sent successfully", {
        responseLength: response.length,
        guild: message.guild?.name,
        channel:
          message.channel.type === 0
            ? `#${(message.channel as TextChannel).name}`
            : "thread",
      });
    } catch (error) {
      logger.error("Error processing and responding:", error);

      // Try to send a generic error message
      try {
        await message.reply(
          "申し訳ございません。エラーが発生しました。しばらくしてから再度お試しください。"
        );
      } catch (replyError) {
        logger.error("Failed to send error reply:", replyError);
      }
    }
  }

  private async isAutoResponseChannel(context: {
    guildId: string;
    channelId: string;
  }): Promise<boolean> {
    return await configService.isResponseChannel(
      context.guildId,
      context.channelId
    );
  }

  private async generateAIResponse(
    _message: Message,
    context: MessageContext
  ): Promise<string> {
    try {
      // Get available model
      const availableModel = await this.rateLimitService.getAvailableModel();
      if (!availableModel) {
        return "申し訳ございません。現在利用量が上限に達しています。しばらくしてから再度お試しください。";
      }

      // Check if search is available
      const searchEnabled = await configService.isSearchEnabled(
        context.guildId
      );
      const searchAvailable =
        searchEnabled && (await this.rateLimitService.isSearchAvailable());

      // Build system prompt
      const baseSystemPrompt = configManager.getBaseSystemPrompt();
      const systemPrompt = context.isAutoResponse
        ? `${baseSystemPrompt}\n\n自動応答モードです。自然な会話を心がけてください。`
        : baseSystemPrompt;

      // Prepare Gemini request
      const config = configManager.getConfig();
      const geminiOptions: GeminiGenerateOptions = {
        model: availableModel,
        systemPrompt,
        userMessage: context.sanitizedContent,
        functionCallingEnabled: searchAvailable,
        // TODO: Convert ProcessedAttachment to GeminiAttachment
        // attachments: context.attachments,
        temperature: config.ai.temperature,
      };

      // Switch model if needed
      this.geminiService.switchModel(availableModel);

      // Generate initial response
      let geminiResponse = await this.geminiService.generateContent(
        geminiOptions
      );

      // Update rate limits
      await this.rateLimitService.updateCounters(availableModel, {
        requests: 1,
        tokens: geminiResponse.usage?.totalTokens || 100,
      });

      // Handle function calls
      if (
        geminiResponse.functionCalls &&
        geminiResponse.functionCalls.length > 0
      ) {
        const functionCall = geminiResponse.functionCalls[0];

        if (
          functionCall &&
          functionCall.name === "search_web" &&
          searchAvailable &&
          functionCall.args
        ) {
          // Execute search
          const searchQuery: SearchQuery = {
            query: functionCall.args.query as string,
            region:
              (functionCall.args.region as "JP" | "US" | "global") || "JP",
            count: config.search.defaults.count,
          };

          const searchResults = await this.braveSearchService.search(
            searchQuery
          );
          const formattedResults =
            this.braveSearchService.formatResultsForDiscord(searchResults);

          // Generate final response with search results
          const finalOptions: GeminiGenerateOptions = {
            model: availableModel,
            systemPrompt: `${systemPrompt}\n\n以下の検索結果を参考にして回答してください：\n${formattedResults}`,
            userMessage: context.sanitizedContent,
            functionCallingEnabled: false, // No more function calls needed
          };

          geminiResponse = await this.geminiService.generateContent(
            finalOptions
          );

          // Update rate limits again
          await this.rateLimitService.updateCounters(availableModel, {
            requests: 1,
            tokens: geminiResponse.usage?.totalTokens || 100,
          });
        } else if (
          functionCall &&
          functionCall.name === "count_characters" &&
          functionCall.args
        ) {
          // Execute character count
          const result = await this.geminiService.executeFunction(
            functionCall.name,
            functionCall.args
          );

          // Generate response with character count result
          const finalOptions: GeminiGenerateOptions = {
            model: availableModel,
            systemPrompt: `${systemPrompt}\n\n文字数カウント結果: ${JSON.stringify(
              result
            )}`,
            userMessage: context.sanitizedContent,
            functionCallingEnabled: false,
          };

          geminiResponse = await this.geminiService.generateContent(
            finalOptions
          );

          // Update rate limits again
          await this.rateLimitService.updateCounters(availableModel, {
            requests: 1,
            tokens: geminiResponse.usage?.totalTokens || 100,
          });
        }
      }

      return (
        geminiResponse.text ||
        "申し訳ございません。応答を生成できませんでした。"
      );
    } catch (error) {
      logger.error("Error generating AI response:", error);

      if (error instanceof APIError) {
        if (error.status === 429) {
          return "申し訳ございません。現在利用量が上限に達しています。しばらくしてから再度お試しください。";
        } else if (error.status === 403) {
          return "申し訳ございません。APIの利用制限に達しました。";
        }
      }

      return "申し訳ございません。エラーが発生しました。しばらくしてから再度お試しください。";
    }
  }

  private async sendResponse(
    message: Message,
    response: string
  ): Promise<void> {
    const config = configManager.getConfig();
    try {
      // Check Discord message limit (2000 characters)
      if (response.length <= 2000) {
        await message.reply({
          content: response,
          allowedMentions: { repliedUser: true },
        });
      } else {
        // Split message for long responses
        const messageParts = this.splitMessage(
          response,
          config.ui.messaging.preview_length
        );

        for (let i = 0; i < messageParts.length; i++) {
          const part = messageParts[i];
          const partIndicator =
            messageParts.length > 1 ? ` (${i + 1}/${messageParts.length})` : "";

          if (i === 0) {
            await message.reply({
              content: part + partIndicator,
              allowedMentions: { repliedUser: true },
            });
          } else {
            // Check if channel supports sending messages
            if ("send" in message.channel) {
              await message.channel.send(part + partIndicator);
            } else {
              // Fallback: reply to the original message
              await message.reply({
                content: part + partIndicator,
                allowedMentions: { repliedUser: false },
              });
            }
          }

          // Small delay between messages to avoid rate limits
          if (i < messageParts.length - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, config.ui.messaging.split_delay)
            );
          }
        }
      }
    } catch (error) {
      logger.error("Error sending response:", error);
      throw error;
    }
  }

  private splitMessage(content: string, maxLength: number): string[] {
    if (content.length <= maxLength) {
      return [content];
    }

    const parts: string[] = [];
    let currentPart = "";

    // Split by paragraphs first
    const paragraphs = content.split("\n\n");

    for (const paragraph of paragraphs) {
      if ((currentPart + paragraph + "\n\n").length <= maxLength) {
        currentPart += paragraph + "\n\n";
      } else {
        if (currentPart) {
          parts.push(currentPart.trim());
          currentPart = "";
        }

        // If single paragraph is too long, split by sentences
        if (paragraph.length > maxLength) {
          const sentences = paragraph.split("。");
          for (const sentence of sentences) {
            if ((currentPart + sentence + "。").length <= maxLength) {
              currentPart += sentence + "。";
            } else {
              if (currentPart) {
                parts.push(currentPart.trim());
                currentPart = "";
              }

              // If single sentence is still too long, force split
              if (sentence.length > maxLength) {
                while (sentence.length > maxLength) {
                  parts.push(sentence.substring(0, maxLength));
                  sentence.substring(maxLength);
                }
                if (sentence.length > 0) {
                  currentPart = sentence;
                }
              } else {
                currentPart = sentence + "。";
              }
            }
          }
        } else {
          currentPart = paragraph + "\n\n";
        }
      }
    }

    if (currentPart) {
      parts.push(currentPart.trim());
    }

    return parts.filter((part) => part.length > 0);
  }
}
