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
  GeminiAttachment,
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
      logger.debug("Preparing to send response", {
        responseLength: response.length,
        guild: message.guild?.name,
        channel:
          message.channel.type === 0
            ? `#${(message.channel as TextChannel).name}`
            : "thread",
      });

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
      const searchQuotaAvailable =
        await this.rateLimitService.isSearchAvailable();
      const searchAvailable = searchEnabled && searchQuotaAvailable;

      logger.debug("Search availability check", {
        guildId: context.guildId,
        searchEnabled,
        searchQuotaAvailable,
        searchAvailable,
      });

      // Debug function calling configuration
      if (searchAvailable) {
        try {
          const searchFunctionDecl =
            configManager.getSearchFunctionDeclaration();
          logger.debug("Function calling enabled", {
            functionName: searchFunctionDecl.functionDeclarations?.[0]?.name,
            hasDescription:
              !!searchFunctionDecl.functionDeclarations?.[0]?.description,
            parameters:
              searchFunctionDecl.functionDeclarations?.[0]?.parameters,
          });
        } catch (error) {
          logger.error("Failed to get search function declaration", error);
        }
      } else {
        logger.warn("Function calling disabled", {
          reason: !searchEnabled ? "search disabled" : "quota unavailable",
        });
      }

      // Build system prompt
      const baseSystemPrompt = configManager.getBaseSystemPrompt();
      const systemPrompt = context.isAutoResponse
        ? `${baseSystemPrompt}\n\n自動応答モードです。自然な会話を心がけてください。`
        : baseSystemPrompt;

      // Prepare Gemini request
      const config = configManager.getConfig();

      // Convert ProcessedAttachments to GeminiAttachments
      const geminiAttachments = await this.convertAttachmentsForGemini(
        context.attachments
      );

      const geminiOptions: GeminiGenerateOptions = {
        model: availableModel,
        systemPrompt,
        userMessage: context.sanitizedContent,
        functionCallingEnabled: searchAvailable,
        attachments: geminiAttachments,
        temperature: config.ai.temperature,
      };

      // Switch model if needed
      this.geminiService.switchModel(availableModel);

      // Generate initial response
      let geminiResponse = await this.geminiService.generateContent(
        geminiOptions
      );

      logger.debug("Initial Gemini response", {
        hasText: !!geminiResponse.text,
        textLength: geminiResponse.text?.length || 0,
        hasFunctionCalls: !!(
          geminiResponse.functionCalls &&
          geminiResponse.functionCalls.length > 0
        ),
        functionCallsCount: geminiResponse.functionCalls?.length || 0,
        functionCallingEnabled: geminiOptions.functionCallingEnabled,
      });

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

        logger.debug("Function call received from Gemini", {
          functionName: functionCall?.name,
          hasArgs: !!functionCall?.args,
          args: functionCall?.args,
          searchAvailable,
        });

        if (
          functionCall &&
          functionCall.name === "search_web" &&
          searchAvailable &&
          functionCall.args
        ) {
          // Execute search with enhanced query
          let enhancedQuery = functionCall.args.query as string;

          // Generic query optimization for better Japanese results
          const currentDate = new Date();
          const dateStr = `${currentDate.getFullYear()}年${
            currentDate.getMonth() + 1
          }月${currentDate.getDate()}日`;

          // Add current date context for time-sensitive queries
          if (
            enhancedQuery.includes("今日") ||
            enhancedQuery.includes("current") ||
            enhancedQuery.includes("最新") ||
            enhancedQuery.includes("recent")
          ) {
            enhancedQuery = `${enhancedQuery} ${dateStr}`;
          }

          // Add "詳細" (details) for better content extraction
          enhancedQuery = `${enhancedQuery} 詳細`;

          logger.debug("Enhanced query for comprehensive results", {
            originalQuery: functionCall.args.query,
            enhancedQuery,
            strategy:
              "Generic enhancement with date context and detail request",
            currentDate: dateStr,
          });

          const searchQuery: SearchQuery = {
            query: enhancedQuery,
            region:
              (functionCall.args.region as "JP" | "US" | "global") || "JP",
            count: config.search.defaults.count,
          };

          const searchResults = await this.braveSearchService.search(
            searchQuery
          );

          // Get specific content from top search results with source attribution
          let specificContent = "";
          const sourceUrls: Array<{ title: string; url: string }> = [];
          const topResults = searchResults.results.slice(0, 2); // Get top 2 URLs

          for (const result of topResults) {
            try {
              logger.debug("Fetching specific content from URL", {
                url: result.url,
                title: result.title,
              });

              // Create appropriate prompt based on search type for content extraction
              // Note: This could be used with WebFetch tool for more advanced content processing

              // Use WebFetch tool to get actual page content
              try {
                // Skip certain domains that might be problematic
                if (
                  result.url.includes("youtube.com") ||
                  result.url.includes("twitter.com") ||
                  result.url.includes("instagram.com")
                ) {
                  continue;
                }

                // Create a simple extraction request with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(result.url, {
                  headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; Gemiscord/1.0)",
                  },
                  signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                  const html = await response.text();
                  const textContent = html
                    .replace(
                      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                      ""
                    )
                    .replace(
                      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
                      ""
                    )
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                    .slice(0, 1000); // First 1000 chars

                  if (textContent.length > 50) {
                    specificContent += `\n\n【${result.title}からの情報】\n${textContent}\n`;
                    sourceUrls.push({ title: result.title, url: result.url });
                    logger.debug("Successfully extracted content", {
                      url: result.url,
                      contentLength: textContent.length,
                    });
                  }
                }
              } catch (fetchError) {
                logger.debug("Content extraction failed", {
                  url: result.url,
                  error:
                    fetchError instanceof Error
                      ? fetchError.message
                      : String(fetchError),
                });
              }
            } catch (error) {
              logger.warn("Failed to fetch content from URL", {
                url: result.url,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          logger.debug("Processing search results with WebFetch integration", {
            resultCount: searchResults.results.length,
            query: enhancedQuery,
            specificContentLength: specificContent.length,
          });

          const formattedResults =
            this.braveSearchService.formatResultsForGemini(searchResults);

          // Track search usage in general statistics
          await configService.incrementStats("search_usage", 1);

          // Add current date context to avoid confusion
          const currentDateStr = `${currentDate.getFullYear()}年${
            currentDate.getMonth() + 1
          }月${currentDate.getDate()}日`;

          // Generate final response with search results and specific content
          const finalSystemPrompt = `あなたはDiscord用の親切なAIアシスタントです。今日は${currentDateStr}です。

${
  specificContent ? "以下の具体的情報と" : "以下の"
}検索結果を参考にして、ユーザーの質問に具体的で正確な情報を含めて日本語で回答してください。

${
  specificContent
    ? `具体的情報:
${specificContent}

`
    : ""
}検索結果:
${formattedResults}

重要指示:
- 今日の日付は${currentDateStr}です
- 具体的な数値や詳細情報がある場合は必ず含めてください
- 天気の場合：気温、湿度、降水確率などの具体的数値
- ニュースの場合：企業名、発表日、具体的内容
- 日付の場合：正確な年月日と曜日
- サイトの紹介ではなく、実際の情報を提供してください
- 回答の最後に参考リンクを追加してください${
            sourceUrls.length > 0
              ? "\n\n参考リンク:\n" +
                sourceUrls
                  .map((source) => `• [${source.title}](<${source.url}>)`)
                  .join("\n")
              : ""
          }`;

          const finalOptions: GeminiGenerateOptions = {
            model: availableModel,
            systemPrompt: finalSystemPrompt,
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

          // Generate response with character count result (without function calling instructions)
          const finalSystemPrompt = `あなたはDiscord用の親切なAIアシスタントです。文字数カウント結果を参考にして、ユーザーの質問に日本語で回答してください。

文字数カウント結果: ${JSON.stringify(result)}`;

          const finalOptions: GeminiGenerateOptions = {
            model: availableModel,
            systemPrompt: finalSystemPrompt,
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

      const finalResponse =
        geminiResponse.text ||
        "申し訳ございません。応答を生成できませんでした。";

      logger.debug("Generated AI response", {
        hasText: !!geminiResponse.text,
        textLength: geminiResponse.text?.length || 0,
        finalResponseLength: finalResponse.length,
        isDefaultMessage: !geminiResponse.text,
      });

      return finalResponse;
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
      logger.debug("Starting sendResponse", {
        responseLength: response.length,
        willSplit: response.length > 2000,
      });

      // Check Discord message limit (2000 characters)
      if (response.length <= 2000) {
        logger.debug("Sending single message reply");
        await message.reply({
          content: response,
          allowedMentions: { repliedUser: true },
        });
        logger.debug("Single message reply sent successfully");
      } else {
        // Split message for long responses
        logger.debug("Splitting long message");
        const messageParts = this.splitMessage(
          response,
          config.ui.messaging.preview_length
        );

        logger.debug("Split message into parts", {
          totalParts: messageParts.length,
          partLengths: messageParts.map((part) => part.length),
        });

        for (let i = 0; i < messageParts.length; i++) {
          const part = messageParts[i];
          if (!part) continue; // Skip if part is undefined

          const partIndicator =
            messageParts.length > 1 ? ` (${i + 1}/${messageParts.length})` : "";

          logger.debug(`Sending message part ${i + 1}/${messageParts.length}`, {
            partLength: part.length,
            isFirstPart: i === 0,
          });

          if (i === 0) {
            await message.reply({
              content: part + partIndicator,
              allowedMentions: { repliedUser: true },
            });
            logger.debug("First part sent as reply");
          } else {
            // Check if channel supports sending messages
            if ("send" in message.channel) {
              await message.channel.send(part + partIndicator);
              logger.debug("Additional part sent to channel");
            } else {
              // Fallback: reply to the original message
              await message.reply({
                content: part + partIndicator,
                allowedMentions: { repliedUser: false },
              });
              logger.debug("Additional part sent as reply (fallback)");
            }
          }

          // Small delay between messages to avoid rate limits
          if (i < messageParts.length - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, config.ui.messaging.split_delay)
            );
          }
        }

        logger.debug("All message parts sent successfully");
      }
    } catch (error) {
      logger.error("Error sending response:", error);
      throw error;
    }
  }

  private async convertAttachmentsForGemini(
    attachments: any[]
  ): Promise<GeminiAttachment[]> {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    const geminiAttachments: GeminiAttachment[] = [];

    for (const attachment of attachments) {
      try {
        // Only process attachments that are supported by Gemini
        if (!attachment.isSupportedByGemini) {
          logger.debug("Skipping unsupported attachment", {
            name: attachment.name,
            contentType: attachment.contentType,
            size: attachment.size,
          });
          continue;
        }

        // Download the attachment
        const response = await fetch(attachment.url);
        if (!response.ok) {
          logger.warn("Failed to download attachment", {
            url: attachment.url,
            status: response.status,
          });
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        // Upload to Gemini
        const geminiFile = await this.geminiService.uploadFile(
          buffer,
          attachment.contentType,
          attachment.name
        );

        // Create correct GeminiAttachment structure
        const geminiAttachment: GeminiAttachment = {
          fileData: {
            mimeType: geminiFile.mimeType,
            fileUri: geminiFile.uri,
          },
        };

        geminiAttachments.push(geminiAttachment);

        logger.debug("Successfully converted attachment for Gemini", {
          originalName: attachment.name,
          geminiUri: geminiFile.uri,
          mimeType: geminiFile.mimeType,
        });
      } catch (error) {
        logger.error("Failed to convert attachment for Gemini", {
          attachment: attachment.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return geminiAttachments;
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
          for (let sentenceText of sentences) {
            if ((currentPart + sentenceText + "。").length <= maxLength) {
              currentPart += sentenceText + "。";
            } else {
              if (currentPart) {
                parts.push(currentPart.trim());
                currentPart = "";
              }

              // If single sentence is still too long, force split
              if (sentenceText.length > maxLength) {
                let remainingSentence = sentenceText;
                while (remainingSentence.length > maxLength) {
                  parts.push(remainingSentence.substring(0, maxLength));
                  remainingSentence = remainingSentence.substring(maxLength);
                }
                if (remainingSentence.length > 0) {
                  currentPart = remainingSentence;
                }
              } else {
                currentPart = sentenceText + "。";
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
