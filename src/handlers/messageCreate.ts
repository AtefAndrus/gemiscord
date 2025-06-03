// Discord message create event handler

import { Message, TextChannel } from "discord.js";
import { configService } from "../bot.js";
import { IMessageHandler } from "../interfaces/handlers.js";
import { MessageProcessor } from "../services/messageProcessor.js";
import { ExtendedClient, MessageContext } from "../types/index.js";
import { getUserFriendlyMessage, ValidationError } from "../utils/errors.js";
import { discordLogger as logger } from "../utils/logger.js";

export class MessageCreateHandler implements IMessageHandler {
  name: "messageCreate" = "messageCreate";
  private messageProcessor: MessageProcessor;

  constructor() {
    this.messageProcessor = new MessageProcessor();
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
      if (message.channel.type === 0) { // GUILD_TEXT channel
        await message.channel.sendTyping();
      }

      // Update statistics
      await configService.incrementStats("total_requests");

      // TODO: Implement actual AI response generation
      // This will be implemented in Phase 2 with Gemini integration

      // Temporary response for testing
      const response = `収到了您的消息！\n内容: ${context.sanitizedContent}\n附件数: ${context.attachments.length}`;

      await message.reply({
        content: response,
        allowedMentions: { repliedUser: true },
      });

      logger.info("Response sent successfully");
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
}
