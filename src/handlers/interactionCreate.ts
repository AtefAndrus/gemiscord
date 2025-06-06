/**
 * Discord Interaction Handler - Phase 3 Slash Commands
 *
 * Handles all Discord interactions including slash commands
 * Routes commands to appropriate handlers and manages permissions
 */

import { ChatInputCommandInteraction, Interaction } from "discord.js";
import { ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

// Command handlers (will be implemented in separate files)
import { handleConfigCommand } from "../commands/config.js";
import { handleModelCommand } from "../commands/model.js";
import { handleSearchCommand } from "../commands/search.js";
import { handleStatusCommand } from "../commands/status.js";

/**
 * Main interaction handler - entry point for all Discord interactions
 */
export async function handleInteractionCreate(
  interaction: Interaction
): Promise<void> {
  try {
    // Only handle slash command interactions
    if (!interaction.isChatInputCommand()) {
      logger.debug("Received non-command interaction, ignoring");
      return;
    }

    // Log interaction details
    logger.info(`Slash command received: /${interaction.commandName}`, {
      userId: interaction.user.id,
      guildId: interaction.guild?.id,
      channelId: interaction.channel?.id,
      commandName: interaction.commandName,
      subcommand: interaction.options.getSubcommand(false),
    });

    // Route to appropriate command handler
    await routeCommand(interaction as ChatInputCommandInteraction);
  } catch (error) {
    logger.error("Error handling interaction:", error);
    await handleInteractionError(
      interaction as ChatInputCommandInteraction,
      error
    );
  }
}

/**
 * Route slash commands to their respective handlers
 */
async function routeCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const { commandName } = interaction;

  switch (commandName) {
    case "status":
      await handleStatusCommand(interaction);
      break;

    case "config":
      await handleConfigCommand(interaction);
      break;

    case "search":
      await handleSearchCommand(interaction);
      break;

    case "model":
      await handleModelCommand(interaction);
      break;

    default:
      logger.warn(`Unknown command: ${commandName}`);
      await interaction.reply({
        content: `❌ Unknown command: \`/${commandName}\`. Please check available commands.`,
        ephemeral: true,
      });
  }
}

/**
 * Handle errors that occur during interaction processing
 */
async function handleInteractionError(
  interaction: ChatInputCommandInteraction,
  error: unknown
): Promise<void> {
  const errorMessage =
    error instanceof Error ? error.message : "An unknown error occurred";

  logger.error("Interaction error details:", {
    commandName: interaction.commandName,
    userId: interaction.user.id,
    guildId: interaction.guild?.id,
    error: errorMessage,
  });

  // Prepare error response
  const errorResponse = {
    content:
      "❌ An error occurred while processing your command. Please try again later.",
    ephemeral: true,
  };

  try {
    // Check if we can still respond to the interaction
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(errorResponse);
    } else if (interaction.deferred) {
      await interaction.editReply(errorResponse);
    } else {
      // Interaction already replied, send as follow-up
      await interaction.followUp(errorResponse);
    }
  } catch (responseError) {
    logger.error("Failed to send error response:", responseError);
  }
}

/**
 * Check if user has permission to use admin commands
 */
export function hasAdminPermission(
  interaction: ChatInputCommandInteraction
): boolean {
  if (!interaction.guild || !interaction.member) {
    return false;
  }

  // Check if user has administrator permission
  const member = interaction.member;
  if (typeof member.permissions === "string") {
    // Handle permissions as string (shouldn't happen in guild context)
    return false;
  }

  return member.permissions.has("Administrator");
}

/**
 * Send permission denied response
 */
export async function sendPermissionDenied(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.reply({
    content: "❌ You need Administrator permissions to use this command.",
    ephemeral: true,
  });
}

/**
 * Defer reply with loading message (useful for long-running commands)
 */
export async function deferWithLoading(
  interaction: ChatInputCommandInteraction,
  message: string = "Processing..."
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  // Optional: Edit with loading message
  await interaction.editReply(`⏳ ${message}`);
}

/**
 * Safely get subcommand name
 */
export function getSubcommand(
  interaction: ChatInputCommandInteraction
): string | null {
  try {
    return interaction.options.getSubcommand(false);
  } catch {
    return null;
  }
}

/**
 * Safely get string option value
 */
export function getStringOption(
  interaction: ChatInputCommandInteraction,
  name: string,
  required: boolean = false
): string | null {
  try {
    return interaction.options.getString(name, required);
  } catch (error) {
    if (required) {
      throw new ValidationError(`Missing required option: ${name}`, name);
    }
    return null;
  }
}

/**
 * Safely get channel option value
 */
export function getChannelOption(
  interaction: ChatInputCommandInteraction,
  name: string,
  required: boolean = false
): any | null {
  try {
    return interaction.options.getChannel(name, required);
  } catch (error) {
    if (required) {
      throw new ValidationError(
        `Missing required channel option: ${name}`,
        name
      );
    }
    return null;
  }
}

/**
 * Create standardized embed for command responses
 */
export function createCommandEmbed(title: string, color: number = 0x0099ff) {
  // This will be updated when we implement commands that need embeds
  return {
    title,
    color,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format uptime for display
 */
export function formatUptime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format file size for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ============================================================================
// Dependency Injection Infrastructure for Testing
// ============================================================================

/**
 * Interface for command handlers - used for dependency injection in tests
 */
export interface CommandHandlers {
  handleStatusCommand: (
    interaction: ChatInputCommandInteraction
  ) => Promise<void>;
  handleConfigCommand: (
    interaction: ChatInputCommandInteraction
  ) => Promise<void>;
  handleSearchCommand: (
    interaction: ChatInputCommandInteraction
  ) => Promise<void>;
  handleModelCommand: (
    interaction: ChatInputCommandInteraction
  ) => Promise<void>;
}

/**
 * Default command handlers using static imports
 */
const defaultHandlers: CommandHandlers = {
  handleStatusCommand,
  handleConfigCommand,
  handleSearchCommand,
  handleModelCommand,
};

/**
 * Route slash commands to their respective handlers with dependency injection support
 */
async function routeCommandWithDI(
  interaction: ChatInputCommandInteraction,
  handlers: CommandHandlers = defaultHandlers
): Promise<void> {
  const { commandName } = interaction;

  switch (commandName) {
    case "status":
      await handlers.handleStatusCommand(interaction);
      break;

    case "config":
      await handlers.handleConfigCommand(interaction);
      break;

    case "search":
      await handlers.handleSearchCommand(interaction);
      break;

    case "model":
      await handlers.handleModelCommand(interaction);
      break;

    default:
      logger.warn(`Unknown command: ${commandName}`);
      await interaction.reply({
        content: `❌ Unknown command: \`/${commandName}\`. Please check available commands.`,
        ephemeral: true,
      });
  }
}

/**
 * Create a testable interaction handler with dependency injection support
 * This function enables testing by allowing mock command handlers to be injected
 */
export function createTestableInteractionHandler(
  handlers?: Partial<CommandHandlers>
) {
  const mergedHandlers: CommandHandlers = {
    ...defaultHandlers,
    ...handlers,
  };

  return async function handleInteractionCreate(
    interaction: Interaction
  ): Promise<void> {
    try {
      // Only handle slash command interactions
      if (!interaction.isChatInputCommand()) {
        logger.debug("Received non-command interaction, ignoring");
        return;
      }

      // Log interaction details
      logger.info(`Slash command received: /${interaction.commandName}`, {
        userId: interaction.user.id,
        guildId: interaction.guild?.id,
        channelId: interaction.channel?.id,
        commandName: interaction.commandName,
        subcommand: interaction.options.getSubcommand(false),
      });

      // Route to appropriate command handler using DI
      await routeCommandWithDI(
        interaction as ChatInputCommandInteraction,
        mergedHandlers
      );
    } catch (error) {
      logger.error("Error handling interaction:", error);
      await handleInteractionError(
        interaction as ChatInputCommandInteraction,
        error
      );
    }
  };
}
