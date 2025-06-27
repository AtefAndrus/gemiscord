/**
 * Base Command Handler - Eliminates Code Duplication
 * 
 * Provides common patterns for Discord slash commands including:
 * - Permission checking
 * - Parameter validation  
 * - Guild configuration management
 * - Consistent response formatting
 * - Error handling and logging
 */

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { configManager, configService } from "../bot.js";
import { GuildConfig } from "../types/config.types.js";
import { ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import {
  hasAdminPermission,
  sendPermissionDenied,
  getStringOption,
} from "./interactionCreate.js";

/**
 * Configuration action result containing response data
 */
export interface ActionResult {
  success: boolean;
  message: string;
  ephemeral?: boolean;
}

/**
 * Configuration update parameters
 */
export interface ConfigUpdateParams {
  guildId: string;
  configKey: keyof GuildConfig;
  value: any;
  featureName: string;
  enabledMessage?: string;
  disabledMessage?: string;
}

/**
 * Base class for command handlers with common Discord command patterns
 */
export abstract class BaseCommandHandler {
  protected abstract commandName: string;

  /**
   * Check if user has administrator permissions for the command
   */
  protected async checkPermissions(
    interaction: ChatInputCommandInteraction
  ): Promise<boolean> {
    if (!hasAdminPermission(interaction)) {
      await sendPermissionDenied(interaction);
      return false;
    }
    return true;
  }

  /**
   * Ensure command is executed in a guild context
   */
  protected async validateGuildContext(
    interaction: ChatInputCommandInteraction
  ): Promise<string | null> {
    if (!interaction.guild) {
      const ephemeral = configManager.getEphemeralSetting(this.commandName);
      await interaction.reply({
        content: "❌ This command can only be used in a server.",
        ephemeral,
      });
      return null;
    }
    return interaction.guild.id;
  }

  /**
   * Validate enable/disable action parameter
   */
  protected validateToggleAction(action: string | null): boolean {
    if (!action || !["enable", "disable"].includes(action)) {
      throw new ValidationError('Action must be either "enable" or "disable"');
    }
    return true;
  }

  /**
   * Defer reply with appropriate ephemeral setting
   */
  protected async deferReply(
    interaction: ChatInputCommandInteraction,
    forceEphemeral?: boolean
  ): Promise<void> {
    const ephemeral = forceEphemeral ?? configManager.getEphemeralSetting(this.commandName);
    await interaction.deferReply({
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }

  /**
   * Handle basic toggle action (enable/disable) for guild configuration
   */
  protected async handleToggleAction(
    interaction: ChatInputCommandInteraction,
    guildId: string,
    params: ConfigUpdateParams,
    customValidation?: (enabled: boolean) => Promise<ActionResult | null>
  ): Promise<void> {
    const action = getStringOption(interaction, "action", true);
    
    // Validate action
    this.validateToggleAction(action);
    
    // Defer reply
    await this.deferReply(interaction);

    const enabled = action === "enable";

    // Run custom validation if provided
    if (customValidation) {
      const validationResult = await customValidation(enabled);
      if (validationResult) {
        await interaction.editReply({
          content: validationResult.message,
        });
        return;
      }
    }

    // Get current configuration
    const currentConfig = await configService.getGuildConfig(guildId);

    // Update configuration
    await configService.setGuildConfig(guildId, {
      ...currentConfig,
      [params.configKey]: params.value,
    });

    // Format response
    const statusText = enabled ? "enabled" : "disabled";
    const emoji = enabled ? "✅" : "❌";
    const featureMessage = params.enabledMessage && enabled 
      ? params.enabledMessage 
      : params.disabledMessage && !enabled 
        ? params.disabledMessage
        : `${params.featureName} has been **${statusText}** for this server.`;

    await interaction.editReply({
      content: `${emoji} ${featureMessage}`,
    });

    // Log action
    logger.info(`${params.featureName} ${statusText}`, { 
      guildId, 
      enabled,
      configKey: params.configKey
    });
  }

  /**
   * Format standard enable/disable response message
   */
  protected formatToggleMessage(
    enabled: boolean,
    featureName: string,
    customMessage?: string
  ): string {
    const statusText = enabled ? "enabled" : "disabled";
    const emoji = enabled ? "✅" : "❌";
    const message = customMessage || `${featureName} has been **${statusText}** for this server.`;
    return `${emoji} ${message}`;
  }

  /**
   * Get current guild configuration safely
   */
  protected async getGuildConfig(guildId: string): Promise<GuildConfig> {
    return await configService.getGuildConfig(guildId);
  }

  /**
   * Update guild configuration with validation
   */
  protected async updateGuildConfig(
    guildId: string,
    updates: Partial<GuildConfig>
  ): Promise<void> {
    const currentConfig = await this.getGuildConfig(guildId);
    await configService.setGuildConfig(guildId, {
      ...currentConfig,
      ...updates,
    });
  }

  /**
   * Send error response with appropriate formatting
   */
  protected async sendErrorResponse(
    interaction: ChatInputCommandInteraction,
    error: Error
  ): Promise<void> {
    const ephemeral = configManager.getEphemeralSetting(this.commandName);
    const errorMessage = error instanceof ValidationError 
      ? error.message 
      : "❌ An error occurred while processing your command.";

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: errorMessage,
          ephemeral,
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: errorMessage,
        });
      } else {
        await interaction.followUp({
          content: errorMessage,
          ephemeral: true,
        });
      }
    } catch (responseError) {
      logger.error("Failed to send error response:", responseError);
    }
  }

  /**
   * Log command execution with standard format
   */
  protected logCommandExecution(
    commandName: string,
    guildId: string,
    action: string,
    details?: Record<string, any>
  ): void {
    logger.info(`Command executed: ${commandName}`, {
      guildId,
      action,
      command: commandName,
      ...details,
    });
  }
}