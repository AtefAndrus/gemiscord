/**
 * Command Utilities - Common patterns for Discord slash commands
 * 
 * Provides reusable utility functions for:
 * - Configuration toggle actions (enable/disable)
 * - Option selection actions (compress/split, etc.)
 * - Common validation patterns
 * - Response formatting
 */

import { ChatInputCommandInteraction, MessageFlags, ChannelType } from "discord.js";
import { configManager, configService } from "../bot.js";
import { GuildConfig } from "../types/config.types.js";
import { ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { getStringOption, getChannelOption } from "../handlers/interactionCreate.js";

/**
 * Custom validation function type for toggle actions
 */
export type ToggleValidationFn = (enabled: boolean) => Promise<{
  isValid: boolean;
  errorMessage?: string;
}>;

/**
 * Custom message builder function type
 */
export type MessageBuilderFn = (
  enabled: boolean,
  statusText: string,
  emoji: string
) => Promise<string> | string;

/**
 * Parameters for toggle action handlers
 */
export interface ToggleActionParams {
  interaction: ChatInputCommandInteraction;
  guildId: string;
  configKey: keyof GuildConfig;
  featureName: string;
  actionParam?: string; // parameter name, defaults to "action"
  commandName?: string; // for ephemeral settings, defaults to interaction.commandName
  customValidation?: ToggleValidationFn;
  customMessageBuilder?: MessageBuilderFn;
}

/**
 * Parameters for option selection handlers (like compress/split)
 */
export interface OptionSelectParams {
  interaction: ChatInputCommandInteraction;
  guildId: string;
  configKey: keyof GuildConfig;
  optionParam: string; // parameter name (e.g., "type")
  allowedValues: string[];
  featureName: string;
  commandName?: string;
  valueDescriptions?: Record<string, string>; // descriptions for each value
  customMessageBuilder?: (selectedValue: string, description?: string) => string;
}

/**
 * Common configuration action handler for enable/disable toggles
 */
export class ConfigActionHandler {
  /**
   * Handle toggle action (enable/disable) with customizable validation and messaging
   */
  static async handleToggleAction(params: ToggleActionParams): Promise<void> {
    const {
      interaction,
      guildId,
      configKey,
      featureName,
      actionParam = "action",
      commandName = interaction.commandName,
      customValidation,
      customMessageBuilder,
    } = params;

    const action = getStringOption(interaction, actionParam, true);

    // Validate action
    if (!action || !["enable", "disable"].includes(action)) {
      throw new ValidationError('Action must be either "enable" or "disable"');
    }

    // Defer reply with appropriate ephemeral setting
    const ephemeral = configManager.getEphemeralSetting(commandName);
    await interaction.deferReply({
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });

    const enabled = action === "enable";

    // Run custom validation if provided
    if (customValidation) {
      const validation = await customValidation(enabled);
      if (!validation.isValid) {
        await interaction.editReply({
          content: validation.errorMessage || "❌ Validation failed.",
        });
        return;
      }
    }

    // Get current configuration
    const currentConfig = await configService.getGuildConfig(guildId);

    // Update configuration
    await configService.setGuildConfig(guildId, {
      ...currentConfig,
      [configKey]: enabled,
    });

    // Format response
    const statusText = enabled ? "enabled" : "disabled";
    const emoji = enabled ? "✅" : "❌";

    let message: string;
    if (customMessageBuilder) {
      message = await customMessageBuilder(enabled, statusText, emoji);
    } else {
      message = `${emoji} ${featureName} has been **${statusText}** for this server.`;
    }

    await interaction.editReply({ content: message });

    // Log action
    logger.info(`${featureName} ${statusText}`, {
      guildId,
      enabled,
      configKey,
    });
  }

  /**
   * Handle option selection (like compress/split strategy)
   */
  static async handleOptionSelect(params: OptionSelectParams): Promise<void> {
    const {
      interaction,
      guildId,
      configKey,
      optionParam,
      allowedValues,
      featureName,
      commandName = interaction.commandName,
      valueDescriptions = {},
      customMessageBuilder,
    } = params;

    const selectedValue = getStringOption(interaction, optionParam, true);

    // Validate selected value
    if (!selectedValue || !allowedValues.includes(selectedValue)) {
      throw new ValidationError(
        `${optionParam} must be one of: ${allowedValues.join(", ")}`
      );
    }

    // Defer reply with appropriate ephemeral setting
    const ephemeral = configManager.getEphemeralSetting(commandName);
    await interaction.deferReply({
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });

    // Get current configuration
    const currentConfig = await configService.getGuildConfig(guildId);

    // Update configuration
    await configService.setGuildConfig(guildId, {
      ...currentConfig,
      [configKey]: selectedValue,
    });

    // Format response
    const description = valueDescriptions[selectedValue];
    let message: string;
    
    if (customMessageBuilder) {
      message = customMessageBuilder(selectedValue, description);
    } else {
      message = `✅ ${featureName} set to **${selectedValue}**.`;
      if (description) {
        message += `\n\n${description}`;
      }
    }

    await interaction.editReply({ content: message });

    // Log action
    logger.info(`${featureName} updated`, {
      guildId,
      [optionParam]: selectedValue,
      configKey,
    });
  }
}

/**
 * Validation utilities for common patterns
 */
export class CommandValidators {
  /**
   * Validate API key availability for features
   */
  static createApiKeyValidator(
    apiKeyEnvVar: string,
    featureName: string
  ): ToggleValidationFn {
    return async (enabled: boolean) => {
      if (enabled && !process.env[apiKeyEnvVar]) {
        return {
          isValid: false,
          errorMessage: `❌ Cannot enable ${featureName}: API key is not configured.`,
        };
      }
      return { isValid: true };
    };
  }

  /**
   * Create a custom message builder that includes usage statistics
   */
  static createUsageMessageBuilder(
    baseName: string,
    getUsageStats: () => Promise<{ current: number; limit: number }>
  ): MessageBuilderFn {
    return async (enabled: boolean, statusText: string, emoji: string) => {
      let message = `${emoji} ${baseName} has been **${statusText}** for this server.`;
      
      if (enabled) {
        try {
          const stats = await getUsageStats();
          const remaining = Math.max(0, stats.limit - stats.current);
          message += `\n\n📊 **Current Usage:** ${stats.current}/${stats.limit} (${remaining} remaining)`;
        } catch (error) {
          logger.warn("Failed to get usage statistics:", error);
        }
      }
      
      return message;
    };
  }
}

/**
 * Parameters for channel list management (add/remove)
 */
export interface ChannelListParams {
  interaction: ChatInputCommandInteraction;
  guildId: string;
  configKey: keyof GuildConfig;
  channelParam?: string; // parameter name, defaults to "target"
  actionParam?: string; // parameter name, defaults to "action"
  featureName: string;
  commandName?: string;
  allowedChannelTypes?: ChannelType[];
}

/**
 * Parameters for text configuration
 */
export interface TextConfigParams {
  interaction: ChatInputCommandInteraction;
  guildId: string;
  configKey: keyof GuildConfig;
  textParam: string; // parameter name (e.g., "content")
  featureName: string;
  commandName?: string;
  minLength?: number;
  maxLength?: number;
  customValidator?: (text: string) => { isValid: boolean; errorMessage?: string };
  customMessageBuilder?: (text: string) => string;
}

/**
 * Extended configuration action handlers
 */
export class ExtendedConfigHandlers {
  /**
   * Handle channel list management (add/remove operations)
   */
  static async handleChannelList(params: ChannelListParams): Promise<void> {
    const {
      interaction,
      guildId,
      configKey,
      channelParam = "target",
      actionParam = "action",
      featureName,
      commandName = interaction.commandName,
      allowedChannelTypes = [ChannelType.GuildText],
    } = params;

    const action = getStringOption(interaction, actionParam, true);
    const targetChannel = getChannelOption(interaction, channelParam, true);

    // Validate action
    if (!action || !["add", "remove"].includes(action)) {
      throw new ValidationError('Action must be either "add" or "remove"');
    }

    // Validate channel
    if (!targetChannel || !allowedChannelTypes.includes(targetChannel.type)) {
      throw new ValidationError("Please select a valid channel");
    }

    // Defer reply
    const ephemeral = configManager.getEphemeralSetting(commandName);
    await interaction.deferReply({
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });

    const currentConfig = await configService.getGuildConfig(guildId);
    const currentList = (currentConfig[configKey] as string[]) || [];
    const targetId = targetChannel.id;

    let updatedList: string[] = currentList;
    let resultMessage: string;

    if (action === "add") {
      if (currentList.includes(targetId)) {
        resultMessage = `⚠️ <#${targetId}> is already in the ${featureName.toLowerCase()} list.`;
      } else {
        updatedList = [...currentList, targetId];
        await configService.setGuildConfig(guildId, {
          ...currentConfig,
          [configKey]: updatedList,
        });
        resultMessage = `✅ Added <#${targetId}> to ${featureName.toLowerCase()}.`;
      }
    } else {
      if (!currentList.includes(targetId)) {
        resultMessage = `⚠️ <#${targetId}> is not in the ${featureName.toLowerCase()} list.`;
      } else {
        updatedList = currentList.filter((id) => id !== targetId);
        await configService.setGuildConfig(guildId, {
          ...currentConfig,
          [configKey]: updatedList,
        });
        resultMessage = `✅ Removed <#${targetId}> from ${featureName.toLowerCase()}.`;
      }
    }

    await interaction.editReply({ content: resultMessage });

    // Log action
    logger.info(`${featureName} ${action} operation completed`, {
      guildId,
      channelId: targetId,
      action,
      listCount: updatedList.length,
    });
  }

  /**
   * Handle text configuration with validation
   */
  static async handleTextConfig(params: TextConfigParams): Promise<void> {
    const {
      interaction,
      guildId,
      configKey,
      textParam,
      featureName,
      commandName = interaction.commandName,
      minLength = 1,
      maxLength = 2000,
      customValidator,
      customMessageBuilder,
    } = params;

    const textContent = getStringOption(interaction, textParam, true);

    // Basic length validation
    if (!textContent || textContent.length < minLength) {
      throw new ValidationError(
        `${featureName} must be at least ${minLength} characters long`
      );
    }

    if (textContent.length > maxLength) {
      throw new ValidationError(
        `${featureName} must be less than ${maxLength} characters`
      );
    }

    // Custom validation
    if (customValidator) {
      const validation = customValidator(textContent);
      if (!validation.isValid) {
        throw new ValidationError(validation.errorMessage || "Validation failed");
      }
    }

    // Defer reply
    const ephemeral = configManager.getEphemeralSetting(commandName);
    await interaction.deferReply({
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });

    // Update configuration
    const currentConfig = await configService.getGuildConfig(guildId);
    await configService.setGuildConfig(guildId, {
      ...currentConfig,
      [configKey]: textContent,
    });

    // Format response
    let message: string;
    if (customMessageBuilder) {
      message = customMessageBuilder(textContent);
    } else {
      message = `✅ ${featureName} has been updated.`;
      // Add preview for longer texts
      if (textContent.length > 100) {
        const preview = textContent.substring(0, 200);
        const truncated = textContent.length > 200 ? "..." : "";
        message += `\n\n**Preview:**\n\`\`\`\n${preview}${truncated}\n\`\`\``;
      }
    }

    await interaction.editReply({ content: message });

    // Log action
    logger.info(`${featureName} updated`, {
      guildId,
      textLength: textContent.length,
      configKey,
    });
  }
}

/**
 * Response formatting utilities
 */
export class ResponseFormatters {
  /**
   * Format strategy description for message limit strategies
   */
  static formatStrategyDescription(strategy: string): string {
    const descriptions: Record<string, string> = {
      compress: "Long responses will be summarized to fit in one message",
      split: "Long responses will be split across multiple messages",
    };
    return descriptions[strategy] || "";
  }

  /**
   * Format toggle message with custom descriptions
   */
  static formatToggleMessage(
    enabled: boolean,
    featureName: string,
    enabledDescription?: string,
    disabledDescription?: string
  ): string {
    const statusText = enabled ? "enabled" : "disabled";
    const emoji = enabled ? "✅" : "❌";
    const customDesc = enabled ? enabledDescription : disabledDescription;
    
    let message = `${emoji} ${featureName} has been **${statusText}** for this server.`;
    if (customDesc) {
      message += `\n\n${customDesc}`;
    }
    
    return message;
  }
}