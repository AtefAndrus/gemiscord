// Message processing service

import { Attachment, Message } from "discord.js";
import { IMessageProcessor } from "../interfaces/services.js";
import {
  ALLOWED_CHANNEL_TYPES,
  MessageContext,
  ProcessedAttachment,
  ReferencedMessageContext,
} from "../types/index.js";
import { DISCORD, GEMINI } from "../utils/constants.js";
import { ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import {
  createSafePreview,
  extractMentions,
  sanitizeMessageContent,
} from "../utils/sanitizer.js";

export class MessageProcessor implements IMessageProcessor {
  async processMessage(message: Message): Promise<MessageContext> {
    // Validate message
    this.validateMessage(message);

    // Build context
    const context = await this.buildContext(message);

    logger.debug("Message processed", {
      guildId: context.guildId,
      channelId: context.channelId,
      userId: context.userId,
      hasAttachments: context.attachments.length > 0,
      hasReference: !!context.referencedMessage,
    });

    return context;
  }

  private validateMessage(message: Message): void {
    // Check if message is from a guild
    if (!message.guild) {
      throw new ValidationError("Direct messages are not supported");
    }

    // Check if channel type is allowed
    // Guild check above ensures channel is not DM/GroupDM
    if (
      !ALLOWED_CHANNEL_TYPES.includes(
        message.channel.type as (typeof ALLOWED_CHANNEL_TYPES)[number]
      )
    ) {
      throw new ValidationError("This channel type is not supported");
    }

    // Check if message has content or attachments
    if (!message.content && message.attachments.size === 0) {
      throw new ValidationError("Message has no content or attachments");
    }

    // Check message length
    if (message.content.length > DISCORD.MESSAGE_MAX_LENGTH * 2) {
      throw new ValidationError("Message is too long to process");
    }
  }

  sanitizeContent(content: string): string {
    return sanitizeMessageContent(content);
  }

  extractMentions(content: string): {
    users: string[];
    channels: string[];
    roles: string[];
  } {
    return extractMentions(content);
  }

  async processAttachments(
    attachments: Attachment[]
  ): Promise<ProcessedAttachment[]> {
    const processed: ProcessedAttachment[] = [];

    for (const attachment of attachments) {
      const processedAttachment = await this.processAttachment(attachment);
      processed.push(processedAttachment);
    }

    return processed;
  }

  private async processAttachment(
    attachment: Attachment
  ): Promise<ProcessedAttachment> {
    const contentType = attachment.contentType || "";
    const isImage =
      !!contentType &&
      GEMINI.SUPPORTED_IMAGE_TYPES.includes(
        contentType as (typeof GEMINI.SUPPORTED_IMAGE_TYPES)[number]
      );
    const isSupportedByGemini =
      isImage && attachment.size <= GEMINI.MAX_FILE_SIZE;

    return {
      id: attachment.id,
      name: attachment.name || "unnamed",
      size: attachment.size,
      url: attachment.url,
      contentType,
      isImage,
      isSupportedByGemini,
    };
  }

  async buildContext(message: Message): Promise<MessageContext> {
    // Extract basic information
    const guildId = message.guild?.id || "";
    const channelId = message.channel.id;
    const userId = message.author.id;
    const userDisplayName =
      message.member?.displayName || message.author.username;

    // Check if bot was mentioned
    const isMentioned = message.mentions.users.has(
      message.client.user?.id || ""
    );

    // Process content
    const sanitizedContent = this.sanitizeContent(message.content);

    // Process attachments
    const attachments = await this.processAttachments(
      Array.from(message.attachments.values())
    );

    // Process referenced message if exists
    let referencedMessage: ReferencedMessageContext | undefined;
    if (message.reference && message.reference.messageId) {
      try {
        const refMsg = await message.channel.messages.fetch(
          message.reference.messageId
        );
        if (refMsg) {
          referencedMessage = {
            content: createSafePreview(refMsg.content, 500),
            author: refMsg.author.username,
            timestamp: refMsg.createdAt,
          };
        }
      } catch (error) {
        logger.debug("Failed to fetch referenced message", error);
      }
    }

    // Determine if this is an auto-response (will be checked later against config)
    const isAutoResponse = false; // This will be determined by the handler

    return {
      originalMessage: message,
      sanitizedContent,
      isMentioned,
      isAutoResponse,
      guildId,
      channelId,
      userId,
      userDisplayName,
      attachments,
      referencedMessage,
    };
  }

  // Helper method to check if message should be processed
  async shouldProcess(message: Message): Promise<boolean> {
    // Skip bot messages
    if (message.author.bot) {
      return false;
    }

    // Skip system messages
    if (message.system) {
      return false;
    }

    // Skip empty messages (no content and no attachments)
    if (!message.content && message.attachments.size === 0) {
      return false;
    }

    // Guild check
    if (!message.guild) {
      logger.debug("Skipping DM message");
      return false;
    }

    // Channel type check
    // Guild check above ensures channel is not DM/GroupDM
    if (
      !ALLOWED_CHANNEL_TYPES.includes(
        message.channel.type as (typeof ALLOWED_CHANNEL_TYPES)[number]
      )
    ) {
      logger.debug("Skipping unsupported channel type", {
        type: message.channel.type,
      });
      return false;
    }

    return true;
  }

  // Helper method to format user for logging
  formatUserForLog(message: Message): string {
    const username = message.author.username;
    const displayName = message.member?.displayName || username;
    const userId = message.author.id;

    if (displayName !== username) {
      return `${displayName} (${username}#${userId})`;
    }
    return `${username}#${userId}`;
  }

  // Helper method to check if message contains only mentions
  isOnlyMentions(content: string): boolean {
    // Remove all mentions and whitespace
    const withoutMentions = content
      .replace(/<@!?\d+>/g, "")
      .replace(/<#\d+>/g, "")
      .replace(/<@&\d+>/g, "")
      .trim();

    return withoutMentions.length === 0;
  }

  // Helper method to get message preview for logging
  getMessagePreview(content: string, maxLength: number = 50): string {
    return createSafePreview(content, maxLength);
  }
}
