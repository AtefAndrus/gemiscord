/**
 * /config command implementation
 *
 * Manages guild-specific configuration settings including:
 * - mention enable/disable
 * - channel add/remove for auto-response
 * - server-specific prompt settings
 * - message handling strategy
 * - view current configuration
 */

import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { configManager, configService } from "../bot.js";
import {
  getStringOption,
  getSubcommand,
  hasAdminPermission,
  sendPermissionDenied,
} from "../handlers/interactionCreate.js";
import { BaseCommandHandler } from "../handlers/BaseCommandHandler.js";
import { ConfigActionHandler, ExtendedConfigHandlers } from "../utils/commandUtils.js";
import { ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

/**
 * Config command handler extending BaseCommandHandler
 */
class ConfigCommandHandler extends BaseCommandHandler {
  protected commandName = "config";

  /**
   * Handle mention subcommand using base class toggle functionality
   */
  async handleMentionSubcommand(
    interaction: ChatInputCommandInteraction,
    guildId: string
  ): Promise<void> {
    await this.handleToggleAction(interaction, guildId, {
      guildId,
      configKey: "mention_enabled",
      value: getStringOption(interaction, "action", true) === "enable",
      featureName: "Mention responses",
    });
  }
}

// Create instance for use in command handlers
const configHandler = new ConfigCommandHandler();

/**
 * Handle /config command with subcommands
 */
export async function handleConfigCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    // Check permissions
    if (!hasAdminPermission(interaction)) {
      await sendPermissionDenied(interaction);
      return;
    }

    // Ensure we're in a guild
    if (!interaction.guild) {
      const ephemeral = configManager.getEphemeralSetting("config");
      await interaction.reply({
        content: "❌ This command can only be used in a server.",
        ephemeral,
      });
      return;
    }

    const subcommand = getSubcommand(interaction);
    const guildId = interaction.guild.id;

    logger.info("Processing /config command", {
      userId: interaction.user.id,
      guildId,
      subcommand,
    });

    // Route to appropriate subcommand handler
    switch (subcommand) {
      case "mention":
        await configHandler.handleMentionSubcommand(interaction, guildId);
        break;

      case "channel":
        await handleChannelSubcommand(interaction, guildId);
        break;

      case "prompt":
        await handlePromptSubcommand(interaction, guildId);
        break;

      case "strategy":
        await handleStrategySubcommand(interaction, guildId);
        break;

      case "view":
        await handleViewSubcommand(interaction, guildId);
        break;

      default:
        await interaction.reply({
          content:
            "❌ Unknown subcommand. Use `/config view` to see current settings.",
          ephemeral: true,
        });
    }
  } catch (error) {
    logger.error("Error in /config command:", error);

    try {
      const errorMessage =
        error instanceof ValidationError
          ? `❌ ${error.message}`
          : "❌ Failed to update configuration. Please try again later.";

      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        const ephemeral = configManager.getEphemeralSetting("config");
        await interaction.reply({ content: errorMessage, ephemeral });
      }
    } catch (replyError) {
      logger.error("Failed to send error response:", replyError);
    }
  }
}

/**
 * Handle channel add/remove subcommand
 */
async function handleChannelSubcommand(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  // Use utility function for channel list management
  await ExtendedConfigHandlers.handleChannelList({
    interaction,
    guildId,
    configKey: "response_channels",
    featureName: "Auto-response channels",
    allowedChannelTypes: [ChannelType.GuildText],
  });
}

/**
 * Handle server prompt subcommand
 */
async function handlePromptSubcommand(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  // Use utility function for text configuration
  await ExtendedConfigHandlers.handleTextConfig({
    interaction,
    guildId,
    configKey: "server_prompt",
    textParam: "content",
    featureName: "Server-specific prompt",
    minLength: 10,
    maxLength: 1000,
  });
}

/**
 * Handle message strategy subcommand
 */
async function handleStrategySubcommand(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  // Use utility function for option selection with descriptions
  await ConfigActionHandler.handleOptionSelect({
    interaction,
    guildId,
    configKey: "message_limit_strategy",
    optionParam: "type",
    allowedValues: ["compress", "split"],
    featureName: "Message handling strategy",
    valueDescriptions: {
      compress: "Long responses will be summarized to fit in one message",
      split: "Long responses will be split across multiple messages",
    },
  });
}

/**
 * Handle view configuration subcommand
 */
async function handleViewSubcommand(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  const ephemeral = configManager.getEphemeralSetting("config");
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  try {
    const config = await configService.getGuildConfig(guildId);
    const embed = await createConfigEmbed(
      config,
      guildId,
      interaction.guild?.name || "Unknown Server"
    );

    await interaction.editReply({ embeds: [embed] });

    logger.info("Configuration viewed", { guildId });
  } catch (error) {
    logger.error("Failed to retrieve configuration:", error);
    await interaction.editReply({
      content:
        "❌ Failed to retrieve server configuration. Please try again later.",
    });
  }
}

/**
 * Create configuration display embed
 */
async function createConfigEmbed(
  config: any,
  guildId: string,
  serverName: string
): Promise<EmbedBuilder> {
  const embed = new EmbedBuilder()
    .setTitle(`⚙️ Server Configuration: ${serverName}`)
    .setColor(0x0099ff)
    .setTimestamp()
    .setFooter({ text: `Guild ID: ${guildId}` });

  // Mention settings
  const mentionStatus = config.mention_enabled ? "✅ Enabled" : "❌ Disabled";
  embed.addFields({
    name: "🔔 Mention Responses",
    value: mentionStatus,
    inline: true,
  });

  // Auto-response channels
  const channels = config.response_channels || [];
  const channelList =
    channels.length > 0
      ? channels.map((id: string) => `<#${id}>`).join("\n")
      : "None configured";

  embed.addFields({
    name: "📝 Auto-Response Channels",
    value: channelList,
    inline: true,
  });

  // Search settings
  const searchEnabled = await configService.isSearchEnabled(guildId);
  const searchStatus = searchEnabled ? "✅ Enabled" : "❌ Disabled";

  embed.addFields({
    name: "🔍 Web Search",
    value: searchStatus,
    inline: true,
  });

  // Message strategy
  const strategy = config.message_limit_strategy || "split";
  const strategyDisplay = strategy === "compress" ? "📝 Compress" : "📄 Split";

  embed.addFields({
    name: "💬 Message Strategy",
    value: strategyDisplay,
    inline: true,
  });

  // Preferred model
  const preferredModel = await configService.getPreferredModel(guildId);
  const modelDisplay = preferredModel || "Default (Auto-select)";

  embed.addFields({
    name: "🤖 Preferred Model",
    value: modelDisplay,
    inline: true,
  });

  // Server prompt
  const hasCustomPrompt =
    config.server_prompt && config.server_prompt.length > 0;
  const promptStatus = hasCustomPrompt
    ? `✅ Custom (${config.server_prompt.length} chars)`
    : "📝 Default";

  embed.addFields({
    name: "🎯 Server Prompt",
    value: promptStatus,
    inline: true,
  });

  // Usage statistics
  try {
    const availableModels = configManager.getConfig().api.gemini.models.models;
    const stats = await configService.getStats(availableModels);
    const searchUsage = await configService.getSearchUsage();

    const totalRequests = stats.total_requests || 0;
    const totalSearchUsage = stats.search_usage || 0;
    const monthlySearchUsage = searchUsage || 0;

    // Model usage details
    const modelUsageText =
      Object.keys(stats.model_usage || {}).length > 0
        ? Object.entries(stats.model_usage)
            .map(([model, count]) => `**${model}:** ${count}`)
            .join("\n")
        : "No model usage recorded";

    embed.addFields(
      {
        name: "📊 Usage Statistics",
        value: [
          `**Total Requests:** ${totalRequests}`,
          `**Search Queries (Total):** ${totalSearchUsage}`,
          `**Search Queries (This Month):** ${monthlySearchUsage}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🤖 Model Usage",
        value: modelUsageText,
        inline: true,
      }
    );
  } catch (error) {
    logger.error("Failed to retrieve usage statistics:", error);
    embed.addFields({
      name: "📊 Usage Statistics",
      value: "❌ Unable to load statistics",
      inline: true,
    });
  }

  return embed;
}
